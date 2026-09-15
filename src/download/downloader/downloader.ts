import { emit } from '../../events/index.js'
import { connectPeer } from './connectPeer.js'
import { getPeers } from '../../tracker/index.js'
import { FileManager } from './utils/fileManager.js'

import type { Peer } from '../../tracker/index.js'
import type { DownloaderOptions } from './types/downloaderOptions.type.js'

export async function download(options: DownloaderOptions): Promise<void> {
  const fileManager = new FileManager(options.outputPath, options.files, options.pieceLength)
  const queue: number[] = options.pieceHashes.map((_, index) => index)

  const maxPeers = options.maxPeers 
  const port = options.port 

  const inProgress = new Set<number>()

  const total = queue.length
  let completed = 0
  let activePeers = 0
  let lastProgress = Date.now()
  let isFetchingPeers = false
  let isDone = false

  const connectedPeers = new Map<string, { disconnect: () => void }>()
  const peerCooldown = new Map<string, number>()

  let resolve!: () => void

  const fetchAndAdd = async () => {
    if (isFetchingPeers || activePeers >= maxPeers || isDone) return
    isFetchingPeers = true

    try {
      const peers = await getPeers({
        announceList: options.announceList,
        infoHash: options.infoHash,
        length: options.length,
        peerId: options.peerId,
        port: port,
      })

      addPeers(peers)
    } catch {
      emit({ type: 'download:retrying', reason: 'Failed to get peers' })
    } finally {
      isFetchingPeers = false
    }
  }

  const addPeers = (peers: Peer[]) => {
    if (isDone) return
    const now = Date.now()
    let addedCount = 0

    for (const peer of peers) {
      if (activePeers >= maxPeers) break

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
        if (isDone) return

        completed++
        lastProgress = Date.now()

        emit({ type: 'piece:saved', index, completed, total })

        if (completed === total) {
          isDone = true
          cleanupAndFinish()
        }
      })

      peerEvent.on('disconnect', () => {
        activePeers--
        connectedPeers.delete(id)

        peerCooldown.set(id, Date.now() + 15000)

        if (activePeers < maxPeers && completed < total && !isDone) {
          fetchAndAdd()
        }
      })
    }

    if (addedCount > 0) {
      emit({ type: 'peers:found', count: addedCount })
    }
  }

  const cleanupAndFinish = () => {
    for (const [_, p] of connectedPeers) {
      p.disconnect()
    }
    connectedPeers.clear()
    activePeers = 0

    resolve()
  }

  await new Promise<void>((_resolve) => {
    resolve = _resolve

    fetchAndAdd()

    const refreshInterval = setInterval(() => {
      if (isDone || completed >= total) return clearInterval(refreshInterval)
      if (activePeers < maxPeers) fetchAndAdd()
    }, 60 * 1000)

    const watchdog = setInterval(() => {
      if (isDone || completed >= total) return clearInterval(watchdog)

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
