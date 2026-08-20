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
  let lastProgress = Date.now()
  let isFetchingPeers = false

  const connectedPeers = new Map<string, { disconnect: () => void }>()
  const peerCooldown = new Map<string, number>()

  let resolve!: () => void

  const fetchAndAdd = async () => {
    if (isFetchingPeers) return
    isFetchingPeers = true

    try {
      const peers = await getPeers({
        announce: options.announce,
        infoHash: options.infoHash,
        length: options.length,
        peerId: options.peerId,
      })

      addPeers(peers)
    } catch {
      emit({ type: 'download:retrying', reason: 'Failed to get peers' })
    } finally {
      isFetchingPeers = false
    }
  }

  const addPeers = (peers: Peer[]) => {
    const now = Date.now()
    let addedCount = 0

    for (const peer of peers) {
      const id = `${peer.ip}:${peer.port}`

      if (connectedPeers.has(id)) continue

      const cooldownUntil = peerCooldown.get(id)
      if (cooldownUntil && now < cooldownUntil) {
        continue
      }

      const peerEvent = connectPeer(peer, options, file, queue)
      activePeers++
      addedCount++

      connectedPeers.set(id, {
        disconnect: () => {
          peerEvent.emit('force_disconnect')
        },
      })

      peerEvent.on('piece:done', (index: number) => {
        completed++
        lastProgress = Date.now()

        emit({ type: 'piece:saved', index, completed, total })

        if (completed === total) {
          file.close()
          resolve()
        }
      })

      peerEvent.on('disconnect', (reason?: string) => {
        activePeers--
        connectedPeers.delete(id)

        peerCooldown.set(id, Date.now() + 15000)

        if (activePeers === 0 && completed < total) {
          setTimeout(() => {
            if (completed < total) fetchAndAdd()
          }, 3000)
        }
      })
    }

    if (addedCount > 0) {
      emit({ type: 'peers:found', count: addedCount })
    }
  }

  await new Promise<void>((_resolve) => {
    resolve = _resolve

    fetchAndAdd()

    const refreshInterval = setInterval(
      () => {
        if (completed >= total) return clearInterval(refreshInterval)
        fetchAndAdd()
      },
      2 * 60 * 1000
    )

    const watchdog = setInterval(() => {
      if (completed >= total) return clearInterval(watchdog)

      if (Date.now() - lastProgress > 25000) {
        emit({ type: 'download:retrying', reason: 'No progress for 25s' })

        peerCooldown.clear()

        for (const [_, p] of connectedPeers) {
          p.disconnect()
        }
        connectedPeers.clear()
        activePeers = 0

        lastProgress = Date.now()
        fetchAndAdd()
      }
    }, 10000)
  })
}
