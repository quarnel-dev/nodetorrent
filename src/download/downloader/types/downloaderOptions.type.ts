export interface DownloaderOptions {
  announce: string
  infoHash: Buffer
  peerId: Buffer
  pieceHashes: Buffer[]
  pieceLength: number
  length: number
  outputPath: string
}
