import type { TorrentFile } from './files.types.js'

export interface TorrentInfo {
  name?: Uint8Array
  length?: number
  'piece length'?: number
  pieces?: Uint8Array
  files?: TorrentFile[]
}
