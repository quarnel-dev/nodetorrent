import { Peer } from './types/peer.type.js'

export function parsePeers(buf: Buffer): Peer[] {
  const peers: Peer[] = []
  for (let i = 0; i + 6 <= buf.length; i += 6) {
    const ip = `${buf[i]}.${buf[i + 1]}.${buf[i + 2]}.${buf[i + 3]}`
    const port = buf.readUint16BE(i + 4)
    peers.push({ ip, port })
  }
  return peers
}
