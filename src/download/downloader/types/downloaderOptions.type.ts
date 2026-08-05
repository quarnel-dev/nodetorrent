import type { Peer } from '../../../tracker/index.js'

export interface DownloaderOptions {
  peers: Peer[]
  infoHash: Buffer
  peerId: Buffer
  pieceHashes: Buffer[]
  pieceLength: number
  length: number
  outputPath: string
}
