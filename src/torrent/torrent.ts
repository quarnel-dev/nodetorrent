import { loadTorrent } from './loader.js'
import { parseTorrent } from './parser.js'
import { createInfoHash } from './infoHash.js'

import type { Torrent } from './types/torrent.type.js'

export async function createTorrent(path: string): Promise<Torrent> {
  const raw = await loadTorrent(path)

  const parsed = parseTorrent(raw)

  return {
    ...parsed,

    infoHash: createInfoHash(raw.__rawInfo!),
  }
}
