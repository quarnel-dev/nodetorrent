import type { ParsedTorrent } from './types/parsedTorrent.type.js'
import type { RawTorrent } from './types/rawTorrent.type.js'
import type { ValidatedTorrentInfo } from './types/validatedTorrentInfo.type.js'

export function parseTorrent(raw: RawTorrent): ParsedTorrent {
  if (!raw.info) throw new Error('Invalid torrent missing info')

  const info = raw.info

  if (!info.name || !info['piece length'] || !info.pieces) throw new Error('Invalid torrent metadata')

  const validInfo: ValidatedTorrentInfo = {
    name: info.name,
    length: info.length,
    'piece length': info['piece length'],
    pieces: info.pieces,
  }

  return {
    announce: raw.announce ? Buffer.from(raw.announce).toString() : '',

    name: Buffer.from(info.name).toString(),

    length: info.length ?? 0,

    pieceLength: info['piece length'],

    pieceHashes: splitPiece(Buffer.from(info.pieces)),

    rawInfo: validInfo,
  }
}

function splitPiece(pieces: Buffer): Buffer[] {
  const res: Buffer[] = []

  for (let offest = 0; offest < pieces.length; offest += 20) {
    res.push(pieces.subarray(offest, offest + 20))
  }

  return res
}
