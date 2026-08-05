import { createTorrent } from './torrent/index.js'
import { download } from './download/index.js'

import { showMenu, setupUIListeners } from './ui/index.js'

import { generatePeerId } from './utils/peerId.js'

import { emit } from './events/index.js'

const { torrentPath, outputDir } = await showMenu()

const peerId = generatePeerId()
const t = await createTorrent(torrentPath)

setupUIListeners()

await download({
  announce: t.announce,
  infoHash: t.infoHash,
  peerId: peerId,
  pieceHashes: t.pieceHashes,
  pieceLength: t.pieceLength,
  length: t.length,
  outputPath: `${outputDir}/${t.name}`,
})

emit({ type: 'download:done', name: t.name })

