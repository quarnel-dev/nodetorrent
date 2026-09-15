import path from 'node:path'

import type { ParsedTorrent } from './types/parsedTorrent.type.js'
import type { RawTorrent } from './types/rawTorrent.type.js'
import type { ValidatedTorrentInfo } from './types/validatedTorrentInfo.type.js'
import type { SingleFile } from './types/files.types.js'

export function parseTorrent(raw: RawTorrent): ParsedTorrent {
  if (!raw.info) throw new Error('Invalid torrent missing info')

  const info = raw.info
  const announceList: string[] = []

  if (raw.announce) {
    announceList.push(Buffer.from(raw.announce).toString())
  }

  if (Array.isArray(raw['announce-list'])) {
    for (const tier of raw['announce-list']) {
      if (Array.isArray(tier)) {
        for (const tracker of tier) {
          announceList.push(Buffer.from(tracker).toString())
        }
      }
    }
  }

  const uniqueAnnounces = [...new Set(announceList)]

  if (!info.name || !info['piece length'] || !info.pieces) throw new Error('Invalid torrent metadata')

  const name = Buffer.from(info.name).toString()
  const files: SingleFile[] = []
  let totalLength = 0

  if (info.files && Array.isArray(info.files)) {
    for (const file of info.files) {
      const filePath = file.path.map((p) => Buffer.from(p).toString()).join(path.sep)
      files.push({
        length: file.length,
        path: path.join(name, filePath),
      })
      totalLength += file.length
    }
  } else if (info.length) {
    files.push({
      length: info.length,
      path: name,
    })
    totalLength = info.length
  } else {
    throw new Error('Torrent has neither length nor files')
  }

  const validInfo: ValidatedTorrentInfo = {
    name: info.name,
    length: totalLength,
    'piece length': info['piece length'],
    pieces: info.pieces,
  }

  return {
    announceList:  uniqueAnnounces,

    name,

    length: totalLength,

    pieceLength: info['piece length'],

    pieceHashes: splitPiece(Buffer.from(info.pieces)),

    files,

    rawInfo: validInfo,
  }
}

function splitPiece(pieces: Buffer): Buffer[] {
  const res: Buffer[] = []
  for (let offset = 0; offset < pieces.length; offset += 20) {
    res.push(pieces.subarray(offset, offset + 20))
  }
  return res
}
