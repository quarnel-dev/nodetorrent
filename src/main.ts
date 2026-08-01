import { createTorrent } from './torrent/index.js'

import { consola } from 'consola'

const t = await createTorrent('./test.torrent')
consola.log(t)

