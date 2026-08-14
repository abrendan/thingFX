import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { resolveDeviceSetting } from '../devices.js'

export const name = 'backbutton'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const value = resolveDeviceSetting(ws.deviceSerial, 'backButton')
  ws.send(
    JSON.stringify({
      type: 'backbutton',
      data: value === 'library' ? 'library' : 'shortcuts'
    })
  )
}
