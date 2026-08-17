import { app, dialog } from 'electron'

// https://github.com/electron/electron/issues/46538
if (process.platform === 'linux')
  app.commandLine.appendSwitch('gtk-version', '3')

import {
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
  protocol,
  net,
  nativeImage,
  powerMonitor
} from 'electron'

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { join } from 'path'

import {
  getPlaybackHandlerConfig,
  getStorageValue,
  loadStorage,
  setPlaybackHandlerConfig,
  setStorageValue
} from './lib/storage.js'
import { setPcLocked, isCurrentLockGeneration } from './lib/lockstate.js'
import {
  clearLogs,
  downloadLogs,
  findOpenPort,
  getLogs,
  isDev,
  isNightly,
  isPortOpen,
  log,
  LogLevel,
  resourceFolder,
  setLogLevel
} from './lib/utils.js'
import {
  findCarThing,
  findCarThings,
  rebootCarThing,
  installApp,
  checkInstalledApp,
  forwardSocketServer,
  getAdbExecutable,
  getBrightness,
  setBrightnessSmooth,
  getAutoBrightness,
  setAutoBrightness,
  restore,
  restartAdbServer
} from './lib/adb.js'
import {
  getDeviceList,
  updateDeviceProfile,
  removeDeviceProfile,
  refreshDeviceSettings,
  registerDevice,
  setDeviceState,
  syncConnectedDevices
} from './lib/devices.js'
import {
  getShortcuts,
  listStoreApps,
  addShortcut,
  removeShortcut,
  updateShortcut,
  uploadShortcutImage,
  getShortcutImagePath,
  removeShortcutImage,
  updateApps,
  getButtonShortcuts,
  setButtonShortcuts,
  saveShortcutIconFromDataUrl
} from './lib/shortcuts.js'

import {
  getClientBuildId,
  hasCustomWebApp,
  importCustomWebApp,
  removeCustomWebApp
} from './lib/webapp.js'
import { fetchAndBroadcastWeather } from './lib/weather.js'
import {
  uploadScreensaverImage,
  removeScreensaverImage,
  hasCustomScreensaverImage,
  chooseScreensaverFolder,
  removeScreensaverFolder,
  getScreensaverFolder
} from './lib/screensaver.js'

import { playbackManager } from './lib/playback/playback.js'
import { applyPatch, getPatches } from './lib/patches.js'
import { getLatestVersion } from './lib/update.js'
import { serverManager } from './lib/server.js'
import { autoUpdater } from 'electron-updater'

const sendUpdateLog = (msg: string) => mainWindow?.webContents.send('updateLog', `[${new Date().toISOString()}] ${msg}`)

if (app.isPackaged) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.on('checking-for-update', () => sendUpdateLog('Checking for update...'))
  autoUpdater.on('update-available', info => sendUpdateLog(`Update available: ${info.version}`))
  autoUpdater.on('update-not-available', info => sendUpdateLog(`No update available. Current: ${info.version}`))
  autoUpdater.on('update-downloaded', info => {
    sendUpdateLog(`Download complete: ${info.version}`)
    mainWindow?.webContents.send('updateDownloaded')
  })
  autoUpdater.on('download-progress', p => {
    sendUpdateLog(`Downloading... ${Math.round(p.percent)}% (${Math.round(p.transferred / 1024)}KB / ${Math.round(p.total / 1024)}KB)`)
    mainWindow?.webContents.send('updateProgress', Math.round(p.percent))
  })
  autoUpdater.on('error', err => sendUpdateLog(`Error: ${err?.message ?? String(err)}`))
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux'
      ? { icon: `${resourceFolder}/icon.png` }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    },
    resizable: true,
    maximizable: true,
    minimizable: true,
    minWidth: 900,
    minHeight: 670
  })

  mainWindow.on('ready-to-show', async () => {
    mainWindow!.show()
    mainWindow!.center()
    app.dock?.show()
  })

  mainWindow.on('closed', () => {
    const firstClose = getStorageValue('firstClose')

    if (firstClose !== false) {
      setStorageValue('firstClose', false)

      new Notification({
        title: 'Still Running!',
        body: 'thingFX has been minimized to the system tray, and is still running in the background!'
      }).show()
    }
    mainWindow = null
    app.dock?.hide()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.focus()
  } else {
    createWindow()
  }
})


app.on('ready', async () => {
  log('Welcome!', 'thingFX')

  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) return app.quit()

  loadStorage()
  setLogLevel(getStorageValue('logLevel') ?? LogLevel.INFO)

  if (
    process.env.NODE_ENV === 'development' &&
    getStorageValue('devMode') === null
  ) {
    setStorageValue('devMode', true)
  }
  if (isDev()) log('Running in development mode', 'thingFX')
  electronApp.setAppUserModelId(`com.thingfx.${app.getName()}`)

  const adbPath = await getAdbExecutable().catch(err => ({ err }))

  if (typeof adbPath === 'object' && adbPath.err) {
    log(
      `Failed to get ADB executable: ${adbPath.err.message}`,
      'adb',
      LogLevel.ERROR
    )
  } else {
    if (adbPath === 'adb') log('Using system adb', 'adb')
    else log(`Using downloaded ADB from path: ${adbPath}`, 'adb')
  }

  if (getStorageValue('setupComplete') === true)
    await serverManager.start()

  await setupIpcHandlers()
  await setupTray()

  serverManager.on('status', up => {
    mainWindow?.webContents.send('serverStatus', up)
  })

  protocol.handle('shortcut', req => {
    const name = req.url.split('/').pop()
    if (!name) return new Response(null, { status: 404 })
    const path = getShortcutImagePath(name.split('?')[0])
    if (!path) return new Response(null, { status: 404 })
    return net.fetch(`file://${path}`)
  })

  if (getStorageValue('launchMinimized') !== true) createWindow()
  else app.dock?.hide()

  // When the PC is locked, put every connected Car Thing into screensaver;
  // wake them again on unlock.
  const broadcastToClients = (msg: object) => {
    const wss = serverManager.getServer()
    if (!wss) return
    const payload = JSON.stringify(msg)
    wss.clients.forEach(ws => {
      const client =
        ws as import('./types/WebSocketServer.js').AuthenticatedWebSocket
      if (client.authenticated && client.readyState === WebSocket.OPEN)
        client.send(payload)
    })
  }

  const applyLockState = async (locked: boolean) => {
    const token = setPcLocked(locked)
    broadcastToClients(
      locked ? { type: 'sleep', data: 'screensaver' } : { type: 'wake' }
    )
    const serials = await findCarThings().catch(() => [] as string[])
    for (const serial of serials) {
      // A newer lock/unlock transition wins — stop applying a stale one
      if (!isCurrentLockGeneration(token)) return
      if (locked) {
        await setAutoBrightness(serial, false).catch(() => {})
        if (!isCurrentLockGeneration(token)) return
        await setBrightnessSmooth(serial, 0.1, 10).catch(() => {})
      } else if (getStorageValue('autoBrightness') === true) {
        await setAutoBrightness(serial, true).catch(() => {})
      } else {
        const stored = getStorageValue('brightness')
        const brightness = typeof stored === 'number' ? stored : 0.5
        await setBrightnessSmooth(serial, brightness, 10).catch(() => {})
      }
    }
  }

  powerMonitor.on('lock-screen', () => void applyLockState(true))
  powerMonitor.on('unlock-screen', () => void applyLockState(false))
})

app.on('browser-window-created', (_, window) => {
  optimizer.watchWindowShortcuts(window)
})

app.on('window-all-closed', () => {
  // don't quit the process
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

enum IPCHandler {
  FindCarThing = 'findCarThing',
  FindSetupCarThing = 'findSetupCarThing',
  RebootCarThing = 'rebootCarThing',
  RestoreCarThing = 'restoreCarThing',
  InstallApp = 'installApp',
  StartServer = 'startServer',
  StopServer = 'stopServer',
  GetServerInfo = 'getServerInfo',
  ForwardSocketServer = 'forwardSocketServer',
  GetVersion = 'getVersion',
  GetClientUpdatePending = 'getClientUpdatePending',
  GetStorageValue = 'getStorageValue',
  SetStorageValue = 'setStorageValue',
  TriggerCarThingStateUpdate = 'triggerCarThingStateUpdate',
  RestartAdbServer = 'restartAdbServer',
  UploadShortcutImage = 'uploadShortcutImage',
  RemoveNewShortcutImage = 'removeNewShortcutImage',
  BrowseForApp = 'browseForApp',
  ListStoreApps = 'listStoreApps',
  GetShortcuts = 'getShortcuts',
  AddShortcut = 'addShortcut',
  RemoveShortcut = 'removeShortcut',
  UpdateShortcut = 'updateShortcut',
  GetButtonShortcuts = 'getButtonShortcuts',
  SetButtonShortcuts = 'setButtonShortcuts',
  IsDevMode = 'isDevMode',
  GetBrightness = 'getBrightness',
  SetBrightness = 'setBrightness',
  GetPatches = 'getPatches',
  ApplyPatch = 'applyPatch',
  ValidateConfig = 'validateConfig',
  GetPlaybackHandlerConfig = 'getPlaybackHandlerConfig',
  SetPlaybackHandlerConfig = 'setPlaybackHandlerConfig',
  RestartPlaybackHandler = 'restartPlaybackHandler',
  HasCustomClient = 'hasCustomClient',
  ImportCustomClient = 'importCustomClient',
  RemoveCustomClient = 'removeCustomClient',
  GetLogs = 'getLogs',
  ClearLogs = 'clearLogs',
  DownloadLogs = 'downloadLogs',
  UploadScreensaverImage = 'uploadScreensaverImage',
  RemoveScreensaverImage = 'removeScreensaverImage',
  HasCustomScreensaverImage = 'hasCustomScreensaverImage',
  ChooseScreensaverFolder = 'chooseScreensaverFolder',
  RemoveScreensaverFolder = 'removeScreensaverFolder',
  GetScreensaverFolder = 'getScreensaverFolder',
  OpenDevTools = 'openDevTools',
  GetChannel = 'getChannel',
  CheckUpdate = 'checkUpdate',
  DownloadUpdate = 'downloadUpdate',
  QuitAndInstall = 'quitAndInstall',
  OpenExternal = 'openExternal',
  FindOpenPort = 'findOpenPort',
  IsPortOpen = 'isPortOpen',
  SaveShortcutIconFromDataUrl = 'saveShortcutIconFromDataUrl',
  RefreshWeather = 'refreshWeather',
  GetDevices = 'getDevices',
  SetDeviceProfile = 'setDeviceProfile',
  ForgetDevice = 'forgetDevice'
}

async function setupIpcHandlers() {
  ipcMain.handle(IPCHandler.FindCarThing, async () => {
    const found = await findCarThing().catch(err => ({ err }))
    if (typeof found !== 'string' && found?.err) return found.err.message
    return !!found
  })

  ipcMain.handle(IPCHandler.FindSetupCarThing, async () => {
    const found = await findCarThing()
    if (!found) return 'not_found'

    const lastVersion = getStorageValue('lastInstalledClientVersion')
    if (lastVersion !== app.getVersion()) return 'not_installed'

    return 'ready'
  })

  ipcMain.handle(IPCHandler.RebootCarThing, async (_event, serial?: string) => {
    await rebootCarThing(serial ?? null)
  })

  ipcMain.handle(IPCHandler.RestoreCarThing, async () => {
    await restore(null)
  })

  ipcMain.handle(IPCHandler.InstallApp, async () => {
    const target = await findCarThing().catch(() => null)
    if (target) lastInstallTimes.set(target, Date.now())
    const res = await installApp(target).catch(err => ({ err }))
    if (res && typeof res === 'object' && 'err' in res)
      return res.err.message
    await recordInstalledClient()
    return true
  })

  ipcMain.handle(IPCHandler.GetClientUpdatePending, async () => {
    const lastVersion = getStorageValue('lastInstalledClientVersion')
    if (!lastVersion) return false
    if (lastVersion !== app.getVersion()) return true
    const bundled = await getClientBuildId()
    const installed = getStorageValue('lastInstalledClientBuild')
    // Same version but different client build (e.g. rebuilt beta installer)
    return !!bundled && installed !== bundled
  })

  ipcMain.handle(IPCHandler.StartServer, async () => {
    await serverManager.start()
  })

  ipcMain.handle(IPCHandler.StopServer, async () => {
    await serverManager.stop()
  })

  ipcMain.handle(IPCHandler.GetServerInfo, async () => {
    return serverManager.getServerInfo()
  })

  ipcMain.handle(IPCHandler.ForwardSocketServer, async () => {
    await forwardSocketServer(null)
  })

  ipcMain.handle(IPCHandler.GetVersion, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPCHandler.GetStorageValue, (_event, key) => {
    return getStorageValue(key)
  })

  ipcMain.handle(IPCHandler.SetStorageValue, (_event, key, value) => {
    return setStorageValue(key, value)
  })

  // Per-device install cooldowns (keyed by ADB serial)
  const lastInstallTimes = new Map<string, number>()

  // Record which client build is on the device — call only after a
  // successful install.
  async function recordInstalledClient() {
    setStorageValue('lastInstalledClientVersion', app.getVersion())
    setStorageValue('lastInstalledClientBuild', await getClientBuildId())
  }

  // Handles one connected device; returns its resulting state
  async function updateSingleDevice(
    found: string
  ): Promise<'not_installed' | 'installing' | 'ready'> {
    const lastVersion = getStorageValue('lastInstalledClientVersion')
    const willAutoInstall = getStorageValue('installAutomatically')
    const cooldownElapsed =
      Date.now() - (lastInstallTimes.get(found) ?? 0) > 60000

    if (!lastVersion) {
      // Never been installed anywhere — auto-install once
      if (willAutoInstall && cooldownElapsed) {
        lastInstallTimes.set(found, Date.now())
        setDeviceState(found, 'installing')
        mainWindow?.webContents.send('carThingState', 'installing')
        await installApp(found)
        await recordInstalledClient()
      } else {
        return 'not_installed'
      }
    } else if (willAutoInstall && cooldownElapsed) {
      // Reinstall when the client is missing from this device (e.g.
      // after a reflash, or a second device that never got the app) or
      // an update is pending.
      const appMissing = await checkInstalledApp(found).then(
        v => !v,
        () => false
      )
      const bundledBuild = await getClientBuildId()
      const updatePending =
        lastVersion !== app.getVersion() ||
        (!!bundledBuild &&
          getStorageValue('lastInstalledClientBuild') !== bundledBuild)

      if (appMissing || updatePending) {
        lastInstallTimes.set(found, Date.now())
        setDeviceState(found, 'installing')
        mainWindow?.webContents.send('carThingState', 'installing')
        try {
          await installApp(found)
          if (updatePending) await recordInstalledClient()
        } catch (err) {
          log(
            `Auto-reinstall failed on ${found}: ${(err as Error).message}`,
            'CarThingState',
            LogLevel.ERROR
          )
          if (appMissing) {
            // Device has no client at all and the install failed —
            // don't pretend it's ready
            return 'not_installed'
          }
        }
      }
    }

    await forwardSocketServer(found)

    const autoBrightness = getStorageValue('autoBrightness') ?? true
    if ((await getAutoBrightness(found)) !== autoBrightness)
      setAutoBrightness(found, autoBrightness)

    if (!autoBrightness) {
      const brightness = getStorageValue('brightness') ?? 0.5
      if ((await getBrightness(found)) !== brightness)
        setBrightnessSmooth(found, brightness)
    }

    return 'ready'
  }

  async function carThingStateUpdate() {
    const devices = await findCarThings().catch(err => {
      log(
        `Got an error while finding CarThing: ${err.message}`,
        'CarThingState',
        LogLevel.ERROR
      )
      return [] as string[]
    })

    syncConnectedDevices(devices)

    const states: string[] = []
    for (const found of devices) {
      try {
        const state = await updateSingleDevice(found)
        setDeviceState(found, state)
        registerDevice(found)
        states.push(state)
      } catch (err) {
        log(
          `Error updating device ${found}: ${(err as Error).message}`,
          'CarThingState',
          LogLevel.ERROR
        )
        setDeviceState(found, 'not_installed')
        states.push('not_installed')
      }
    }

    // Aggregate state for the Home page: best state wins
    const aggregate =
      states.length === 0
        ? 'not_found'
        : states.includes('ready')
          ? 'ready'
          : states.includes('installing')
            ? 'installing'
            : 'not_installed'

    mainWindow?.webContents.send('carThingState', aggregate)
    mainWindow?.webContents.send('devicesUpdated', getDeviceList())
  }

  async function interval() {
    await carThingStateUpdate().catch(err => {
      log(
        `Error updating state: ${err.message}`,
        'CarThingState',
        LogLevel.ERROR
      )
    })

    setTimeout(interval, 5000)
  }

  interval()

  ipcMain.handle(IPCHandler.TriggerCarThingStateUpdate, async () => {
    await carThingStateUpdate()
  })

  ipcMain.handle(IPCHandler.RestartAdbServer, async () => {
    try {
      await restartAdbServer()
    } catch (err) {
      log(
        `ADB restart failed: ${(err as Error).message}`,
        'adb',
        LogLevel.ERROR
      )
      return { ok: false, error: (err as Error).message }
    }
    await carThingStateUpdate().catch(() => null)
    return { ok: true }
  })

  ipcMain.handle(IPCHandler.UploadShortcutImage, async (_event, name) => {
    return await uploadShortcutImage(name)
  })

  ipcMain.handle(IPCHandler.RemoveNewShortcutImage, async () => {
    return removeShortcutImage('new')
  })

  ipcMain.handle(
    IPCHandler.SaveShortcutIconFromDataUrl,
    async (_event, id, dataUrl) => {
      return saveShortcutIconFromDataUrl(id, dataUrl)
    }
  )

  ipcMain.handle(IPCHandler.BrowseForApp, async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters:
        process.platform === 'win32'
          ? [
              { name: 'Programs', extensions: ['exe', 'bat', 'cmd', 'lnk'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          : [{ name: 'All Files', extensions: ['*'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  })

  ipcMain.handle(IPCHandler.ListStoreApps, async () => {
    return listStoreApps()
  })

  ipcMain.handle(IPCHandler.GetShortcuts, async () => {
    return getShortcuts()
  })

  ipcMain.handle(IPCHandler.AddShortcut, async (_event, shortcut) => {
    addShortcut(shortcut)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.RemoveShortcut, async (_event, shortcut) => {
    removeShortcut(shortcut)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.UpdateShortcut, async (_event, shortcut) => {
    updateShortcut(shortcut)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.GetButtonShortcuts, () => getButtonShortcuts())

  ipcMain.handle(IPCHandler.SetButtonShortcuts, async (_event, buttons) => {
    setButtonShortcuts(buttons)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.IsDevMode, async () => {
    return isDev()
  })

  ipcMain.handle(IPCHandler.GetBrightness, async () => {
    return await getBrightness(null)
  })

  ipcMain.handle(IPCHandler.SetBrightness, async (_event, value) => {
    return await setBrightnessSmooth(null, value)
  })

  ipcMain.handle(IPCHandler.GetPatches, async () => {
    return await getPatches()
  })

  ipcMain.handle(IPCHandler.ApplyPatch, async (_event, patch) => {
    return await applyPatch(patch)
  })

  ipcMain.handle(
    IPCHandler.ValidateConfig,
    async (_event, handlerName, config) => {
      const valid = playbackManager.validateConfig(handlerName, config)
      return valid
    }
  )

  ipcMain.handle(
    IPCHandler.GetPlaybackHandlerConfig,
    (_event, handlerName) => {
      return getPlaybackHandlerConfig(handlerName)
    }
  )

  ipcMain.handle(
    IPCHandler.SetPlaybackHandlerConfig,
    (_event, handlerName, config) => {
      return setPlaybackHandlerConfig(handlerName, config)
    }
  )

  ipcMain.handle(IPCHandler.RestartPlaybackHandler, async () => {
    const playbackHandler = getStorageValue('playbackHandler')
    if (!playbackHandler) return

    playbackManager.setup(playbackHandler)
  })

  ipcMain.handle(IPCHandler.HasCustomClient, async () => {
    return hasCustomWebApp()
  })

  ipcMain.handle(IPCHandler.ImportCustomClient, async () => {
    const res = await importCustomWebApp().catch(err => err.message)
    if (typeof res === 'string') return res
    const installRes = await installApp(null).catch(err => ({ err }))
    if (installRes && typeof installRes === 'object' && 'err' in installRes)
      return installRes.err.message
    await recordInstalledClient()
    return true
  })

  ipcMain.handle(IPCHandler.RemoveCustomClient, async () => {
    await removeCustomWebApp()
    const installRes = await installApp(null).catch(err => ({ err }))
    if (installRes && typeof installRes === 'object' && 'err' in installRes)
      return installRes.err.message
    await recordInstalledClient()
    return true
  })

  ipcMain.handle(IPCHandler.GetLogs, async () => {
    return getLogs()
  })

  ipcMain.handle(IPCHandler.ClearLogs, async () => {
    return clearLogs()
  })

  ipcMain.handle(IPCHandler.DownloadLogs, async () => {
    await downloadLogs()
  })

  ipcMain.handle(IPCHandler.UploadScreensaverImage, async () => {
    return await uploadScreensaverImage()
  })

  ipcMain.handle(IPCHandler.RemoveScreensaverImage, async () => {
    return removeScreensaverImage()
  })

  ipcMain.handle(IPCHandler.HasCustomScreensaverImage, async () => {
    return hasCustomScreensaverImage()
  })

  ipcMain.handle(IPCHandler.ChooseScreensaverFolder, async () => {
    return await chooseScreensaverFolder()
  })

  ipcMain.handle(IPCHandler.RemoveScreensaverFolder, async () => {
    return removeScreensaverFolder()
  })

  ipcMain.handle(IPCHandler.GetScreensaverFolder, async () => {
    return getScreensaverFolder()
  })

  ipcMain.handle(IPCHandler.OpenDevTools, () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools()
    }
  })

  ipcMain.handle(IPCHandler.GetChannel, () => {
    return isNightly ? 'nightly' : 'stable'
  })

  ipcMain.handle(IPCHandler.CheckUpdate, async () => {
    const currentVersion = 'v' + app.getVersion()
    const latestVersion = await getLatestVersion().catch(() => null)
    if (!latestVersion) return null

    return {
      currentVersion,
      latestVersion: latestVersion.version,
      downloadUrl: latestVersion.downloadUrl
    }
  })

  ipcMain.handle(IPCHandler.DownloadUpdate, async () => {
    // thingFX has no update channel configured; updater is disabled.
    sendUpdateLog('Updates are disabled: thingFX has no release channel configured.')
  })

  ipcMain.handle(IPCHandler.QuitAndInstall, () => {
    // thingFX has no update channel configured; updater is disabled.
    sendUpdateLog('Updates are disabled: thingFX has no release channel configured.')
  })

  ipcMain.handle(IPCHandler.OpenExternal, (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle(IPCHandler.FindOpenPort, async () => {
    return await findOpenPort()
  })

  ipcMain.handle(IPCHandler.IsPortOpen, async (_event, port) => {
    return await isPortOpen(port as number)
  })

  ipcMain.handle(IPCHandler.RefreshWeather, async () => {
    return await fetchAndBroadcastWeather()
  })

  ipcMain.handle(IPCHandler.GetDevices, async () => {
    return getDeviceList()
  })

  ipcMain.handle(
    IPCHandler.SetDeviceProfile,
    async (_event, serial: string, patch: Record<string, unknown>) => {
      if (typeof serial !== 'string' || !serial) return
      updateDeviceProfile(serial, patch)
      refreshDeviceSettings(serial)
      return getDeviceList()
    }
  )

  ipcMain.handle(IPCHandler.ForgetDevice, async (_event, serial: string) => {
    if (typeof serial !== 'string' || !serial) return
    removeDeviceProfile(serial)
    return getDeviceList()
  })
}

async function setupTray() {
  const icon =
    process.platform === 'darwin'
      ? nativeImage
          .createFromPath(`${resourceFolder}/tray.png`)
          .resize({ height: 24, width: 24 })
      : `${resourceFolder}/tray.png`
  const tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `thingFX${isNightly ? ' Nightly' : ''} v${app.getVersion()}`,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.setToolTip(
    `thingFX${isNightly ? ' Nightly' : ''} v${app.getVersion()}`
  )

  tray.on('click', () => {
    if (process.platform === 'darwin') return
    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })
}
