import { createHash } from 'node:crypto'

export function createInfoHash(rawInfo: Buffer): Buffer {
  return createHash('sha1').update(rawInfo).digest()
}
