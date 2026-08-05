import { EventEmitter } from 'node:events'
import { connect } from 'node:net'

import { buildHandshake, parseMessages, buildInterested, buildRequest } from './protocol.js'

import { MSG } from './msg.const.js'

export function createPeer(ip: string, port: number, infoHash: Buffer, peerId: Buffer) {
  const socket = connect(port, ip)
  const event = new EventEmitter()

  let buffer: Buffer = Buffer.alloc(0)

  socket.on('connect', () => {
    socket.write(buildHandshake(infoHash, peerId))
  })

  socket.on('data', (data: Buffer) => {
    buffer = Buffer.concat([buffer, data])

    const { messages, rest } = parseMessages(buffer)
    buffer = rest

    for (const message of messages) {
      if (message.id === MSG.UNCHOKE) event.emit('unchoke')
      if (message.id === MSG.BITFIELD) event.emit('bitfield', message.payload)
      if (message.id === MSG.PIECE) event.emit('piece', message.payload)
    }
  })

  socket.on('error', (e) => event.emit('error', e))

  socket.on('close', () => event.emit('close'))

  return {
    on: event.on.bind(event),
    sendInterested: () => socket.write(buildInterested()),
    sendRequest: (index: number, begin: number, length: number) => socket.write(buildRequest(index, begin, length)),
  }
}
