import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'orientation'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'orientation',
      data: (() => {
        const value = getStorageValue('orientation')
        return value === 'portrait-right' || value === 'portrait-left'
          ? value
          : 'landscape'
      })()
    })
  )
}
