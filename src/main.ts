import { consola } from 'consola'
import { createTorrent } from './torrent/index.js'
import { download } from './download/index.js'
import { showMenu, Dashboard } from './ui/index.js'
import { generatePeerId } from './utils/peerId.js'
import { emit } from './events/index.js'

const config = await showMenu()

const peerId = generatePeerId()
const t = await createTorrent(config.torrentPath)

console.clear()
consola.log(`File:   ${t.name}`)
consola.log(`Size:   ${(t.length / (1024 * 1024)).toFixed(2)} MB`)
consola.log(`Output: ${config.outputDir}\n`)

const dashboard = new Dashboard(t.pieceHashes.length, t.pieceLength)

try {
  await download({
    announceList: t.announceList,
    infoHash: t.infoHash,
    peerId: peerId,
    pieceHashes: t.pieceHashes,
    pieceLength: t.pieceLength,
    length: t.length,
    outputPath: `${config.outputDir}/${t.name}`,
    files: t.files,
    maxPeers: config.maxPeers,
    port: config.port,
  })

  dashboard.stop(t.name)
  emit({ type: 'download:done', name: t.name })
} catch (err: any) {
  process.stdout.write('\n')
  consola.error(`❌ Download failed: ${err.message}`)
  emit({ type: 'download:error', message: err.message })
}