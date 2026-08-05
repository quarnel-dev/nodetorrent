import type { ParseResult } from './types/parseResult.type.js'

export function buildHandshake(infoHash: Buffer, peerId: Buffer): Buffer {
  return Buffer.concat([Buffer.from([19]), Buffer.from('BitTorrent protocol'), Buffer.alloc(8), infoHash, peerId])
}

export function parseMessages(buffer: Buffer): ParseResult {
  const messages = []

  while (true) {
    if (buffer.length < 4) break
    const len = buffer.readUInt32BE(0)
    if (buffer.length < 4 + len) break

    const id = buffer[4]
    const payload = buffer.subarray(5, 4 + len)
    messages.push({ id, payload })

    buffer = buffer.subarray(4 + len)
  }

  return { messages, rest: Buffer.from(buffer) }
}

export function buildInterested(): Buffer {
  return Buffer.from([0, 0, 0, 1, 2])
}

export function buildRequest(index: number, begin: number, length: number): Buffer {
  const payload = Buffer.alloc(12)
  payload.writeUInt32BE(index, 0)
  payload.writeUInt32BE(begin, 4)
  payload.writeUInt32BE(length, 8)

  return Buffer.concat([Buffer.from([0, 0, 0, 13, 6]), payload])
}
