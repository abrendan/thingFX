import { app } from 'electron'
import { platform } from 'os'
import axios from 'axios'
import path from 'path'
import fs from 'fs'

import {
  buildUnzipCommand,
  execAsync,
  getLogLevel,
  getPlatformADB,
  log,
  LogLevel
} from './utils.js'
import { serverManager } from './server.js'
import { getSocketPassword } from './storage.js'
import { getWebAppDir } from './webapp.js'

export async function getAdbExecutable() {
  const res = await execAsync('adb version').catch(() => null)

  if (res && platform() !== 'darwin') return 'adb'

  const adbInfo = getPlatformADB()
  if (!adbInfo) {
    log('Failed to find adb for platform', 'adb', LogLevel.ERROR)
    throw new Error('adb_platform_not_found')
  }
  const { url, cmd } = adbInfo
  const userDataPath = app.getPath('userData')
  const platformToolsPath = path.join(userDataPath, 'platform-tools')
  const adbPath = path.join(platformToolsPath, cmd)

  if (fs.existsSync(adbPath)) return `"${adbPath}"`

  log('Downloading ADB...', 'adb')

  const downloadPath = path.join(
    app.getPath('temp'),
    'platform-tools-glancething-temp.zip'
  )

  if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath)

  const download = await axios.get(url, {
    responseType: 'stream',
    validateStatus: () => true
  })

  if (download.status !== 200) {
    log('Failed to download adb', 'adb', LogLevel.ERROR)
    throw new Error('adb_download_failed')
  }

  const writer = fs.createWriteStream(downloadPath)

  download.data.pipe(writer)

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })

  log('Downloaded ADB!', 'adb')

  const unzipCommand = buildUnzipCommand(downloadPath, userDataPath)
  if (!unzipCommand) {
    log('Failed to find unzip command for platform', 'adb', LogLevel.ERROR)
    throw new Error('adb_platform_not_found')
  }

  const extract = await execAsync(unzipCommand)

  if (extract === null) {
    log('Failed to extract adb', 'adb')
    throw new Error('adb_extract_failed')
  }

  log('Extracted ADB!', 'adb')

  return `"${adbPath}"`
}

let staleDevicePolls = 0

// Fully restart the adb server. kill-server alone sometimes isn't enough —
// a wedged adb.exe (e.g. left over from before an update) can survive it,
// so on Windows we force-kill the process as a verified last resort.
// Restarts are coalesced (concurrent callers share one restart) and wait
// for in-flight device operations (installs, forwards) to finish first.
let restartPromise: Promise<void> | null = null

export function restartAdbServer(): Promise<void> {
  if (restartPromise) return restartPromise

  restartPromise = (async () => {
    // Give in-flight installs/forwards a chance to finish before killing
    // the server out from under them
    const deadline = Date.now() + 15000
    while (activeDeviceOperations > 0 && Date.now() < deadline)
      await new Promise(r => setTimeout(r, 250))

    const adb = await getAdbExecutable()

    log('Restarting ADB server...', 'adb', LogLevel.WARN)
    const killedCleanly = await execAsync(`${adb} kill-server`)
      .then(() => true)
      .catch(() => false)

    if (platform() === 'win32') {
      // Only force-kill if adb.exe is verifiably still running — a stale
      // server from another install location won't respond to kill-server
      const stillRunning = await execAsync(
        'tasklist /FI "IMAGENAME eq adb.exe" /NH'
      )
        .then(out => out.toLowerCase().includes('adb.exe'))
        .catch(() => false)

      if (!killedCleanly || stillRunning) {
        log('adb.exe still running, force-killing', 'adb', LogLevel.WARN)
        await execAsync('taskkill /F /IM adb.exe /T').catch(() => null)
      }
    }

    // Let start failures propagate so callers can surface the error
    await execAsync(`${adb} start-server`)
    staleDevicePolls = 0
    log('ADB server restarted', 'adb')
  })().finally(() => {
    restartPromise = null
  })

  return restartPromise
}

// Tracks in-flight device operations (install, socket forward) so the
// stale-device recovery never kills the adb server mid-operation.
let activeDeviceOperations = 0

export async function withDeviceOperation<T>(fn: () => Promise<T>) {
  activeDeviceOperations++
  try {
    return await fn()
  } finally {
    activeDeviceOperations--
  }
}

async function getDevices() {
  const adb = await getAdbExecutable()
  const res = await execAsync(`${adb} devices`)

  const lines = res.split('\n').filter(line => line.includes('\t'))

  const devices = lines
    .filter(line => line.includes('\tdevice'))
    .map(line => line.split('\t')[0])

  // Devices stuck in 'offline' or 'unauthorized' state — common right
  // after PC boot, when the CarThing was already plugged in before the
  // adb server started. Without recovery, only unplug/replug fixes it.
  const stale = lines.filter(
    line => line.includes('\toffline') || line.includes('\tunauthorized')
  )

  // Recover even when only SOME devices are stuck — with multiple
  // CarThings one can stay healthy while another is wedged (common right
  // after a client update), which previously blocked recovery entirely.
  if (stale.length > 0 && activeDeviceOperations === 0) {
    staleDevicePolls++
    log(
      `Found ${stale.length} stale adb device(s), attempting reconnect (attempt ${staleDevicePolls})`,
      'adb',
      LogLevel.WARN
    )
    if (staleDevicePolls >= 3) {
      // Reconnect alone didn't help — restart the adb server entirely
      await restartAdbServer()
    } else {
      await execAsync(`${adb} reconnect offline`).catch(() => null)
    }
  } else {
    staleDevicePolls = 0
  }

  return devices
}

async function checkValidDevice(device: string) {
  const adb = await getAdbExecutable()
  const res = await execAsync(
    `${adb} -s ${device} shell ls /usr/share/qt-superbird-app/webapp/`
  )

  return !res.includes('No such file or directory')
}

let lastFoundCount = 0

// Returns ALL connected, valid CarThing serials.
export async function findCarThings(): Promise<string[]> {
  log('Finding CarThings...', 'adb', LogLevel.DEBUG)
  const logLevel = getLogLevel()
  const devices = await getDevices()

  const found: string[] = []
  for (const device of devices) {
    if (await checkValidDevice(device)) found.push(device)
  }

  if (logLevel === LogLevel.DEBUG) {
    log(
      found.length > 0
        ? `Found CarThing(s): ${found.join(', ')}`
        : 'No valid CarThing found',
      'adb',
      LogLevel.DEBUG
    )
  } else if (found.length !== lastFoundCount) {
    if (found.length > lastFoundCount)
      log(`Found CarThing(s): ${found.join(', ')}`, 'adb')
    else if (found.length === 0)
      log('CarThing no longer found', 'adb', LogLevel.WARN)
    else log(`A CarThing disconnected, ${found.length} remaining`, 'adb', LogLevel.WARN)
    lastFoundCount = found.length
  }

  return found
}

// Back-compat: first valid CarThing (or null)
export async function findCarThing() {
  const devices = await findCarThings()
  return devices[0] ?? null
}

async function restartChromium(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  log('Restarting Chromium...', 'adb', LogLevel.DEBUG)
  await execAsync(
    `${adb} -s ${device} shell "supervisorctl restart chromium"`
  )
  log('Restarted Chromium!', 'adb', LogLevel.DEBUG)
}

export async function setAutoBrightness(
  device: string | null,
  enabled: boolean
) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  log(
    `Turning ${enabled ? 'on' : 'off'} auto brightness...`,
    'adb',
    LogLevel.DEBUG
  )
  await execAsync(
    `${adb} -s ${device} shell "supervisorctl ${enabled ? 'start' : 'stop'} backlight"`
  )
}

export async function getAutoBrightness(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  log('Getting auto brightness...', 'adb', LogLevel.DEBUG)
  const res = await execAsync(
    `${adb} -s ${device} shell "supervisorctl status backlight"`
  )

  return res.includes('RUNNING')
}

function parseBrightness(brightness: string) {
  return 1 - parseInt(brightness) / 255
}

function formatBrightness(brightness: number) {
  return 255 - Math.round(brightness * 255)
}

export async function getBrightness(device: string | null, parse = true) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  const res = await execAsync(
    `${adb} -s ${device} shell "cat /sys/devices/platform/backlight/backlight/aml-bl/brightness"`
  )

  return parse ? parseBrightness(res) : parseInt(res)
}

export async function setBrightness(
  device: string | null,
  brightness: number
) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  const formatted = formatBrightness(brightness)

  await execAsync(
    `${adb} -s ${device} shell "echo ${formatted} > /sys/devices/platform/backlight/backlight/aml-bl/brightness"`
  )
}

export async function setBrightnessSmooth(
  device: string | null,
  brightness: number,
  steps = 10
) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  log('Setting brightness smoothly...', 'adb', LogLevel.DEBUG)
  const currentValue = await getBrightness(device, false)
  const targetValue = Math.max(formatBrightness(brightness), 1)

  for (let i = 1; i <= steps; i++) {
    const value = Math.round(
      currentValue + (targetValue - currentValue) * (i / steps)
    )

    await execAsync(
      `${adb} -s ${device} shell "echo ${value} > /sys/devices/platform/backlight/backlight/aml-bl/brightness"`
    )
  }
}

export async function restore(device: string | null, restart = true) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  log('Restoring original app...', 'adb', LogLevel.DEBUG)
  await execAsync(
    `${adb} -s ${device} shell "mountpoint /usr/share/qt-superbird-app/webapp/ > /dev/null && umount /usr/share/qt-superbird-app/webapp"`
  )
  await execAsync(`${adb} -s ${device} shell "rm -rf /tmp/webapp"`)
  log('Restored original app!', 'adb', LogLevel.DEBUG)
  if (restart) await restartChromium(device)
}

export async function rebootCarThing(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  log('Reboot...', 'adb', LogLevel.DEBUG)
  await execAsync(`${adb} -s ${device} shell "reboot"`)
}

export async function installApp(device: string | null) {
  return withDeviceOperation(() => installAppInner(device))
}

async function installAppInner(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const appDir = await getWebAppDir()

  const WS_PASSWORD = getSocketPassword()

  await restore(device, false)

  const adb = await getAdbExecutable()

  log('Installing app...', 'adb')
  await execAsync(`${adb} -s ${device} push ${appDir} /tmp/webapp`)
  await execAsync(
    `${adb} -s ${device} shell "echo ${WS_PASSWORD} > /tmp/webapp/ws-password"`
  )
  await execAsync(
    `${adb} -s ${device} shell "touch /tmp/webapp/.glancething"`
  )
  // Give the client its own serial so it can identify itself to the
  // desktop app (used for per-device profiles)
  await execAsync(
    `${adb} -s ${device} shell "echo ${device} > /tmp/webapp/device-serial"`
  )
  await execAsync(
    `${adb} -s ${device} shell "mount --bind /tmp/webapp /usr/share/qt-superbird-app/webapp"`
  )
  await restartChromium(device)
  log('Installed app!', 'adb')
}

export async function checkInstalledApp(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  const res = await execAsync(
    `${adb} -s ${device} shell ls /usr/share/qt-superbird-app/webapp/.glancething`
  )

  return !res.includes('No such file or directory')
}

export async function forwardSocketServer(device: string | null) {
  return withDeviceOperation(() => forwardSocketServerInner(device))
}

async function forwardSocketServerInner(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  const info = serverManager.getServerInfo()
  if (!info.port) return

  await execAsync(`${adb} -s ${device} reverse tcp:1337 tcp:${info.port}`)

  log('Forwarded socket server!', 'adb', LogLevel.DEBUG)
}
