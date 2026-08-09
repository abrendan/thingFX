import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'visualizersize'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const value = getStorageValue('visualizerSize')
  ws.send(
    JSON.stringify({
      type: 'visualizersize',
      data: value === 'large' || value === 'xl' ? value : 'normal'
    })
  )
}
