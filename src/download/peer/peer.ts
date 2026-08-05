import { EventEmitter } from 'node:events'
import { connect } from 'node:net'

import { buildHandshake } from './protocol.js'

export function createPeer(ip: string, port: number, infoHash: Buffer, peerId: Buffer) {
  const socket = connect(port, ip)
  const event = new EventEmitter()

  socket.on('connect', () => {
    socket.write(buildHandshake(infoHash, peerId))
  })

  socket.on('data', (data) => {
    event.emit('unchoke')
  })

  socket.on('error', (e) => event.emit('error', e))

  socket.on('close', () => event.emit('close'))

  return event
}
