export interface TrackerRequest {
  announce: string
  infoHash: Buffer
  length: number
  peerId: Buffer
}
