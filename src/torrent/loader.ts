import { readFile } from 'node:fs/promises'
import b from 'bencode'

export async function loadTorrent(path: string) {
  const buffer = await readFile(path)

  return b.decode(buffer)
}
