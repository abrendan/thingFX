import { exec } from 'child_process'
import { app, dialog } from 'electron'
import crypto from 'crypto'
import path from 'path'
import net from 'net'
import fs from 'fs'

import { getStorageValue } from './storage.js'

export const isDev = () => getStorageValue('devMode') === true

export const random = (len: number) =>
  crypto.randomBytes(len / 2).toString('hex')

export async function execAsync(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

let logPath: string | null = null

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

const logLevelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']

let logLevel = LogLevel.INFO

export function setLogLevel(level: LogLevel) {
  logLevel = level
}

export function getLogLevel() {
  return logLevel
}

const logs: string[] = []

export function getLogs() {
  return logs
}

export async function downloadLogs() {
  const savePath = await dialog.showSaveDialog({
    title: 'Save logs',
    filters: [{ name: 'Log files', extensions: ['log'] }]
  })

  if (savePath.canceled) return null

  if (savePath) {
    fs.writeFileSync(savePath.filePath, logs.join('\n'), 'utf-8')

    return savePath
  }

  return null
}

export function clearLogs() {
  logs.length = 0
  log('Logs were cleared')
}

export function log(text: string, scope?: string, level = LogLevel.INFO) {
  if (level < logLevel) return

  if (!logPath)
    logPath = path.join(app.getPath('userData'), 'thingfx.log')

  const time = new Date().toLocaleTimeString([], {
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  })

  const levelName = logLevelNames[level]

  const log = `[${time}] ${levelName}${scope ? ` <${scope}>:` : ''} ${text}`

  console.log(log)
  fs.appendFileSync(logPath, log + '\n')

  logs.push(log)
  if (logs.length > 1000) logs.shift()
}

export function safeParse(json: string) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function findOpenPort() {
  return new Promise<number>(resolve => {
    const server = net.createServer()

    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port
      server.close(() => resolve(port))
    })
  })
}

export async function isPortOpen(port: number) {
  return new Promise<boolean>(resolve => {
    const server = net.createServer()

    server.once('error', () => resolve(false))

    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(port)
  })
}

export async function checkInternet() {
  return new Promise<boolean>(resolve => {
    const socket = net.createConnection(80, 'one.one.one.one')

    socket.setTimeout(5000)

    socket.on('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('error', () => {
      resolve(false)
    })
  })
}

export function getParsedPlatformCommand(command: string) {
  const platform = process.platform

  if (platform === 'darwin') {
    return { cmd: command, shell: '/bin/sh' }
  } else if (platform === 'win32') {
    return { cmd: `& ${command}`, shell: 'powershell.exe' }
  } else if (platform === 'linux') {
    return { cmd: command, shell: '/bin/sh' }
  } else {
    return null
  }
}

// Windows Store / UWP apps (e.g. WhatsApp, Spotify from the Store) are
// launched through their AppsFolder moniker. Returns the validated moniker
// or null. The moniker must be passed to explorer.exe as an argument vector
// (execFile, no shell) — never interpolated into a shell command string.
export function getStoreAppMoniker(command: string) {
  if (process.platform !== 'win32') return null
  const unquoted = command.replace(/^"|"$/g, '')
  // AppIDs are UWP AUMIDs (PackageFamily!App) or, for desktop apps listed by
  // Get-StartApps, path-like IDs with spaces/braces/backslashes. Safe as an
  // execFile argument — just exclude quotes and control characters.
  return /^shell:AppsFolder\\[^"\r\n]{1,512}$/i.test(unquoted) ? unquoted : null
}

// Reads the current OS master volume as 0-100 (null if unavailable)
const WIN_GET_VOLUME = `Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int NotImpl1(); int NotImpl2();
  int GetChannelCount(out int pnChannelCount);
  int SetMasterVolumeLevel(float fLevelDB, System.Guid pguidEventContext);
  int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
  int GetMasterVolumeLevel(out float pfLevelDB);
  int GetMasterVolumeLevelScalar(out float pfLevel);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int NotImpl1();
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class Audio {
  static IAudioEndpointVolume Vol() {
    var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume epv = null;
    var epvid = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
    return epv;
  }
  public static float Volume {
    get { float v = -1; Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out v)); return v; }
  }
}
'@
[math]::Round([Audio]::Volume * 100)`

export async function getSystemVolume(): Promise<number | null> {
  const platform = process.platform
  let cmd: { cmd: string; shell: string } | null = null

  if (platform === 'win32') {
    cmd = { cmd: WIN_GET_VOLUME, shell: 'powershell.exe' }
  } else if (platform === 'darwin') {
    cmd = {
      cmd: `osascript -e 'output volume of (get volume settings)'`,
      shell: '/bin/sh'
    }
  } else if (platform === 'linux') {
    cmd = {
      cmd: `pactl get-sink-volume @DEFAULT_SINK@ | grep -oP '\\d+(?=%)' | head -1`,
      shell: '/bin/sh'
    }
  }
  if (!cmd) return null

  const out = await new Promise<string | null>(resolve => {
    exec(cmd.cmd, { shell: cmd.shell }, (err, stdout) =>
      resolve(err ? null : stdout)
    )
  })
  if (out === null) return null

  const value = parseInt(out.trim(), 10)
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
}

export function getShutdownPlatformCommand() {
  const platform = process.platform

  if (platform === 'darwin') {
    return {
      cmd: `osascript -e 'tell app "System Events" to shut down'`,
      shell: '/bin/sh'
    }
  } else if (platform === 'win32') {
    return {
      cmd: 'shutdown /s /t 0',
      shell: 'powershell.exe'
    }
  } else if (platform === 'linux') {
    return {
      cmd: 'systemctl poweroff',
      shell: '/bin/sh'
    }
  } else {
    return null
  }
}

// Adjust the OS-level output volume by one step. On Windows this taps
// the virtual volume keys (2 units per tap), matching the volume OSD.
export function getSystemVolumeStepCommand(direction: 'up' | 'down') {
  const platform = process.platform

  if (platform === 'win32') {
    const key = direction === 'up' ? 175 : 174
    return {
      cmd: `(new-object -ComObject WScript.Shell).SendKeys([char]${key})`,
      shell: 'powershell.exe'
    }
  } else if (platform === 'darwin') {
    const delta = direction === 'up' ? 6 : -6
    return {
      cmd: `osascript -e 'set volume output volume ((output volume of (get volume settings)) + ${delta})'`,
      shell: '/bin/sh'
    }
  } else if (platform === 'linux') {
    const sign = direction === 'up' ? '+' : '-'
    return {
      cmd: `pactl set-sink-volume @DEFAULT_SINK@ ${sign}5% || amixer -q sset Master 5%${sign}`,
      shell: '/bin/sh'
    }
  } else {
    return null
  }
}

export function getLockPlatformCommand() {
  const platform = process.platform

  if (platform === 'darwin') {
    return {
      cmd: 'pmset displaysleepnow',
      shell: '/bin/sh'
    }
  } else if (platform === 'win32') {
    return {
      cmd: 'rundll32.exe user32.dll,LockWorkStation',
      shell: 'powershell.exe'
    }
  } else if (platform === 'linux') {
    return {
      cmd: 'xdg-screensaver lock',
      shell: '/bin/sh'
    }
  } else {
    return null
  }
}

export function getPlatformADB() {
  const platform = process.platform

  if (platform === 'darwin') {
    return {
      url: 'https://dl.google.com/android/repository/platform-tools-latest-darwin.zip',
      cmd: 'adb'
    }
  } else if (platform === 'win32') {
    return {
      url: 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip',
      cmd: 'adb.exe'
    }
  } else if (platform === 'linux') {
    return {
      url: 'https://dl.google.com/android/repository/platform-tools-latest-linux.zip',
      cmd: 'adb'
    }
  } else {
    return null
  }
}

export function buildUnzipCommand(src: string, dest: string) {
  const platform = process.platform

  if (platform === 'win32') {
    return `${process.env.SystemRoot}\\System32\\tar.exe -xf ${src} -C "${dest}"`
  } else if (platform === 'darwin') {
    return `tar -xf ${src} -C "${dest}"`
  } else if (platform === 'linux') {
    return `unzip ${src} -d "${dest}"`
  } else {
    return null
  }
}

export const isNightly = app.getName().endsWith('-nightly')

export const resourceFolder = path.join(
  process.env.NODE_ENV === 'development'
    ? app.getAppPath()
    : `${path.join(process.resourcesPath, 'app.asar.unpacked')}`,
  'resources',
  isNightly ? 'nightly' : 'stable'
)
