import { createHash } from 'node:crypto'
import { getPieceSize } from './getPieceSize.js'

export class PieceAssembler {
  private pieces = new Map<number, { buffer: Buffer; receivedBytes: number }>()

  constructor(
    private pieceLength: number,
    private totalLength: number,
    private pieceHashes: Buffer[]
  ) {}

  addBlock(index: number, begin: number, data: Buffer): { done: boolean; piece?: Buffer; valid?: boolean } {
    const pieceSize = getPieceSize(index, this.pieceLength, this.totalLength, this.pieceHashes.length)

    if (!this.pieces.has(index)) {
      this.pieces.set(index, {
        buffer: Buffer.alloc(pieceSize),
        receivedBytes: 0,
      })
    }

    const current = this.pieces.get(index)!
    data.copy(current.buffer, begin)
    current.receivedBytes += data.length

    if (current.receivedBytes < pieceSize) {
      return { done: false }
    }

    const piece = current.buffer
    const hash = createHash('sha1').update(piece).digest()
    const valid = hash.equals(this.pieceHashes[index])

    this.pieces.delete(index)

    return { done: true, piece, valid }
  }

  clearPiece(index: number) {
    this.pieces.delete(index)
  }
}
