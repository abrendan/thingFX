import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'sleeptimer'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'sleeptimer',
      data: getStorageValue('sleepTimer') ?? '300'
    })
  )
}
