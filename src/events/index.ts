import { EventEmitter } from 'node:events'

export const appEvents = new EventEmitter()

export type AppEvent =
  | { type: 'peer:connected'; ip: string; port: number }
  | { type: 'peer:disconnected'; ip: string; port: number }
  | { type: 'peer:unchoked'; ip: string }
  | { type: 'peers:found'; count: number }
  | { type: 'piece:saved'; index: number; completed: number; total: number }
  | { type: 'download:retrying'; reason: string }
  | { type: 'download:done'; name: string }
  | { type: 'download:error'; message: string }
  | { type: 'piece:hash_mismatch'; index: number }

export function emit(event: AppEvent) {
  appEvents.emit(event.type, event)
}
