import { getStorageValue, setStorageValue } from './storage.js'
import { serverManager } from './server.js'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'

// Per-device profiles, keyed by ADB serial. A profile stores a friendly
// name plus optional overrides for settings that would otherwise be
// global. Overrides fall back to the global value when unset.

export const PER_DEVICE_KEYS = [
  'defaultView',
  'wheelMode',
  'clientTheme',
  'bgStyle'
] as const

export type PerDeviceKey = (typeof PER_DEVICE_KEYS)[number]

export interface DeviceProfile {
  name?: string
  firstSeen?: number
  lastSeen?: number
  overrides?: Partial<Record<PerDeviceKey, string>>
}

export type DeviceState =
  | 'not_installed'
  | 'installing'
  | 'ready'
  | 'disconnected'

// Live connection state, kept in memory by the state poller
const deviceStates = new Map<string, Exclude<DeviceState, 'disconnected'>>()

export function getDeviceProfiles(): Record<string, DeviceProfile> {
  const profiles = getStorageValue('deviceProfiles')
  return profiles && typeof profiles === 'object'
    ? (profiles as Record<string, DeviceProfile>)
    : {}
}

export function updateDeviceProfile(
  serial: string,
  patch: Partial<DeviceProfile>
) {
  const profiles = getDeviceProfiles()
  const prev = profiles[serial] ?? {}
  const next: DeviceProfile = {
    ...prev,
    ...patch,
    overrides:
      patch.overrides !== undefined
        ? patch.overrides
        : prev.overrides
  }
  setStorageValue('deviceProfiles', { ...profiles, [serial]: next })
}

export function removeDeviceProfile(serial: string) {
  const profiles = getDeviceProfiles()
  if (!(serial in profiles)) return
  const next = { ...profiles }
  delete next[serial]
  setStorageValue('deviceProfiles', next)
}

// Ensure a profile exists for a connected device
export function registerDevice(serial: string) {
  const profiles = getDeviceProfiles()
  const prev = profiles[serial]
  updateDeviceProfile(serial, {
    firstSeen: prev?.firstSeen ?? Date.now(),
    lastSeen: Date.now()
  })
}

// A serial is "known" only if ADB discovery has seen it (connected now)
// or it already has a profile created by discovery. Used to reject
// identify claims for serials we've never verified over ADB.
export function isKnownDevice(serial: string) {
  return deviceStates.has(serial) || serial in getDeviceProfiles()
}

export function setDeviceState(
  serial: string,
  state: Exclude<DeviceState, 'disconnected'>
) {
  deviceStates.set(serial, state)
}

export function syncConnectedDevices(connected: string[]) {
  for (const serial of [...deviceStates.keys()])
    if (!connected.includes(serial)) deviceStates.delete(serial)
}

export interface DeviceInfo {
  serial: string
  name: string
  state: DeviceState
  firstSeen?: number
  lastSeen?: number
  overrides: Partial<Record<PerDeviceKey, string>>
}

export function getDeviceList(): DeviceInfo[] {
  const profiles = getDeviceProfiles()
  const serials = new Set([...Object.keys(profiles), ...deviceStates.keys()])

  const list: DeviceInfo[] = []
  for (const serial of serials) {
    const profile = profiles[serial] ?? {}
    list.push({
      serial,
      name: profile.name || defaultDeviceName(serial),
      state: deviceStates.get(serial) ?? 'disconnected',
      firstSeen: profile.firstSeen,
      lastSeen: profile.lastSeen,
      overrides: profile.overrides ?? {}
    })
  }

  // Connected first, then most recently seen
  const order: Record<DeviceState, number> = {
    ready: 0,
    installing: 1,
    not_installed: 2,
    disconnected: 3
  }
  list.sort(
    (a, b) =>
      order[a.state] - order[b.state] || (b.lastSeen ?? 0) - (a.lastSeen ?? 0)
  )
  return list
}

function defaultDeviceName(serial: string) {
  return `Car Thing (${serial.slice(-4) || serial})`
}

// Resolve a per-device setting: device override first, then global.
export function resolveDeviceSetting(
  serial: string | undefined,
  key: PerDeviceKey
): unknown {
  if (serial) {
    const override = getDeviceProfiles()[serial]?.overrides?.[key]
    if (override !== undefined && override !== null && override !== '')
      return override
  }
  return getStorageValue(key)
}

export function deviceHasOverride(
  serial: string | undefined,
  key: PerDeviceKey
) {
  if (!serial) return false
  const override = getDeviceProfiles()[serial]?.overrides?.[key]
  return override !== undefined && override !== null && override !== ''
}

// Send a message to every socket belonging to a given device serial.
// Sockets that never identified (older clients) count as serial undefined.
export function sendToDevice(
  serial: string | undefined,
  type: string,
  data: unknown
) {
  const wss = serverManager.getServer()
  if (!wss) return
  const msg = JSON.stringify({ type, data })
  wss.clients.forEach(client => {
    const ws = client as AuthenticatedWebSocket
    if (
      ws.authenticated &&
      ws.readyState === WebSocket.OPEN &&
      ws.deviceSerial === serial
    )
      ws.send(msg)
  })
}

// Broadcast a per-device-capable setting: sockets with an override for
// this key keep their override; everyone else gets the new global value.
export function broadcastPerDeviceSetting(
  key: PerDeviceKey,
  type: string,
  normalize: (value: unknown) => unknown
) {
  const wss = serverManager.getServer()
  if (!wss) return
  wss.clients.forEach(client => {
    const ws = client as AuthenticatedWebSocket
    if (!ws.authenticated || ws.readyState !== WebSocket.OPEN) return
    if (deviceHasOverride(ws.deviceSerial, key)) return
    ws.send(
      JSON.stringify({ type, data: normalize(getStorageValue(key)) })
    )
  })
}

// Push all per-device-resolved settings to one socket (used right after
// a socket identifies itself, and after profile overrides change).
export function pushDeviceSettings(ws: AuthenticatedWebSocket) {
  const serial = ws.deviceSerial
  const send = (type: string, data: unknown) =>
    ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type, data }))

  send(
    'defaultview',
    resolveDeviceSetting(serial, 'defaultView') === 'shortcuts'
      ? 'shortcuts'
      : 'nowplaying'
  )
  const wheel = resolveDeviceSetting(serial, 'wheelMode')
  send(
    'wheelmode',
    wheel === 'scrub' || wheel === 'volume-native' ? wheel : 'volume'
  )
  const theme = resolveDeviceSetting(serial, 'clientTheme')
  send(
    'theme',
    theme === 'light' || theme === 'glassy' || theme === 'aero'
      ? theme
      : 'dark'
  )
  send('bgstyle', resolveDeviceSetting(serial, 'bgStyle') ?? 'full')
}

// After a profile change, re-push resolved settings to that device's
// live sockets so changes apply immediately.
export function refreshDeviceSettings(serial: string) {
  const wss = serverManager.getServer()
  if (!wss) return
  wss.clients.forEach(client => {
    const ws = client as AuthenticatedWebSocket
    if (
      ws.authenticated &&
      ws.readyState === WebSocket.OPEN &&
      ws.deviceSerial === serial
    )
      pushDeviceSettings(ws)
  })
}
