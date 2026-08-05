export function buildHandshake(infoHash: Buffer, peerId: Buffer): Buffer {
  return Buffer.concat([Buffer.from([19]), Buffer.from('BitTorrent protocol'), Buffer.alloc(8), infoHash, peerId])
}
