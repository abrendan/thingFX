import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'accent'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'accent',
      data: (getStorageValue('accentColor') as string) || null
    })
  )
}
