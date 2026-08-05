import { open } from 'node:fs/promises'
import { consola } from 'consola'

import { connectPeer } from './connectPeer.js'

import type { DownloaderOptions } from './types/downloaderOptions.type.js'

export async function download(options: DownloaderOptions): Promise<void> {
  const file = await open(options.outputPath, 'w')
  const queue = options.pieceHashes.map((_, index) => index)
  const total = queue.length
  let completed = 0
  let activePeers = 0

  await new Promise<void>((resolve, reject) => {
    for (const peer of options.peers) {
      activePeers++
      const peerEvent = connectPeer(peer, options, file, queue)

      peerEvent.on('piece:done', () => {
        completed++
        consola.info(`Progress: ${completed}/${total}`)
        if (completed === total) {
          file.close()
          resolve()
        }
      })

      peerEvent.on('disconnect', () => {
        activePeers--
        if (activePeers === 0 && completed < total) {
          setTimeout(() => {
            if (completed < total) {
              reject(new Error(`All peers disconnected: ${completed}/${total}`))
            }
          }, 5000)
        }
      })
    }
  })
}
