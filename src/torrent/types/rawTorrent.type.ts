import type { TorrentInfo } from './torrentInfo.type.js'

export type RawTorrent = {
  announce?: Uint8Array

  'announce-list'?: Uint8Array[][]

  info?: TorrentInfo
}
