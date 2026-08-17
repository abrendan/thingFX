import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { normalizeScreensaverStyle, resolveDeviceSetting } from '../devices.js'

export const name = 'screensaverstyle'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const style = resolveDeviceSetting(ws.deviceSerial, 'screensaverStyle')
  ws.send(
    JSON.stringify({
      type: 'screensaverstyle',
      data: normalizeScreensaverStyle(style)
    })
  )
}
