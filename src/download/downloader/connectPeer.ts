import { EventEmitter } from 'node:events'

import { emit } from '../../events/index.js'
import { createPeer } from '../peer/index.js'
import { PieceAssembler } from './utils/pieceAssembler.js'
import { getPieceSize } from './utils/getPieceSize.js'
import { BLOCK_SIZE } from './consts/blockSize.const.js'

import type { DownloaderOptions } from './types/downloaderOptions.type.js'
import type { Peer } from '../../tracker/index.js'
import type { FileManager } from './utils/fileManager.js'

const MAX_PIPELINE = 10
const BLOCK_TIMEOUT_MS = 10000

export function connectPeer(
  peer: Peer,
  options: DownloaderOptions,
  fileManager: FileManager,
  queue: number[],
  inProgress: Set<number>
): EventEmitter {
  const p = createPeer(peer.ip, peer.port, options.infoHash, options.peerId)
  const event = new EventEmitter()
  const assembler = new PieceAssembler(options.pieceLength, options.length, options.pieceHashes)

  let isCleanedUp = false

  let isChoked = true
  let peerBitfield: Buffer | null = null

  let currentPieceIndex: number | undefined
  let currentOffset = 0
  let pendingRequests = 0

  let blockTimeoutNode: NodeJS.Timeout | null = null

  const resetBlockTimeout = () => {
    if (blockTimeoutNode) clearTimeout(blockTimeoutNode)
    if (!isChoked && currentPieceIndex !== undefined) {
      blockTimeoutNode = setTimeout(() => {
        cleanup('Peer stalled (no data received)')
      }, BLOCK_TIMEOUT_MS)
    }
  }

  const unchokeTimeout = setTimeout(() => {
    if (isChoked) {
      cleanup('Peer stayed choked for too long')
    }
  }, 12000)

  const hasPiece = (index: number): boolean => {
    if (!peerBitfield) return true
    const byte = Math.floor(index / 8)
    if (byte >= peerBitfield.length) return false
    const bit = 7 - (index % 8)
    return ((peerBitfield[byte] >> bit) & 1) === 1
  }

  const fillPipeline = () => {
    if (isChoked || isCleanedUp) return

    if (currentPieceIndex === undefined) {

      const foundIdx = queue.findIndex((i) => !inProgress.has(i) && hasPiece(i))

      if (foundIdx !== -1) {
        currentPieceIndex = queue[foundIdx]
        queue.splice(foundIdx, 1) // Удаляем из очереди
        inProgress.add(currentPieceIndex) // Занимаем кусочек
        currentOffset = 0
      }
    }

    if (currentPieceIndex === undefined) return

    const pieceSize = getPieceSize(currentPieceIndex, options.pieceLength, options.length, options.pieceHashes.length)

    while (pendingRequests < MAX_PIPELINE && currentOffset < pieceSize) {
      const blockLength = Math.min(BLOCK_SIZE, pieceSize - currentOffset)
      p.sendRequest(currentPieceIndex, currentOffset, blockLength)
      pendingRequests++
      currentOffset += blockLength
    }

    resetBlockTimeout()
  }

  p.on('connect', () => emit({ type: 'peer:connected', ip: peer.ip, port: peer.port }))

  p.on('unchoke', () => {
    isChoked = false
    clearTimeout(unchokeTimeout)
    emit({ type: 'peer:unchoked', ip: peer.ip })
    fillPipeline()
  })

  p.on('choke', () => {
    isChoked = true
    if (blockTimeoutNode) clearTimeout(blockTimeoutNode)

    if (currentPieceIndex !== undefined) {
      inProgress.delete(currentPieceIndex)
      queue.push(currentPieceIndex)
      currentPieceIndex = undefined
      currentOffset = 0
      pendingRequests = 0
    }
  })

  p.on('bitfield', (payload: Buffer) => {
    peerBitfield = payload
  })

  p.on('have', (payload: Buffer) => {
    const pieceIndex = payload.readUInt32BE(0)
    if (!peerBitfield) {
      const bitfieldSize = Math.ceil(options.pieceHashes.length / 8)
      peerBitfield = Buffer.alloc(bitfieldSize)
    }
    const byte = Math.floor(pieceIndex / 8)
    const bit = 7 - (pieceIndex % 8)
    if (byte < peerBitfield.length) {
      peerBitfield[byte] |= 1 << bit
    }

    if (currentPieceIndex === undefined) {
      fillPipeline()
    }
  })

  p.on('piece', async (payload: Buffer) => {
    pendingRequests = Math.max(0, pendingRequests - 1)

    const index = payload.readUInt32BE(0)
    const begin = payload.readUInt32BE(4)
    const data = payload.subarray(8)

    const result = assembler.addBlock(index, begin, data)

    resetBlockTimeout()

    if (!result.done) {
      fillPipeline()
      return
    }

    inProgress.delete(index)

    if (!result.valid) {
      emit({ type: 'piece:hash_mismatch', index })
      queue.push(index) // На перекачку
    } else {
      await fileManager.writePiece(index, result.piece!)
      event.emit('piece:done', index)
    }

    currentPieceIndex = undefined
    currentOffset = 0
    fillPipeline()
  })

  const cleanup = (reason?: string) => {
    if (isCleanedUp) return
    isCleanedUp = true

    clearTimeout(unchokeTimeout)
    if (blockTimeoutNode) clearTimeout(blockTimeoutNode)
    p.destroy()

    emit({ type: 'peer:disconnected', ip: peer.ip, port: peer.port })

    if (currentPieceIndex !== undefined) {
      inProgress.delete(currentPieceIndex)
      queue.push(currentPieceIndex)
      currentPieceIndex = undefined
    }
    event.emit('disconnect', reason)
  }

  event.on('force_disconnect', () => cleanup('Force disconnect'))
  p.on('close', () => cleanup('Socket close'))
  p.on('error', () => cleanup('Socket error'))

  return event
}
