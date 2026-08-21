import { consola } from 'consola'
import gradient, { pastel } from 'gradient-string'
import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const VERSION = '1.0.0'
const HISTORY_FILE = './history.json'

const ASCII = `
███╗   ██╗██████╗ ██████╗ ███████╗
████╗  ██║██╔═══██╗██╔══██╗██╔════╝
██╔██╗ ██║██║   ██║██║   ██║█████╗  
██║╚██╗██║██║   ██║██║   ██║██╔══╝  
██║ ╚████║╚██████╔╝██████╔╝███████╗
╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝`

const TORRENT = `
████████╗ ██████╗ ██████╗ ██████╗ ███████╗███╗   ██╗████████╗
╚══██╔══╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║╚══██╔══╝
   ██║   ██║   ██║██████╔╝██████╔╝█████╗  ██╔██╗ ██║   ██║   
   ██║   ██║   ██║██╔══██╗██╔══██╗██╔══╝  ██║╚██╗██║   ██║   
   ██║   ╚██████╔╝██║  ██║██║  ██║███████╗██║ ╚████║   ██║   
   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   `

export interface MenuConfig {
  torrentPath: string
  outputDir: string
  maxPeers: number
  port: number
}

function header() {
  console.clear()
  console.log(gradient(['#a8edac', '#74c69d'])(ASCII))
  console.log(gradient(['#74c69d', '#52b788'])(TORRENT))
  console.log(pastel(`  ─────────────────────────────────────────────────────────────`))
  console.log(`  \x1b[90mv${VERSION}  ·  BitTorrent client for Node.js\x1b[0m`)
  console.log(pastel(`  ─────────────────────────────────────────────────────────────`))
  console.log()
}

async function findTorrents(dir: string): Promise<string[]> {
  const files = await readdir(dir)
  return files.filter((f) => f.endsWith('.torrent')).map((f) => join(dir, f))
}

async function loadHistory(): Promise<string[]> {
  try {
    const data = await readFile(HISTORY_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveHistory(torrentPath: string) {
  try {
    const history = await loadHistory()
    const updated = [torrentPath, ...history.filter((p) => p !== torrentPath)].slice(0, 5)
    await writeFile(HISTORY_FILE, JSON.stringify(updated, null, 2))
  } catch {}
}

export async function showMenu(): Promise<MenuConfig> {
  let currentOutputDir = '.'
  let maxPeers = 15
  let port = 6881

  while (true) {
    header()

    const option = await consola.prompt('What do you want to do?', {
      type: 'select',
      options: [
        { label: '⬇  Start Download', value: '1' },
        { label: '🕓  Recent Torrents', value: '2' },
        { label: `📁  Output Directory   [${currentOutputDir}]`, value: '3' },
        { label: `👥  Max Peers          [${maxPeers}]`, value: '4' },
        { label: `🔌  Port               [${port}]`, value: '5' },
        { label: 'ℹ️  About', value: '6' },
        { label: '✖   Exit', value: '0' },
      ],
    })

    if (option === '0' || typeof option === 'symbol') {
      console.clear()
      process.exit(0)
    }

    // Output Directory
    if (option === '3') {
      const dir = (await consola.prompt('Save to directory:', {
        type: 'text',
        default: currentOutputDir,
      })) as string

      if (dir.trim()) currentOutputDir = dir.trim()
      continue
    }

    // Max Peers
    if (option === '4') {
      const input = (await consola.prompt('Set max active peers:', {
        type: 'text',
        default: String(maxPeers),
      })) as string

      const parsed = parseInt(input, 10)
      if (!isNaN(parsed) && parsed > 0) maxPeers = parsed
      continue
    }

    // Port
    if (option === '5') {
      const input = (await consola.prompt('Set client port:', {
        type: 'text',
        default: String(port),
      })) as string

      const parsed = parseInt(input, 10)
      if (!isNaN(parsed) && parsed > 1024) port = parsed
      continue
    }

    // About
    if (option === '6') {
      header()
      consola.box(
        `NodeTorrent v${VERSION}\n\n` +
          `• Pure Node.js & TypeScript implementation\n` +
          `• Parallel TCP peer connection pool\n` +
          `• Pipeline & Endgame Mode support\n` +
          `• Author: Quarnel`
      )
      await consola.prompt('Press enter to go back...', { type: 'text' })
      continue
    }

    // Recent Torrents
    if (option === '2') {
      const history = await loadHistory()
      if (history.length === 0) {
        consola.warn('No recent torrents found.')
        await new Promise((r) => setTimeout(r, 1500))
        continue
      }

      const selected = (await consola.prompt('Select recent torrent:', {
        type: 'select',
        options: history,
      })) as string

      if (selected) {
        await saveHistory(selected)
        return { torrentPath: selected, outputDir: currentOutputDir, maxPeers, port }
      }
      continue
    }

    // Start Download
    if (option === '1') {
      let torrentPath = (await consola.prompt('Path to .torrent file or directory:', {
        type: 'text',
      })) as string

      if (!torrentPath.trim()) continue

      try {
        const info = await stat(torrentPath)

        if (info.isDirectory()) {
          const torrents = await findTorrents(torrentPath)
          if (torrents.length === 0) {
            consola.warn('No .torrent files found in folder')
            await new Promise((r) => setTimeout(r, 1500))
            continue
          }

          torrentPath = (await consola.prompt('Select torrent:', {
            type: 'select',
            options: torrents,
          })) as string
        }

        await saveHistory(torrentPath)
        return { torrentPath, outputDir: currentOutputDir, maxPeers, port }
      } catch (err: any) {
        consola.error(`Error reading path: ${err.message}`)
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }
}
