import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'backbutton'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const value = getStorageValue('backButton')
  ws.send(
    JSON.stringify({
      type: 'backbutton',
      data: value === 'library' ? 'library' : 'shortcuts'
    })
  )
}
