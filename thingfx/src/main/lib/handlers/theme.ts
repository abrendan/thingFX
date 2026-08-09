import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getStorageValue } from '../storage.js'

export const name = 'theme'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'theme',
      data: (() => {
        const value = getStorageValue('clientTheme')
        return value === 'light' || value === 'glassy' || value === 'aero'
          ? value
          : 'dark'
      })()
    })
  )
}
