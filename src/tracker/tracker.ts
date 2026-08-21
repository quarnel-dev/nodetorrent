import https from 'node:https'
import http from 'node:http'

import b from 'bencode'

import { percentEncode } from './percentEncode.js'
import { parsePeers } from './parsePeers.js'
import { getPeersUdp } from './udpTracker.js'

import type { Peer } from './types/peer.type.js'
import type { TrackerRequest } from './types/trackerRequest.type.js'

const FALLBACK_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
]

export async function getPeers(req: TrackerRequest): Promise<Peer[]> {
  const primaryTrackers = Array.isArray(req.announce) ? req.announce : [req.announce]
  const trackersToTry = [...new Set([...primaryTrackers, ...FALLBACK_TRACKERS])].filter(Boolean)

  for (const announceUrl of trackersToTry) {
    if (!announceUrl) continue

    try {
      const currentReq = { ...req, announce: announceUrl }

      if (announceUrl.startsWith('udp:')) {
        const peers = await getPeersUdp(currentReq)
        if (peers.length > 0) return peers
      } else if (announceUrl.startsWith('http:') || announceUrl.startsWith('https:')) {
        const peers = await getPeersHttp(currentReq)
        if (peers.length > 0) return peers
      }
    } catch {
      continue
    }
  }

  throw new Error('Failed to get peers from all available trackers')
}

async function getPeersHttp(req: TrackerRequest): Promise<Peer[]> {
  const peerId = req.peerId
  const port = req.port 

  const params = [
    `info_hash=${percentEncode(req.infoHash)}`,
    `peer_id=${percentEncode(peerId)}`,
    `port=${port}`,
    `uploaded=0`,
    `downloaded=0`,
    `left=${req.length}`,
    `compact=1`,
  ].join('&')

  const url = `${req.announce}?${params}`
  const lib = req.announce.startsWith('https') ? https : http

  const data = await new Promise<Buffer>((resolve, reject) => {
    const httpRequest = lib.get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        return reject(new Error(`HTTP status code ${res.statusCode}`))
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })

    httpRequest.on('error', reject)
  })

  const dData = b.decode(data)

  if (dData['failure reason']) {
    throw new Error(`Tracker error: ${dData['failure reason'].toString()}`)
  }

  const peersBuf = Buffer.isBuffer(dData.peers) ? dData.peers : Buffer.from(dData.peers)
  return parsePeers(peersBuf)
}