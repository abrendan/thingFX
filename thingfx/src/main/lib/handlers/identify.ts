import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { isKnownDevice, pushDeviceSettings } from '../devices.js'
import { log, LogLevel } from '../utils.js'

export const name = 'identify'

export const hasActions = false

// The client reads its own ADB serial (pushed at install time) and
// identifies itself so the desktop app can apply per-device profiles.
// Only serials that ADB discovery has actually verified are accepted —
// profiles are created by discovery (carThingStateUpdate), never by
// this message, so a client can't invent or pollute profiles.
export const handle: HandlerFunction = async (ws, data) => {
  const serial = typeof data === 'string' ? data.trim() : ''
  if (!/^[A-Za-z0-9._:-]{1,64}$/.test(serial)) return

  if (!isKnownDevice(serial)) {
    log(
      `Rejected identify for unknown serial ${serial}`,
      'WebSocketServer',
      LogLevel.WARN
    )
    return
  }

  ws.deviceSerial = serial
  log(`Client identified as device ${serial}`, 'WebSocketServer', LogLevel.DEBUG)

  // Re-send settings that may have device overrides
  pushDeviceSettings(ws)
}
