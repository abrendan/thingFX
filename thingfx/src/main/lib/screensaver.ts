import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { serverManager } from './server.js'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'
import { getStorageValue, setStorageValue } from './storage.js'

export const SCREENSAVER_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']

// Folder-based screensaver: a folder of pictures the screensaver cycles
// through randomly. Stored as an absolute path in storage.
export async function chooseScreensaverFolder() {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (res.canceled) return { success: false }

  const folder = res.filePaths[0]
  const images = listScreensaverFolderImages(folder)

  if (images.length === 0)
    return {
      success: false,
      error: 'no_images',
      message:
        'That folder has no images (png, jpg or webp). Please pick a folder that contains pictures.'
    }

  setStorageValue('screensaverFolder', folder)
  updateScreensaverImage()

  return { success: true, folder, count: images.length }
}

export function removeScreensaverFolder() {
  setStorageValue('screensaverFolder', null)

  // Fall back to the single uploaded image if there is one,
  // otherwise tell clients the custom image is gone
  if (hasCustomScreensaverImage()) updateScreensaverImage()
  else broadcastScreensaverRemoved()

  return true
}

export function getScreensaverFolder(): string | null {
  const folder = getStorageValue('screensaverFolder')
  if (typeof folder !== 'string' || !folder) return null
  return folder
}

export function listScreensaverFolderImages(folder: string): string[] {
  try {
    if (!fs.statSync(folder).isDirectory()) return []
    return fs
      .readdirSync(folder)
      .filter(f =>
        SCREENSAVER_IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
      )
      .map(f => path.join(folder, f))
      .filter(p => {
        // Same 5MB cap as the single-image upload; the client refuses to
        // cache anything larger
        try {
          return fs.statSync(p).size <= 5 * 1024 * 1024
        } catch {
          return false
        }
      })
  } catch {
    return []
  }
}

export async function uploadScreensaverImage() {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ]
  })

  if (res.canceled) return { success: false }

  const imagePath = res.filePaths[0]

  try {
    const stats = fs.statSync(imagePath)
    const fileSizeInBytes = stats.size
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024)

    if (fileSizeInMB > 5) {
      return {
        success: false,
        error: 'size_limit_exceeded',
        message:
          'Image size exceeds the 5MB limit. Please select a smaller image.'
      }
    }
  } catch {
    return {
      success: false,
      error: 'file_read_error',
      message: 'Could not read the selected file.'
    }
  }

  try {
    const userData = app.getPath('userData')
    const imageFolder = path.join(userData, 'screensaver')
    const target = path.join(imageFolder, 'image.png')

    if (!fs.existsSync(imageFolder)) {
      fs.mkdirSync(imageFolder, { recursive: true })
    }

    fs.copyFileSync(imagePath, target)

    updateScreensaverImage()

    return { success: true }
  } catch {
    return {
      success: false,
      error: 'save_error',
      message: 'Could not save the image file.'
    }
  }
}

export function removeScreensaverImage() {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'screensaver')
  const target = path.join(imageFolder, 'image.png')

  if (fs.existsSync(target)) {
    fs.unlinkSync(target)
  }

  // A configured folder still supplies images — just refresh clients
  if (getScreensaverFolder()) {
    updateScreensaverImage()
    return true
  }

  broadcastScreensaverRemoved()
  return true
}

function broadcastScreensaverRemoved() {
  const wss = serverManager.getServer()
  if (wss) {
    wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
      if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return

      ws.send(
        JSON.stringify({
          type: 'screensaver',
          action: 'removed'
        })
      )
    })
  }

  return true
}

export function getScreensaverImagePath() {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'screensaver')
  const target = path.join(imageFolder, 'image.png')

  if (!fs.existsSync(target)) return null

  return target
}

export function hasCustomScreensaverImage() {
  return getScreensaverImagePath() !== null
}

export function updateScreensaverImage() {
  const wss = serverManager.getServer()
  if (!wss) return

  wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return

    ws.send(
      JSON.stringify({
        type: 'screensaver',
        action: 'update'
      })
    )
  })
}
