import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { resolveDeviceSetting } from '../devices.js'

export const name = 'theme'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const value = resolveDeviceSetting(ws.deviceSerial, 'clientTheme')
  ws.send(
    JSON.stringify({
      type: 'theme',
      data:
        value === 'light' || value === 'glassy' || value === 'aero'
          ? value
          : 'dark'
    })
  )
}
