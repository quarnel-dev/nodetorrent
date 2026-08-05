export function getPieceSize(index: number, pieceLength: number, totalLength: number, totalPieces: number): number {
  return index === totalPieces - 1 ? totalLength - pieceLength * (totalPieces - 1) : pieceLength
}
