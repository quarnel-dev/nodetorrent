import { createTorrent } from './torrent/index.js'
import { getPeers } from './tracker/index.js'
import { download } from './download/index.js'

import { generatePeerId } from './utils/peerId.js'

import { consola } from 'consola'

const peerId = generatePeerId()
const t = await createTorrent('./test.torrent')

consola.info(`Torrent: ${t.name}`)

const peers = await getPeers({
  announce: t.announce,
  infoHash: t.infoHash,
  length: t.length,
  peerId,
})

consola.info(`Peers found: ${peers.length}`)

await download({
  peers,
  infoHash: t.infoHash,
  peerId: peerId,
  pieceHashes: t.pieceHashes,
  pieceLength: t.pieceLength,
  length: t.length,
  outputPath: `./${t.name}`,
})

consola.success(`Done: ${t.name}`)
