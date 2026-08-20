import type { ValidatedTorrentInfo } from './validatedTorrentInfo.type.js'
import type { SingleFile } from './files.types.js'

export interface ParsedTorrent {
  announce: string
  name: string
  length: number
  pieceLength: number
  pieceHashes: Buffer[]
  files: SingleFile[]

  rawInfo: ValidatedTorrentInfo
}
