import { loadTorrent } from './loader.js'
import { parseTorrent } from './parser.js'

import { consola } from 'consola'


const raw = await loadTorrent('./test.torrent')

const t = parseTorrent(raw)

consola.log(t)
