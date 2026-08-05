import { open } from 'node:fs/promises'

import { emit } from '../../events/index.js'
import { connectPeer } from './connectPeer.js'
import { getPeers } from '../../tracker/index.js'

import type { Peer } from '../../tracker/index.js'
import type { DownloaderOptions } from './types/downloaderOptions.type.js'

export async function download(options: DownloaderOptions): Promise<void> {
  const file = await open(options.outputPath, 'w')
  const queue = options.pieceHashes.map((_, index) => index)
  const total = queue.length
  let completed = 0
  let activePeers = 0
  let isRetrying = false
  let lastProgress = Date.now()
  const connectedPeers = new Set<string>()

  let resolve!: () => void

  const fetchAndAdd = async () => {
    try {
      const peers = await getPeers({
        announce: options.announce,
        infoHash: options.infoHash,
        length: options.length,
        peerId: options.peerId,
      })
      emit({ type: 'peers:found', count: peers.length })
      addPeers(peers)
    } catch {
      emit({ type: 'download:retrying', reason: 'Failed to get peers' })
      setTimeout(fetchAndAdd, 10000)
    }
  }

  const addPeers = (peers: Peer[]) => {
    for (const peer of peers) {
      const id = `${peer.ip}:${peer.port}`
      if (connectedPeers.has(id)) continue
      connectedPeers.add(id)
      activePeers++

      const peerEvent = connectPeer(peer, options, file, queue)

      peerEvent.on('piece:done', () => {
        completed++
        lastProgress = Date.now()
        emit({ type: 'piece:saved', index: 0, completed, total })
        if (completed === total) {
          file.close()
          resolve()
        }
      })

      peerEvent.on('disconnect', () => {
        activePeers--
        connectedPeers.delete(id)
        if (activePeers === 0 && completed < total && !isRetrying) {
          isRetrying = true
          setTimeout(async () => {
            if (completed >= total) {
              isRetrying = false
              return
            }
            emit({ type: 'download:retrying', reason: 'All peers disconnected' })
            await fetchAndAdd()
            isRetrying = false
          }, 5000)
        }
      })
    }
  }

  await new Promise<void>((_resolve, _reject) => {
    resolve = _resolve

    fetchAndAdd()

    const refreshInterval = setInterval(
      async () => {
        if (completed >= total) return clearInterval(refreshInterval)
        emit({ type: 'download:retrying', reason: 'Refreshing peers' })
        await fetchAndAdd()
      },
      30 * 60 * 1000
    )

    const watchdog = setInterval(async () => {
      if (completed >= total) return clearInterval(watchdog)
      if (Date.now() - lastProgress > 30000 && !isRetrying) {
        isRetrying = true
        emit({ type: 'download:retrying', reason: 'No progress for 30s' })
        connectedPeers.clear()
        activePeers = 0
        await fetchAndAdd()
        isRetrying = false
      }
    }, 10000)
  })
}
