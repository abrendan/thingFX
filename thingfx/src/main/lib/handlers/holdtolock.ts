import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'holdtolock'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'holdtolock',
      data: getStorageValue('holdToLock') === true
    })
  )
}
