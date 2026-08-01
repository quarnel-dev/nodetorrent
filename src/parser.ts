import type { Torrent } from './types/torrent.type.js'

type RawTorrent = {
  announce?: Uint8Array
  info?: {
    name?: Uint8Array
    length?: number
    'piece length'?: number
    pieces?: Uint8Array
  }
}

export function parseTorrent(raw: RawTorrent): Torrent {
  if (!raw.info) throw new Error('Invalid torrent missing info')

  const info = raw.info

  if (!info.name || !info['piece length'] || !info.pieces) throw new Error('Invalid torrent metadata')

  return {
    announce: raw.announce ? Buffer.from(raw.announce).toString() : '',

    name: Buffer.from(info.name).toString(),

    length: info.length ?? 0,

    pieceLength: info['piece length'],

    pieces: splitPiece(Buffer.from(info.pieces)),
  }
}

function splitPiece(pieces: Buffer): Buffer[] {
  const res: Buffer[] = []

  for (let offest = 0; offest < pieces.length; offest += 20) {
    res.push(pieces.subarray(offest, offest + 20))
  }

  return res
}
