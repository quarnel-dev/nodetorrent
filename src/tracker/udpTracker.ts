import dgram from 'node:dgram'

import { parsePeers } from './parsePeers.js'

import type { Peer } from './types/peer.type.js'
import type { TrackerRequest } from './types/trackerRequest.type.js'

const ACTION_CONNECT = 0
const ACTION_ANNOUNCE = 1
const PROTOCOL_ID = 0x41727101980n

export function getPeersUdp(req: TrackerRequest): Promise<Peer[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(req.announce)
    const port = Number.parseInt(url.port, 10) || 80
    const host = url.hostname

    const socket = dgram.createSocket('udp4')
    let timeoutId: NodeJS.Timeout

    const cleanup = () => {
      clearTimeout(timeoutId)
      socket.close()
    }

    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('UPD tracker timeoit'))
    }, 5000)

    socket.on('error', (err) => {
      cleanup()
      reject(err)
    })

    const transactionId = Math.floor(Math.random() * 0xffffffff)
    const connectReq = Buffer.alloc(16)

    // Protocol ID (8 byte)
    connectReq.writeBigInt64BE(PROTOCOL_ID, 0)
    // Action: Connect = 0 (4 byte)
    connectReq.writeUInt32BE(ACTION_CONNECT, 8)
    // Transaction ID (4 byte)
    connectReq.writeUInt32BE(transactionId, 12)

    let connectionId: bigint | null = null

    socket.on('message', (msg) => {
      if (msg.length < 8) return

      const action = msg.readUInt32BE(0)
      const resTransactionId = msg.readUInt32BE(4)

      if (resTransactionId !== transactionId) return

      if (action === ACTION_CONNECT) {
        connectionId = msg.readBigInt64BE(8)

        const announceReq = Buffer.alloc(98)

        // Connection ID (8 byte)
        announceReq.writeBigInt64BE(connectionId, 0)
        // Action: Announce = 1 (4 byte)
        announceReq.writeUInt32BE(ACTION_ANNOUNCE, 8)
        // Transaction ID (4 byte)
        announceReq.writeUInt32BE(transactionId, 12)
        // Info Hash (20 byte)
        req.infoHash.copy(announceReq, 16)
        // Peer ID (20 byte)
        req.peerId.copy(announceReq, 36)
        // Downloaded (8 byte)
        announceReq.writeBigInt64BE(0n, 56)
        // Left (8 byte)
        announceReq.writeBigInt64BE(BigInt(req.length), 64)
        // Uploaded (8 byte)
        announceReq.writeBigInt64BE(0n, 72)
        // Event: None = 0 (4 byte)
        announceReq.writeUInt32BE(0, 80)
        // IP Address: default = 0 (4 byte)
        announceReq.writeUInt32BE(0, 84)
        // Key (4 byte)
        announceReq.writeUInt32BE(0, 88)
        // Num want: -1 (default) (4 byte)
        announceReq.writeInt32BE(-1, 92)
        // Port (2 byte)
        announceReq.writeUInt16BE(req.port || 6881, 96)

        socket.send(announceReq, port, host)
      } else if (action === ACTION_ANNOUNCE) {
        cleanup()
        const peersBuf = msg.subarray(20)
        const peers = parsePeers(peersBuf)
        resolve(peers)
      }
    })

    socket.send(connectReq, port, host)
  })
}
