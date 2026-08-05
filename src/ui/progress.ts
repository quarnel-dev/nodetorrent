import { consola } from 'consola'
import { onEvent } from '../events/index.js'

export function setupUIListeners() {
  onEvent('peers:found', (e) => {
    consola.info(`Found ${e.count} peers from tracker`)
  })

  onEvent('peer:connected', (e) => {
    consola.success(`Connected to peer ${e.ip}:${e.port}`)
  })

  onEvent('peer:disconnected', (e) => {
    consola.warn(`Disconnected from ${e.ip}:${e.port}`)
  })

  onEvent('piece:hash_mismatch', (e) => {
    consola.error(`Hash mismatch on piece ${e.index}, dropping data`)
  })

  onEvent('piece:saved', (e) => {
    const percent = ((e.completed / e.total) * 100).toFixed(1)

    consola.log(`📦 Piece ${e.index} saved. Progress: ${percent}% (${e.completed}/${e.total})`)
  })

  onEvent('download:done', (e) => {
    consola.ready(`🎉 Download complete: ${e.name}!`)
  })

  onEvent('download:error', (e) => {
    consola.error(`❌ Download failed: ${e.message}`)
  })
}
