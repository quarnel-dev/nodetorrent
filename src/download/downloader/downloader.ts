import { open } from 'node:fs/promises'

import type { DownloaderOptions } from './types/downloaderOptions.type.js'
import { connectPeer } from './connectPeer.js'

export async function download(options: DownloaderOptions): Promise<void> {
  const file = await open(options.outputPath, 'w')

  const queue = options.pieceHashes.map((_, index) => index)

  for (const peer of options.peers) {
    connectPeer(peer, options, file, queue)
  }

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (queue.length === 0) {
        clearInterval(interval)
        file.close()
        resolve()
      }
    }, 1000)
  })
}
