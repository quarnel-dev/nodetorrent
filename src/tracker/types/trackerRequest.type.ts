export interface TrackerRequest {
  announceList?: string[]
  announce?: string
  infoHash: Buffer
  length: number
  peerId: Buffer
  port: number
}
