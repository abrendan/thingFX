import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'wheelmode'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'wheelmode',
      data: getStorageValue('wheelMode') === 'scrub' ? 'scrub' : 'volume'
    })
  )
}
