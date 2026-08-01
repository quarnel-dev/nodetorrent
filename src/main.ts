import { createInfoHash } from './infoHash.js'
import { loadTorrent } from './loader.js'
import { parseTorrent } from './parser.js'

import { consola } from 'consola'

const raw = await loadTorrent('./test.torrent')

const t = parseTorrent(raw)

const hash = createInfoHash(t.rawInfo)

consola.log(hash.length)
consola.log(hash.toString('hex'))
