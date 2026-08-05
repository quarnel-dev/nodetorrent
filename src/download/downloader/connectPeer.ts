import { EventEmitter } from 'node:events'

import { emit } from '../../events/index.js'
import { createPeer } from '../peer/index.js'
import { PieceAssembler } from './utils/pieceAssembler.js'
import { getPieceSize } from './utils/getPieceSize.js'
import { BLOCK_SIZE } from './consts/blockSize.const.js'

import type { FileHandle } from 'node:fs/promises'
import type { DownloaderOptions } from './types/downloaderOptions.type.js'
import type { Peer } from '../../tracker/index.js'

export function connectPeer(peer: Peer, options: DownloaderOptions, file: FileHandle, queue: number[]): EventEmitter {
  const p = createPeer(peer.ip, peer.port, options.infoHash, options.peerId)
  const event = new EventEmitter()
  const assembler = new PieceAssembler(options.pieceLength, options.length, options.pieceHashes)

  let currentPieceIndex: number | undefined
  let currentOffset = 0
  let peerBitfield: Buffer | null = null

  const hasPiece = (index: number): boolean => {
    if (!peerBitfield) return true
    const byte = Math.floor(index / 8)
    const bit = 7 - (index % 8)
    return ((peerBitfield[byte] >> bit) & 1) === 1
  }

  const requestNextBlock = () => {
    if (currentPieceIndex === undefined) {
      currentPieceIndex = queue.find((i) => hasPiece(i))
      if (currentPieceIndex !== undefined) queue.splice(queue.indexOf(currentPieceIndex), 1)
      currentOffset = 0
    }
    if (currentPieceIndex === undefined) return

    const pieceSize = getPieceSize(currentPieceIndex, options.pieceLength, options.length, options.pieceHashes.length)
    const blockLength = Math.min(BLOCK_SIZE, pieceSize - currentOffset)
    p.sendRequest(currentPieceIndex, currentOffset, blockLength)
  }

  p.on('connect', () => emit({ type: 'peer:connected', ip: peer.ip, port: peer.port }))

  p.on('unchoke', () => {
    emit({ type: 'peer:unchoked', ip: peer.ip })
    requestNextBlock()
  })

  p.on('bitfield', (payload: Buffer) => {
    peerBitfield = payload
  })

  p.on('piece', (payload: Buffer) => {
    const index = payload.readUInt32BE(0)
    const data = payload.subarray(8)
    const result = assembler.addBlock(index, data)

    if (!result.done) {
      currentOffset += data.length
      return requestNextBlock()
    }

    if (!result.valid) {
      emit({ type: 'piece:hash_mismatch', index })
      queue.push(index)
    } else {
      file.write(result.piece!, 0, result.piece!.length, index * options.pieceLength)
      event.emit('piece:done')
    }

    currentPieceIndex = undefined
    requestNextBlock()
  })

  p.on('close', () => {
    emit({ type: 'peer:disconnected', ip: peer.ip, port: peer.port })
    if (currentPieceIndex !== undefined) {
      queue.push(currentPieceIndex)
      currentPieceIndex = undefined
    }
    event.emit('disconnect')
  })

  p.on('error', () => event.emit('disconnect'))

  return event
}
