import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'defaultview'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'defaultview',
      data:
        getStorageValue('defaultView') === 'shortcuts'
          ? 'shortcuts'
          : 'nowplaying'
    })
  )
}
