import type { SingleFile } from '../../../torrent/types/files.types.js'

export interface DownloaderOptions {
  announceList: string[]
  infoHash: Buffer
  peerId: Buffer
  pieceHashes: Buffer[]
  pieceLength: number
  length: number
  outputPath: string
  files: SingleFile[]
  maxPeers: number
  port: number
}
