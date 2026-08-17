import { app, dialog } from 'electron'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

import { getStorageValue, setStorageValue } from './storage.js'
import { serverManager } from './server.js'

import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'

interface Shortcut {
  id: string
  name?: string
  command: string
}

export interface StoreApp {
  name: string
  appId: string
}

// List installed Start Menu / Store (UWP) apps via PowerShell Get-StartApps.
// Windows only — returns [] elsewhere or on failure.
export function listStoreApps(): Promise<StoreApp[]> {
  if (process.platform !== 'win32') return Promise.resolve([])

  return new Promise(resolve => {
    exec(
      'Get-StartApps | ConvertTo-Json -Compress',
      { shell: 'powershell.exe', maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve([])
        try {
          const parsed = JSON.parse(stdout.trim())
          const arr = Array.isArray(parsed) ? parsed : [parsed]
          resolve(
            arr
              .filter(
                (a): a is { Name: string; AppID: string } =>
                  !!a &&
                  typeof a.Name === 'string' &&
                  typeof a.AppID === 'string'
              )
              .map(a => ({ name: a.Name, appId: a.AppID }))
              .sort((x, y) => x.name.localeCompare(y.name))
          )
        } catch {
          resolve([])
        }
      }
    )
  })
}

export async function uploadShortcutImage(name: string) {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  })

  if (res.canceled) return false

  const imagePath = res.filePaths[0]

  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'shortcuts')
  const target = path.join(imageFolder, `${name}.png`)

  if (!fs.existsSync(`${userData}/shortcuts`))
    fs.mkdirSync(`${userData}/shortcuts`)

  fs.copyFileSync(imagePath, target)

  return true
}

export function getShortcutImagePath(id: string) {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'shortcuts')
  const target = path.join(imageFolder, `${id}.png`)

  if (!fs.existsSync(target)) return null

  return target
}

export function getShortcutImage(id: string) {
  const imagePath = getShortcutImagePath(id)

  if (!imagePath) return null

  return fs.readFileSync(imagePath)
}

function saveShortcutImage(id: string) {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'shortcuts')
  const newImage = path.join(imageFolder, 'new.png')

  // Icon is optional — the client falls back to a generic icon
  if (!fs.existsSync(newImage)) return

  fs.copyFileSync(newImage, path.join(imageFolder, `${id}.png`))

  fs.rmSync(newImage)
}

export function removeShortcutImage(id: string) {
  const imagePath = getShortcutImagePath(id)

  if (!imagePath) return

  fs.rmSync(imagePath)
}

export function getShortcuts() {
  const shortcuts = getStorageValue('shortcuts')

  if (!shortcuts) return []

  return shortcuts as Shortcut[]
}

// Reserved IDs with special meaning on the client (e.g. preset buttons)
const RESERVED_SHORTCUT_IDS = ['__lock__', '__shutdown__']

export function addShortcut(shortcut: Shortcut) {
  if (RESERVED_SHORTCUT_IDS.includes(shortcut.id)) return

  const shortcuts = getShortcuts()

  shortcuts.push(shortcut)

  setStorageValue('shortcuts', shortcuts)

  saveShortcutImage(shortcut.id)
}

export function removeShortcut(id: string) {
  const shortcuts = getShortcuts()
  const index = shortcuts.findIndex(s => s.id === id)

  if (index === -1) return

  shortcuts.splice(index, 1)

  setStorageValue('shortcuts', shortcuts)

  removeShortcutImage(id)
}

export function updateShortcut(shortcut: Shortcut) {
  if (RESERVED_SHORTCUT_IDS.includes(shortcut.id)) return

  const shortcuts = getShortcuts()
  const index = shortcuts.findIndex(s => s.id === shortcut.id)

  if (index === -1) return

  shortcuts[index] = shortcut

  setStorageValue('shortcuts', shortcuts)

  // Promote a staged icon (new.png), if one was picked during the edit
  saveShortcutImage(shortcut.id)
}

export type ButtonShortcuts = Record<'1' | '2' | '3' | '4', string | null>

export function getButtonShortcuts(): ButtonShortcuts {
  const stored = getStorageValue('buttonShortcuts')
  return (stored as ButtonShortcuts) ?? { '1': null, '2': null, '3': null, '4': null }
}

export function setButtonShortcuts(buttons: ButtonShortcuts) {
  setStorageValue('buttonShortcuts', buttons)
}

export async function saveShortcutIconFromDataUrl(id: string, dataUrl: string) {
  const base64 = dataUrl.split(',')[1]
  const buf = Buffer.from(base64, 'base64')
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'shortcuts')
  if (!fs.existsSync(imageFolder)) fs.mkdirSync(imageFolder)
  const iconPath = path.join(imageFolder, `${id}.png`)
  fs.writeFileSync(iconPath, buf)
}

export async function updateApps() {
  const wss = serverManager.getServer()
  if (!wss) return

  wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'apps', data: getShortcuts() }))
    ws.send(JSON.stringify({ type: 'buttons', data: getButtonShortcuts() }))
  })
}
