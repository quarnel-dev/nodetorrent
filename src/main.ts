import { createTorrent } from './torrent/index.js'
import { download } from './download/index.js'

import { generatePeerId } from './utils/peerId.js'

import { consola } from 'consola'

const peerId = generatePeerId()
const t = await createTorrent('./test.torrent')

consola.info(`Torrent: ${t.name}`)

await download({
  announce: t.announce,
  infoHash: t.infoHash,
  peerId: peerId,
  pieceHashes: t.pieceHashes,
  pieceLength: t.pieceLength,
  length: t.length,
  outputPath: `./${t.name}`,
})

consola.success(`Done: ${t.name}`)
