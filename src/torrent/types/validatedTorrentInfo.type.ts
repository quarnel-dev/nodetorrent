export interface ValidatedTorrentInfo {
  name: Uint8Array
  length?: number
  'piece length': number
  pieces: Uint8Array
}