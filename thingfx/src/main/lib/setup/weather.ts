import cron from 'node-cron'
import { fetchAndBroadcastWeather } from '../weather.js'
import { SetupFunction } from '../../types/WebSocketSetup.js'

export const name = 'weather'

export const setup: SetupFunction = async () => {
  fetchAndBroadcastWeather()

  const job = cron.schedule('*/15 * * * *', fetchAndBroadcastWeather)

  return async () => {
    job.stop()
  }
}
