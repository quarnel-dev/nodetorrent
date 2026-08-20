import fs from 'node:fs/promises'
import path from 'node:path'

import type { SingleFile } from '../../../torrent/types/files.types.js'

interface FileOffsetInfo {
  path: string
  length: number
  startOffset: number
  endOffset: number
}

export class FileManager {
  private files: FileOffsetInfo[] = []

  constructor(
    private baseDir: string,
    files: SingleFile[],
    private pieceLength: number
  ) {
    let currentOffset = 0

    for (const f of files) {
      const fullPath = path.join(this.baseDir, f.path)
      this.files.push({
        path: fullPath,
        length: f.length,
        startOffset: currentOffset,
        endOffset: currentOffset + f.length,
      })
      currentOffset += f.length
    }
  }

  async writePiece(pieceIndex: number, buffer: Buffer): Promise<void> {
    const pieceStart = pieceIndex * this.pieceLength
    const pieceEnd = pieceStart + buffer.length

    for (const file of this.files) {
      if (pieceEnd > file.startOffset && pieceStart < file.endOffset) {
        const bufferOffset = Math.max(0, file.startOffset - pieceStart)
        const fileOffset = Math.max(0, pieceStart - file.startOffset)

        const bytesToWrite = Math.min(buffer.length - bufferOffset, file.length - fileOffset)

        const chunk = buffer.subarray(bufferOffset, bufferOffset + bytesToWrite)

        await fs.mkdir(path.dirname(file.path), { recursive: true })

        const fileHandleCheck = await fs.open(file.path, 'a')
        await fileHandleCheck.close()

        const handle = await fs.open(file.path, 'r+')

        try {
          await handle.write(chunk, 0, bytesToWrite, fileOffset)
        } finally {
          await handle.close()
        }
      }
    }
  }
}
