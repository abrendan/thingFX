import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import {
  HandlerAction,
  HandlerFunction
} from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'
import {
  getScreensaverFolder,
  listScreensaverFolderImages
} from '../screensaver.js'

export const name = 'screensaver'

export const hasActions = true

function getScreensaverImagePath() {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'screensaver')
  const target = path.join(imageFolder, 'image.png')

  if (!fs.existsSync(target)) return null

  return target
}

// Avoid serving the same folder picture twice in a row
let lastServedFolderImage: string | null = null

function pickImagePath(): string | null {
  const folder = getScreensaverFolder()
  if (folder) {
    const images = listScreensaverFolderImages(folder)
    if (images.length === 1) return images[0]
    if (images.length > 1) {
      const candidates = images.filter(i => i !== lastServedFolderImage)
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      lastServedFolderImage = pick
      return pick
    }
  }
  return getScreensaverImagePath()
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

export const actions: HandlerAction[] = [
  {
    action: 'getImage',
    handle: async ws => {
      const imagePath = pickImagePath()
      if (!imagePath) {
        // A folder is configured but yields nothing (deleted/emptied) and
        // there's no single-image fallback — clear stale client caches
        if (getScreensaverFolder())
          ws.send(JSON.stringify({ type: 'screensaver', action: 'removed' }))
        return
      }

      let res: Buffer
      try {
        res = fs.readFileSync(imagePath)
      } catch {
        return
      }
      if (!res.length) return

      const mime =
        MIME_BY_EXT[path.extname(imagePath).toLowerCase()] ?? 'image/png'

      ws.send(
        JSON.stringify({
          type: 'screensaver',
          action: 'image',
          data: {
            image: `data:${mime};base64,${res.toString('base64')}`
          }
        })
      )
    }
  }
]

export const handle: HandlerFunction = async ws => {
  const sleepMethod = getStorageValue('sleepMethod') || 'sleep'
  ws.send(
    JSON.stringify({
      type: 'screensaver',
      data: { sleepMethod }
    })
  )
}
