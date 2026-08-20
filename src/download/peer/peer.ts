import { EventEmitter } from 'node:events'
import { connect } from 'node:net'

import { buildHandshake, parseMessages, buildInterested, buildRequest } from './protocol.js'
import { MSG } from './consts/msg.const.js'

export function createPeer(ip: string, port: number, infoHash: Buffer, peerId: Buffer) {
  const socket = connect(port, ip)
  const event = new EventEmitter()

  let buffer: Buffer = Buffer.alloc(0)
  let handshaked = false

  socket.setTimeout(15000)
  socket.on('timeout', () => socket.destroy(new Error('Socket timeout')))

  socket.on('connect', () => {
    event.emit('connect')
    const hs = buildHandshake(infoHash, peerId)
    socket.write(hs)
  })

  socket.on('data', (data: Buffer) => {
    buffer = Buffer.concat([buffer, data])

    if (!handshaked) {
      if (buffer.length < 68) return
      handshaked = true
      buffer = buffer.subarray(68)
      socket.write(buildInterested())
    }

    const { messages, rest } = parseMessages(buffer)
    buffer = rest

    for (const message of messages) {
      if (message.id === MSG.CHOKE) event.emit('choke')
      if (message.id === MSG.UNCHOKE) event.emit('unchoke')
      if (message.id === MSG.BITFIELD) event.emit('bitfield', message.payload)
      if (message.id === MSG.PIECE) event.emit('piece', message.payload)
    }
  })
  socket.on('error', (e) => event.emit('error', e))
  socket.on('close', () => event.emit('close'))

  return {
    on: event.on.bind(event),
    sendRequest: (index: number, begin: number, length: number) => socket.write(buildRequest(index, begin, length)),
    destroy: () => socket.destroy(),
  }
}
