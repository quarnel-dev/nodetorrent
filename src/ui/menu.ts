import { consola } from 'consola'
import gradient, { pastel } from 'gradient-string'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const VERSION = '0.0.1'

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

export async function showMenu(): Promise<{ torrentPath: string; outputDir: string }> {
  let currentOutputDir = '.'

  while (true) {
    header()

    const option = await consola.prompt('What do you want to do?', {
      type: 'select',
      options: [
        { label: '⬇   Start Download', value: '1' },
        { label: '🕓  Recent Torrents', value: '2' },
        { label: `📁  Output Directory    [${currentOutputDir}]`, value: '3' },
        { label: '👥  Max Peers           [10]', value: '4' },
        { label: '🔌  Port                [6881]', value: '5' },
        { label: 'ℹ️  About', value: '6' },
        { label: '✖   Exit', value: '0' },
      ],
    })

    if (option === '0' || typeof option === 'symbol') {
      console.clear()
      process.exit(0)
    }

    if (option === '3') {
      const dir = (await consola.prompt('Save to:', {
        type: 'text',
        default: currentOutputDir,
      })) as string

      if (dir.trim()) currentOutputDir = dir.trim()
      continue
    }

    if (option === '1') {
      let torrentPath = (await consola.prompt('Path to .torrent file or folder:', {
        type: 'text',
      })) as string

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
        return { torrentPath, outputDir: currentOutputDir }
      } catch (err: any) {
        consola.error(`Error reading path: ${err.message}`)
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    if (['2', '4', '5', '6'].includes(option as string)) {
      consola.info('This feature is coming soon')
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}
