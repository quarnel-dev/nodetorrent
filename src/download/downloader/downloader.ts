import { emit } from '../../events/index.js'
import { connectPeer } from './connectPeer.js'
import { getPeers } from '../../tracker/index.js'
import { FileManager } from './utils/fileManager.js'

import type { Peer } from '../../tracker/index.js'
import type { DownloaderOptions } from './types/downloaderOptions.type.js'

const MAX_ACTIVE_PEERS = 15

export async function download(options: DownloaderOptions): Promise<void> {
  const fileManager = new FileManager(options.outputPath, options.files, options.pieceLength)
  const queue: number[] = options.pieceHashes.map((_, index) => index)

  const inProgress = new Set<number>()

  const total = queue.length
  let completed = 0
  let activePeers = 0
  let lastProgress = Date.now()
  let isFetchingPeers = false

  const connectedPeers = new Map<string, { disconnect: () => void }>()
  const peerCooldown = new Map<string, number>()

  let resolve!: () => void

  const fetchAndAdd = async () => {
    if (isFetchingPeers || activePeers >= MAX_ACTIVE_PEERS) return
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
      if (activePeers >= MAX_ACTIVE_PEERS) break

      const id = `${peer.ip}:${peer.port}`

      if (connectedPeers.has(id)) continue

      const cooldownUntil = peerCooldown.get(id)
      if (cooldownUntil && now < cooldownUntil) {
        continue
      }

      const peerEvent = connectPeer(peer, options, fileManager, queue, inProgress)
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
          // Завершаем скачивание
          for (const [_, p] of connectedPeers) {
            p.disconnect()
          }
          resolve()
        }
      })

      peerEvent.on('disconnect', () => {
        activePeers--
        connectedPeers.delete(id)

        peerCooldown.set(id, Date.now() + 15000)

        if (activePeers < MAX_ACTIVE_PEERS && completed < total) {
          fetchAndAdd()
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

    const refreshInterval = setInterval(() => {
      if (completed >= total) return clearInterval(refreshInterval)
      if (activePeers < MAX_ACTIVE_PEERS) fetchAndAdd()
    }, 60 * 1000)

    const watchdog = setInterval(() => {
      if (completed >= total) return clearInterval(watchdog)

      if (Date.now() - lastProgress > 30000 && completed < total) {
        emit({ type: 'download:retrying', reason: 'No progress for 30s' })

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
