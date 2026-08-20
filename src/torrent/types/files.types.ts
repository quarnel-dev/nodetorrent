export interface SingleFile {
  length: number
  path: string
}

export interface TorrentFile {
  length: number
  path: Buffer[]
}
