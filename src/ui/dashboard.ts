import consola from 'consola'
import { onEvent } from '../events/index.js'

export class Dashboard {
  private totalPieces: number
  private pieceLength: number
  private completedPieces: number = 0
  private activePeers: Set<string> = new Set()

  private lastBytes: number = 0
  private speedMBs: number = 0
  private intervalNode: NodeJS.Timeout | null = null

  constructor(totalPieces: number, pieceLength: number) {
    this.totalPieces = totalPieces
    this.pieceLength = pieceLength

    onEvent('peer:connected', (e) => {
      this.activePeers.add(`${e.ip}:${e.port}`)
      this.render()
    })

    onEvent('peer:disconnected', (e) => {
      this.activePeers.delete(`${e.ip}:${e.port}`)
      this.render()
    })

    onEvent('piece:saved', (e) => {
      this.completedPieces = e.completed
      this.render()
    })

    onEvent('piece:hash_mismatch', (e) => {
      process.stdout.write('\n')
      consola.error(`Hash mismatch on piece ${e.index}, retrying...`)
    })

    this.intervalNode = setInterval(() => {
      const currentBytes = this.completedPieces * this.pieceLength
      const bytesInLastSecond = currentBytes - this.lastBytes
      this.speedMBs = Math.max(0, bytesInLastSecond / (1024 * 1024))
      this.lastBytes = currentBytes
      this.render()
    }, 1000)
  }

  public render() {
    const percent = Math.min(100, Math.floor((this.completedPieces / this.totalPieces) * 100)) || 0
    const barLength = 25
    const filled = Math.floor((barLength * percent) / 100)
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled)

    process.stdout.write(
      `\r\x1b[K[${bar}] ${percent}% | ${this.completedPieces}/${this.totalPieces} pcs | Speed: ${this.speedMBs.toFixed(2)} MB/s | Peers: ${this.activePeers.size}`
    )
  }

  public stop(torrentName: string) {
    if (this.intervalNode) clearInterval(this.intervalNode)
    process.stdout.write('\n\n')
    consola.ready(`🎉 Download complete: ${torrentName}!`)
  }
}
