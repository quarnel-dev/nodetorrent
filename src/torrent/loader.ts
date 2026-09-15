import { readFile } from 'node:fs/promises'
import b from 'bencode'

import type { RawTorrent } from './types/rawTorrent.type.js'

export async function loadTorrent(path: string) {
  const buffer = await readFile(path)
  const decoded = b.decode(buffer) as RawTorrent

  const marker = Buffer.from('4:info')
  const markerPos = buffer.indexOf(marker)

  if (markerPos === -1) {
    throw new Error('Invalid torrent file: info dictionary not found')
  }

  const infoStart = markerPos + marker.length
  const infoLength = getBencodeLength(buffer, infoStart)

  decoded.__rawInfo = buffer.subarray(infoStart, infoStart + infoLength)

  return decoded
}

function getBencodeLength(buf: Buffer, start: number): number {
  let pos = start

  function parse() {
    const char = String.fromCharCode(buf[pos])

    if (char === 'i') {
      pos++
      const end = buf.indexOf(0x65, pos) // 0x65 = 'e'
      pos = end + 1
    } else if (char === 'l' || char === 'd') {
      pos++
      while (buf[pos] !== 0x65) {
        parse()
      }
      pos++
    } else if (char >= '0' && char <= '9') {
      const colon = buf.indexOf(0x3a, pos) // 0x3a = ':'
      const len = Number.parseInt(buf.subarray(pos, colon).toString('ascii'), 10)
      pos = colon + 1 + len
    } else {
      throw new Error(`Unexpected character in bencode at offset ${pos}`)
    }
  }

  parse()
  return pos - start
}
