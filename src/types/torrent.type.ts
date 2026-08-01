export interface Torrent {
  announce: string
  name: string
  length: number
  pieceLength: number
  pieces: Buffer[]
}
