import type { ValidatedTorrentInfo } from './validatedTorrentInfo.type.js'

export interface Torrent {
  announce: string
  name: string
  length: number
  pieceLength: number
  pieces: Buffer[]

  rawInfo: ValidatedTorrentInfo

  infoHash: Buffer
}
