import { createTorrent } from './torrent/index.js'
import { getPeers } from './tracker/index.js'

import { consola } from 'consola'

const t = await createTorrent('./test.torrent')

const peers = await getPeers({
  announce: t.announce,
  infoHash: t.infoHash,
  length: t.length,
})

consola.log(peers)
