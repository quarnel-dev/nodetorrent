import { createHash } from 'node:crypto'

import { createPeer } from '../peer/index.js'

import { BLOCK_SIZE } from './blockSize.const.js'

import type { FileHandle } from 'node:fs/promises'
import type { DownloaderOptions } from './types/downloaderOptions.type.js'
import type { Peer } from '../../tracker/index.js'

export function connectPeer(peer: Peer, options: DownloaderOptions, file: FileHandle, queue: number[]) {
  const p = createPeer(peer.ip, peer.port, options.infoHash, options.peerId)

  const pieceBuffers = new Map<number, Buffer[]>()

  p.on('unchoke', () => {
    const index = queue.shift()
    if (index === undefined) return

    p.sendRequest(index, 0, BLOCK_SIZE)
  })

  p.on('piece', (payload: Buffer) => {
    const index = payload.readUInt32BE(0)
    const begin = payload.readUInt32BE(4)
    const data = payload.subarray(8)

    if (!pieceBuffers.has(index)) pieceBuffers.set(index, [])
    pieceBuffers.get(index)!.push(data)

    const pieceSize =
      index === options.pieceHashes.length - 1
        ? options.length - options.pieceLength * (options.pieceHashes.length - 1)
        : options.pieceLength

    const collected = pieceBuffers.get(index)!.reduce((acc, b) => acc + b.length, 0)

    if (collected >= pieceSize) {
      const piece = Buffer.concat(pieceBuffers.get(index)!)
      const hash = createHash('sha1').update(piece).digest()

      if (!hash.equals(options.pieceHashes[index])) {
        queue.push(index)
        return
      }

      file.write(piece, 0, piece.length, index * options.pieceLength)

      const next = queue.shift()
      if (next !== undefined) p.sendRequest(next, 0, BLOCK_SIZE)
    }
  })

  p.on('error', () => {})

  p.sendInterested()
}
