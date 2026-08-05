import { readFile } from 'node:fs/promises'
import b from 'bencode'

import type { RawTorrent } from './types/rawTorrent.type.js'

export async function loadTorrent(path: string) {
  const buffer = await readFile(path)
  const decoded = b.decode(buffer) as RawTorrent

  const marker = Buffer.from('4:info')
  const infoStart = buffer.indexOf(marker) + marker.length
  const infoSlice = buffer.subarray(infoStart)
  const infoLength = b.encode(b.decode(infoSlice)).length
  decoded.__rawInfo = buffer.subarray(infoStart, infoStart + infoLength)

  return decoded
}
