import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'volumesource'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'volumesource',
      data: getStorageValue('volumeSource') === 'system' ? 'system' : 'player'
    })
  )
}
