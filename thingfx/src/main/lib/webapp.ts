import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

/**
 * Identifies the exact client build bundled with this install. index.html
 * references the content-hashed asset files, so its hash changes with every
 * client rebuild — unlike the version number, which can stay the same.
 */
export async function getClientBuildId(): Promise<string | null> {
  try {
    const dir = await getWebAppDir()
    const indexPath = path.join(dir, 'index.html')
    if (!fs.existsSync(indexPath)) return null
    return crypto
      .createHash('sha256')
      .update(fs.readFileSync(indexPath))
      .digest('hex')
  } catch {
    return null
  }
}

import {
  buildUnzipCommand,
  execAsync,
  isDev,
  log,
  LogLevel
} from './utils.js'

export async function getWebAppDir() {
  if (isDev() && hasCustomWebApp()) {
    log('Using custom client webapp', 'Client Webapp')
    return path.join(app.getPath('userData'), 'customClient')
  }

  if (isDev() && fs.existsSync(path.join(process.cwd(), 'client/dist'))) {
    log('Using local client webapp', 'Client Webapp')
    return path.join(process.cwd(), 'client/dist')
  }

  const bundledClient = path.join(process.resourcesPath, 'client')
  if (!isDev() && fs.existsSync(bundledClient)) {
    log('Using bundled client webapp', 'Client Webapp')
    return bundledClient
  }

  // thingFX has no release channel to download the client from; the client
  // is always bundled with the app (extraResources) or built locally in dev.
  log(
    'No bundled client found and thingFX has no download channel configured',
    'Client Webapp',
    LogLevel.ERROR
  )
  throw new Error('webapp_download_failed')
}

export function hasCustomWebApp() {
  const userData = app.getPath('userData')
  const clientFolder = path.join(userData, 'customClient')

  if (fs.existsSync(clientFolder)) return true

  return false
}

export async function importCustomWebApp() {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'thingFX Client', extensions: ['zip'] }]
  })

  if (res.canceled) return false

  const imagePath = res.filePaths[0]

  const userData = app.getPath('userData')
  const clientFolder = path.join(userData, 'customClient')
  const target = path.join(clientFolder, `client.zip`)

  if (!fs.existsSync(`${userData}/customClient`))
    fs.mkdirSync(`${userData}/customClient`)

  fs.copyFileSync(imagePath, target)

  log('Extracting custom client', 'Client Webapp')

  const unzipCommand = buildUnzipCommand(target, clientFolder)
  if (!unzipCommand) {
    log('Failed to find unzip command for platform', 'adb', LogLevel.ERROR)
    throw new Error('adb_platform_not_found')
  }

  const extract = await execAsync(unzipCommand).catch(() => null)

  fs.rmSync(target)

  if (extract === null) {
    log('Failed to extract custom client', 'Client Webapp', LogLevel.ERROR)
    throw new Error('extract_failed')
  }

  if (!fs.existsSync(path.join(clientFolder, 'index.html'))) {
    fs.rmSync(clientFolder, { recursive: true })
    log('Invalid custom client uploaded', 'Client Webapp', LogLevel.ERROR)
    throw new Error('invalid_custom_client')
  }

  log('Extracted custom client', 'Client Webapp')

  return true
}

export async function removeCustomWebApp() {
  const userData = app.getPath('userData')
  const clientFolder = path.join(userData, 'customClient')

  if (fs.existsSync(clientFolder))
    fs.rmSync(clientFolder, { recursive: true })

  return true
}
