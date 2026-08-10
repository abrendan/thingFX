import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'shutdownshortcut'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'shutdownshortcut',
      data: getStorageValue('showShutdownShortcut') === true
    })
  )
}
