import { createHash } from 'node:crypto'
import { consola } from 'consola'
import { createPeer } from '../peer/index.js'
import { BLOCK_SIZE } from './blockSize.const.js'

import type { FileHandle } from 'node:fs/promises'
import type { DownloaderOptions } from './types/downloaderOptions.type.js'
import type { Peer } from '../../tracker/index.js'

interface PeerCallbacks {
  onPieceDone: () => void
  onDisconnect: () => void
}

export function connectPeer(peer: Peer, options: DownloaderOptions, file: FileHandle, queue: number[], callbacks: PeerCallbacks) {
  const p = createPeer(peer.ip, peer.port, options.infoHash, options.peerId)

  const pieceBuffers = new Map<number, Buffer[]>()

  let currentPieceIndex: number | undefined
  let currentOffset = 0

  const getPieceSize = (index: number) => {
    return index === options.pieceHashes.length - 1
      ? options.length - options.pieceLength * (options.pieceHashes.length - 1)
      : options.pieceLength
  }

  const requestNextBlock = () => {
    if (currentPieceIndex === undefined) {
      currentPieceIndex = queue.shift()
      currentOffset = 0
    }

    if (currentPieceIndex === undefined) return

    const pieceSize = getPieceSize(currentPieceIndex)
    const blockLength = Math.min(BLOCK_SIZE, pieceSize - currentOffset)

    p.sendRequest(currentPieceIndex, currentOffset, blockLength)
  }

  p.on('connect', () => consola.info(`Connected to ${peer.ip}:${peer.port}`))
  p.on('close', () => consola.warn(`Disconnected from ${peer.ip}:${peer.port}`))

  p.on('unchoke', () => {
    consola.info(`Peer ${peer.ip} unchoked`)
    requestNextBlock()
  })

  p.on('piece', (payload: Buffer) => {
    const index = payload.readUInt32BE(0)
    const begin = payload.readUInt32BE(4)
    const data = payload.subarray(8)

    if (!pieceBuffers.has(index)) pieceBuffers.set(index, [])
    pieceBuffers.get(index)!.push(data)

    const pieceSize = getPieceSize(index)
    const collected = pieceBuffers.get(index)!.reduce((acc, b) => acc + b.length, 0)

    if (collected >= pieceSize) {
      const piece = Buffer.concat(pieceBuffers.get(index)!)
      const hash = createHash('sha1').update(piece).digest()

      if (!hash.equals(options.pieceHashes[index])) {
        consola.error(`Hash mismatch for piece ${index}`)
        pieceBuffers.delete(index)
        queue.push(index)
      } else {
        file.write(piece, 0, piece.length, index * options.pieceLength)
        consola.success(`Piece ${index} saved`)
        callbacks.onPieceDone()
      }

      currentPieceIndex = undefined
      requestNextBlock()
    } else {
      currentOffset += data.length
      requestNextBlock()
    }
  })

  p.on('error', (e) => {
    consola.warn(`Disconnected from ${peer.ip}:${peer.port}`)

    if (currentPieceIndex !== undefined) {
      queue.push(currentPieceIndex)
      currentPieceIndex = undefined
    }
    callbacks.onDisconnect()
  })
}
