import { randomBytes } from 'node:crypto'

export function generatePeerId(): Buffer {
  return Buffer.concat([Buffer.from('-NT0001-'), randomBytes(12)])
}
