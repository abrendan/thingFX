import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { resolveDeviceSetting } from '../devices.js'

export const name = 'sleeptimer'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const timer = resolveDeviceSetting(ws.deviceSerial, 'sleepTimer')
  ws.send(
    JSON.stringify({
      type: 'sleeptimer',
      data: typeof timer === 'string' ? timer : '300'
    })
  )
}
