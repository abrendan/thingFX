import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'screensaverstyle'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'screensaverstyle',
      data: getStorageValue('screensaverStyle') ?? 'bubbles'
    })
  )
}
