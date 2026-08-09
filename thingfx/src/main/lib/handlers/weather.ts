import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getCachedWeather } from '../weather.js'

export const name = 'weather'
export const hasActions = false

export const handle: HandlerFunction = async ws => {
  const data = getCachedWeather()
  if (data) {
    ws.send(JSON.stringify({ type: 'weather', data }))
  }
}
