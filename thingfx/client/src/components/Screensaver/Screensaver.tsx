import React, { useCallback, useContext, useEffect, useState } from 'react'

import { SleepState } from '@/contexts/SleepContext.tsx'
import { SocketContext } from '@/contexts/SocketContext.tsx'
export type ScreensaverType = 'bubbles' | 'clock'

import styles from './Screensaver.module.css'


interface ScreensaverProps {
  type: SleepState
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

const Screensaver: React.FC<ScreensaverProps> = ({ type }) => {
  const { ready, socket } = useContext(SocketContext)
  const [loaded, setLoaded] = useState(false)
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [screensaverType, setScreensaverType] = useState<ScreensaverType>(() =>
    (localStorage.getItem('lumi_screensaver_type') as ScreensaverType) ?? 'bubbles'
  )
  const [serverClock, setServerClock] = useState<{ time: string; date: string } | null>(null)
  const [weather, setWeather] = useState<{ temp: number; unit: 'F' | 'C'; icon: string; condition: string; city: string } | null>(null)

  const validateImage = useCallback(
    (imageUrl: string): Promise<boolean> => {
      return new Promise(resolve => {
        if (!imageUrl || !imageUrl.startsWith('data:image/')) {
          resolve(false)
          return
        }

        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = imageUrl
      })
    },
    []
  )

  useEffect(() => {
    const loadCachedImage = async () => {
      try {
        const cachedImage = localStorage.getItem('cachedScreensaverImage')
        if (cachedImage) {
          const isValid = await validateImage(cachedImage)
          if (isValid) {
            setCustomImage(cachedImage)
          } else {
            localStorage.removeItem('cachedScreensaverImage')
          }
        }
      } catch {
        localStorage.removeItem('cachedScreensaverImage')
      }
    }

    loadCachedImage()
  }, [validateImage])

  const requestImage = useCallback(() => {
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'screensaver',
          action: 'getImage'
        })
      )
    }
  }, [socket])

  useEffect(() => {
    if (!ready || !socket) return

    const listener = (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      if (data.type === 'time') {
        setServerClock(data.data)
        return
      }
      if (data.type === 'weather') {
        setWeather(data.data)
        return
      }
      if (data.type !== 'screensaver') return

      switch (data.action) {
        case 'image':
          validateImage(data.data.image).then(isValid => {
            if (isValid) {
              setCustomImage(data.data.image)
              if (
                data.data.image &&
                data.data.image.length < MAX_IMAGE_SIZE
              ) {
                localStorage.setItem(
                  'cachedScreensaverImage',
                  data.data.image
                )
              }
            }
          })
          break

        case 'update':
          requestImage()
          break

        case 'removed':
          setCustomImage(null)
          localStorage.removeItem('cachedScreensaverImage')
          break
      }
    }

    socket.addEventListener('message', listener)

    requestImage()
    socket.send(JSON.stringify({ type: 'weather' }))

    const retryInterval = setInterval(() => {
      if (!customImage && socket.readyState === 1) {
        requestImage()
      }
    }, 5000)

    return () => {
      socket.removeEventListener('message', listener)
      clearInterval(retryInterval)
    }
  }, [ready, socket, customImage, requestImage, validateImage])

  useEffect(() => {
    if (type === 'screensaver') {
      setLoaded(true)
      setScreensaverType((localStorage.getItem('lumi_screensaver_type') as ScreensaverType) ?? 'bubbles')
    } else {
      setTimeout(() => {
        setLoaded(false)
      }, 500)
    }
  }, [type])


  return (
    <div className={styles.screensaver} data-active={type !== 'off'}>
      {loaded && (
        <>
          {customImage ? (
            <div
              className={styles.customImage}
              style={{ backgroundImage: `url(${customImage})` }}
            ></div>
          ) : screensaverType === 'clock' ? (
            <div className={styles.clockDisplay}>
              <span className={styles.clockTime}>{serverClock?.time ?? '—'}</span>
              <div className={styles.clockDivider} />
              <span className={styles.clockDate}>{serverClock?.date ?? ''}</span>
              {weather && (
                <span className={styles.clockWeather}>
                  <span className={`material-icons ${styles.clockWeatherIcon}`}>{weather.icon}</span>
                  {Math.round(weather.temp)}°{weather.unit} · {weather.condition}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className={styles.circle1}></div>
              <div className={styles.circle2}></div>
              <div className={styles.circle3}></div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Screensaver
