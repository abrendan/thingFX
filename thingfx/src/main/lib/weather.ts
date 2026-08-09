import axios from 'axios'
import { log, LogLevel } from './utils.js'
import { getStorageValue } from './storage.js'
import { serverManager } from './server.js'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'

export interface WeatherData {
  temp: number
  unit: 'F' | 'C'
  icon: string
  condition: string
  city: string
}

const WMO_MAP: Record<number, { icon: string; condition: string }> = {
  0:  { icon: 'wb_sunny',     condition: 'Clear' },
  1:  { icon: 'wb_sunny',     condition: 'Mostly Clear' },
  2:  { icon: 'cloud_queue',  condition: 'Partly Cloudy' },
  3:  { icon: 'cloud',        condition: 'Overcast' },
  45: { icon: 'blur_on',      condition: 'Foggy' },
  48: { icon: 'blur_on',      condition: 'Foggy' },
  51: { icon: 'opacity',      condition: 'Light Drizzle' },
  53: { icon: 'opacity',      condition: 'Drizzle' },
  55: { icon: 'opacity',      condition: 'Heavy Drizzle' },
  61: { icon: 'umbrella',     condition: 'Light Rain' },
  63: { icon: 'umbrella',     condition: 'Rain' },
  65: { icon: 'umbrella',     condition: 'Heavy Rain' },
  71: { icon: 'ac_unit',      condition: 'Light Snow' },
  73: { icon: 'ac_unit',      condition: 'Snow' },
  75: { icon: 'ac_unit',      condition: 'Heavy Snow' },
  77: { icon: 'ac_unit',      condition: 'Snow Grains' },
  80: { icon: 'umbrella',     condition: 'Showers' },
  81: { icon: 'umbrella',     condition: 'Showers' },
  82: { icon: 'umbrella',     condition: 'Heavy Showers' },
  85: { icon: 'ac_unit',      condition: 'Snow Showers' },
  86: { icon: 'ac_unit',      condition: 'Heavy Snow Showers' },
  95: { icon: 'flash_on',     condition: 'Thunderstorm' },
  96: { icon: 'flash_on',     condition: 'Thunderstorm' },
  99: { icon: 'flash_on',     condition: 'Thunderstorm' },
}

let cachedWeather: WeatherData | null = null

function broadcast(data: WeatherData | null) {
  const wss = serverManager.getServer()
  if (!wss) return
  wss.clients.forEach((ws: AuthenticatedWebSocket) => {
    if (ws.authenticated && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'weather', data }))
    }
  })
}

export async function fetchAndBroadcastWeather(): Promise<{ success: boolean; message: string }> {
  const city = getStorageValue('weatherCity') as string | null
  if (!city) return { success: false, message: 'No city set' }

  const unit = (getStorageValue('weatherUnit') as string) || 'fahrenheit'

  try {
    const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: city, count: 1, language: 'en', format: 'json' },
      validateStatus: () => true,
      timeout: 10000
    })

    if (geoRes.status !== 200 || !geoRes.data.results?.length) {
      log(`Could not geocode city "${city}"`, 'Weather', LogLevel.WARN)
      return { success: false, message: `City "${city}" not found` }
    }

    const { latitude, longitude } = geoRes.data.results[0]

    const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,weather_code',
        temperature_unit: unit,
        forecast_days: 1
      },
      validateStatus: () => true,
      timeout: 10000
    })

    if (weatherRes.status !== 200) {
      log('Weather fetch failed', 'Weather', LogLevel.WARN)
      return { success: false, message: 'Weather fetch failed' }
    }

    const current = weatherRes.data.current
    const code = current.weather_code as number
    const mapped = WMO_MAP[code] ?? { icon: 'wb_sunny', condition: 'Unknown' }

    cachedWeather = {
      temp: Math.round(current.temperature_2m),
      unit: unit === 'fahrenheit' ? 'F' : 'C',
      icon: mapped.icon,
      condition: mapped.condition,
      city,
    }

    log(`${cachedWeather.temp}°${cachedWeather.unit} — ${cachedWeather.condition}`, 'Weather')
    broadcast(cachedWeather)
    return { success: true, message: `${cachedWeather.temp}°${cachedWeather.unit} — ${cachedWeather.condition}` }
  } catch (err) {
    log(`Error fetching weather: ${err}`, 'Weather', LogLevel.ERROR)
    return { success: false, message: 'Network error fetching weather' }
  }
}

export function getCachedWeather(): WeatherData | null {
  return cachedWeather
}
