import React, { useContext, useEffect, useState } from 'react'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import styles from './TopBar.module.css'

interface WeatherInfo {
  temp: number
  unit: 'F' | 'C'
  icon: string
  condition: string
}

interface TopBarProps {
  clockFormat: '12h' | '24h'
  serverTime: { time: string; date: string } | null
  mediaPlayerActive?: boolean
  weather?: WeatherInfo | null
  /** Hide the volume % readout (e.g. when large album art overlaps it) */
  hideVolume?: boolean
  /** When set, show this system volume % instead of the player volume */
  sysVolume?: number | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatClock(now: Date, clockFormat: '12h' | '24h') {
  if (clockFormat === '12h') {
    let h = now.getHours()
    const m = now.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
  } else {
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }
}

function formatDate(now: Date) {
  return `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`
}

const TopBar: React.FC<TopBarProps> = ({ clockFormat, serverTime, mediaPlayerActive, weather, hideVolume, sysVolume }) => {
  const { playerData } = useContext(MediaContext)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const displayTime = serverTime?.time ?? formatClock(now, clockFormat)
  const displayDate = serverTime?.date ?? formatDate(now)

  if (mediaPlayerActive) {
    return (
      <div className={styles.bar} data-media-active="true">
        <div className={styles.leftCol}>
          <span className={styles.date}>{displayDate}</span>
          {weather && (
            <div className={styles.weather}>
              <span className={`material-icons ${styles.weatherIcon}`}>{weather.icon}</span>
              <span className={styles.weatherTemp}>{weather.temp}°{weather.unit}</span>
            </div>
          )}
        </div>
        <span className={styles.clock}>{displayTime}</span>
        <div className={styles.rightCol}>
          {playerData && !hideVolume && (() => {
            const volume = sysVolume != null ? sysVolume : playerData.volume
            return (
              <div className={styles.volIndicator} data-maxed={volume >= 100}>
                <span className="material-icons">
                  {volume === 0 ? 'volume_off' : volume < 50 ? 'volume_down' : 'volume_up'}
                </span>
                {Math.round(volume)}%
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      {/* Left: weather */}
      <div className={styles.leftCol}>
        {weather && (
          <div className={styles.weather}>
            <span className={`material-icons ${styles.weatherIcon}`}>{weather.icon}</span>
            <span className={styles.weatherTemp}>{weather.temp}°{weather.unit}</span>
          </div>
        )}
      </div>
      {/* Center: clock */}
      <span className={styles.clock}>{displayTime}</span>
      {/* Right: date */}
      <div className={styles.rightCol}>
        <span className={styles.date}>{displayDate}</span>
      </div>
    </div>
  )
}

export default TopBar
