import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { resolveDeviceSetting } from '../devices.js'

export const name = 'defaultview'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'defaultview',
      data:
        resolveDeviceSetting(ws.deviceSerial, 'defaultView') === 'shortcuts'
          ? 'shortcuts'
          : 'nowplaying'
    })
  )
}
