import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { resolveDeviceSetting } from '../devices.js'

export const name = 'wheelmode'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const value = resolveDeviceSetting(ws.deviceSerial, 'wheelMode')
  ws.send(
    JSON.stringify({
      type: 'wheelmode',
      data:
        value === 'scrub' || value === 'volume-native' ? value : 'volume'
    })
  )
}
