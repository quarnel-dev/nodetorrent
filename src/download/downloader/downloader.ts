import { open } from 'node:fs/promises'
import { consola } from 'consola'

import type { DownloaderOptions } from './types/downloaderOptions.type.js'
import { connectPeer } from './connectPeer.js'

export async function download(options: DownloaderOptions): Promise<void> {
  const file = await open(options.outputPath, 'w')
  const queue = options.pieceHashes.map((_, index) => index)
  const total = queue.length
  let completed = 0
  let activePeers = 0

  await new Promise<void>((resolve, reject) => {
    for (const peer of options.peers) {
      activePeers++
      connectPeer(peer, options, file, queue, {
        onPieceDone: () => {
          completed++
          consola.info(`Progress: ${completed}/${total}`)
          if (completed === total) {
            file.close()
            resolve()
          }
        },
        onDisconnect: () => {
          activePeers--
          if (activePeers === 0 && completed < total) {
            reject(new Error(`All peers disconnected, only ${completed}/${total} pieces downloaded`))
          }
        },
      })
    }
  })
}
