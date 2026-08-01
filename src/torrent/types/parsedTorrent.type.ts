import type { ValidatedTorrentInfo } from './validatedTorrentInfo.type.js'

export interface ParsedTorrent {
  announce: string
  name: string
  length: number
  pieceLength: number
  pieces: Buffer[]

  rawInfo: ValidatedTorrentInfo
}
