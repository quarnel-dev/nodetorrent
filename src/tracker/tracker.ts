import { randomBytes } from 'node:crypto'
import https from 'node:https'
import http from 'node:http'

import b from 'bencode'

import { percentEncode } from './percentEncode.js'

import type { Peer } from './types/peer.type.js'
import type { TrackerRequest } from './types/trackerRequest.type.js'
import { parsePeers } from './parsePeers.js'

export async function getPeers(req: TrackerRequest): Promise<Peer[]> {
  const peerId = req.peerId

  const params = [
    `info_hash=${percentEncode(req.infoHash)}`,
    `peer_id=${percentEncode(peerId)}`,
    `port=6881`,
    `uploaded=0`,
    `downloaded=0`,
    `left=${req.length}`,
    `compact=1`,
  ].join('&')

  const url = `${req.announce}?${params}`

  const lib = req.announce.startsWith('https') ? https : http

  const data = await new Promise<Buffer>((resolve, reject) => {
    const req = lib.get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        return reject(new Error(`HTTP status code ${res.statusCode}`))
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })

    req.on('error', reject)
  })

  const dData = b.decode(data)

  if (dData['failure reason']) {
    throw new Error(`Tracker error: ${dData['failure reason'].toString()}`)
  }

  const peersBuf = Buffer.isBuffer(dData.peers) ? dData.peers : Buffer.from(dData.peers)
  const peers = parsePeers(peersBuf)

  return peers
}
