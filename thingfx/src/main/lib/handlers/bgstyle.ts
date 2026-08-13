import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { resolveDeviceSetting } from '../devices.js'

export const name = 'bgstyle'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'bgstyle',
      data: resolveDeviceSetting(ws.deviceSerial, 'bgStyle') ?? 'full'
    })
  )
}
