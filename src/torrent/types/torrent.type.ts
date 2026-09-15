import type { ValidatedTorrentInfo } from './validatedTorrentInfo.type.js'
import type { SingleFile } from './files.types.js'

export interface Torrent {
  announceList: string[]
  name: string
  length: number
  pieceLength: number
  pieceHashes: Buffer[]
  files: SingleFile[]

  rawInfo: ValidatedTorrentInfo

  infoHash: Buffer
}
