import { createHash } from 'node:crypto'
import { getPieceSize } from './getPieceSize.js'

export class PieceAssembler {
  private buffers = new Map<number, Buffer[]>()

  constructor(
    private pieceLength: number,
    private totalLength: number,
    private pieceHashes: Buffer[]
  ) {}

  addBlock(index: number, data: Buffer): { done: boolean; piece?: Buffer; valid?: boolean } {
    if (!this.buffers.has(index)) this.buffers.set(index, [])
    this.buffers.get(index)!.push(data)

    const pieceSize = getPieceSize(index, this.pieceLength, this.totalLength, this.pieceHashes.length)
    const collected = this.buffers.get(index)!.reduce((acc, b) => acc + b.length, 0)

    if (collected < pieceSize) return { done: false }

    const piece = Buffer.concat(this.buffers.get(index)!)
    const hash = createHash('sha1').update(piece).digest()
    const valid = hash.equals(this.pieceHashes[index])

    this.buffers.delete(index)
    return { done: true, piece, valid }
  }
}
