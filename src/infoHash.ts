import { createHash } from 'node:crypto'
import b from 'bencode'

export function createInfoHash(info: unknown) {
  const encoded = b.encode(info)

  return createHash('sha1').update(encoded).digest()
}
