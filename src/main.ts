import { loadTorrent } from './loader.js'

import { consola } from 'consola'

const t = await loadTorrent('./test.torrent')

consola.log(t)
