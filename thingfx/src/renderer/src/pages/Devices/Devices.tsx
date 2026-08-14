import React, { useEffect, useRef, useState } from 'react'

import styles from './Devices.module.css'

interface DeviceInfo {
  serial: string
  name: string
  state: 'not_installed' | 'installing' | 'ready' | 'disconnected'
  firstSeen?: number
  lastSeen?: number
  overrides: Record<string, string | undefined>
}

const stateConfig: Record<
  DeviceInfo['state'],
  { label: string; color: string }
> = {
  ready: { label: 'Connected', color: '#4caf7d' },
  installing: { label: 'Installing…', color: '#e6b455' },
  not_installed: { label: 'Not installed', color: '#e6b455' },
  disconnected: { label: 'Disconnected', color: 'rgba(128,128,128,0.8)' }
}

// Per-device overridable settings and their choices. The empty value
// means "use the global setting from the Settings page".
const overrideFields: {
  key: string
  label: string
  options: { value: string; label: string }[]
}[] = [
  {
    key: 'defaultView',
    label: 'Main screen',
    options: [
      { value: 'nowplaying', label: 'Now Playing' },
      { value: 'shortcuts', label: 'App Launcher' }
    ]
  },
  {
    key: 'wheelMode',
    label: 'Wheel behavior',
    options: [
      { value: 'volume', label: 'Volume (player)' },
      { value: 'volume-native', label: 'Volume (system)' },
      { value: 'scrub', label: 'Scrub through song' }
    ]
  },
  {
    key: 'sleepTimer',
    label: 'Sleep timer',
    options: [
      { value: '0', label: 'Off' },
      { value: '60', label: '1 minute' },
      { value: '300', label: '5 minutes' },
      { value: '600', label: '10 minutes' }
    ]
  },
  {
    key: 'backButton',
    label: 'Back button opens',
    options: [
      { value: 'shortcuts', label: 'App launcher' },
      { value: 'library', label: 'Library' }
    ]
  },
  {
    key: 'clientTheme',
    label: 'Theme',
    options: [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'glassy', label: 'Glassy' },
      { value: 'aero', label: 'Aero' }
    ]
  },
  {
    key: 'bgStyle',
    label: 'Player background',
    options: [
      { value: 'full', label: 'Full cover' },
      { value: 'solid', label: 'Solid color' },
      { value: 'thumbnail', label: 'Thumbnail (small)' },
      { value: 'thumbnail-blur', label: 'Thumbnail (blurred bg)' },
      { value: 'thumbnail-lg', label: 'Thumbnail (large)' }
    ]
  }
]

const Devices: React.FC = () => {
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null)
  const [editingSerial, setEditingSerial] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const editingRef = useRef<string | null>(null)
  editingRef.current = editingSerial

  const refresh = async () => {
    const list = (await window.api.getDevices()) as DeviceInfo[]
    setDevices(list)
  }

  useEffect(() => {
    refresh()
    const off = window.api.on('devicesUpdated', (list: unknown) => {
      // Don't clobber the rename input while the user is typing
      if (editingRef.current) return
      setDevices(list as DeviceInfo[])
    })
    return off
  }, [])

  const saveName = async (serial: string) => {
    const name = editName.trim()
    setEditingSerial(null)
    const list = await window.api.setDeviceProfile(serial, {
      name: name || undefined
    })
    setDevices(list as DeviceInfo[])
  }

  const setOverride = async (
    serial: string,
    key: string,
    value: string
  ) => {
    const device = devices?.find(d => d.serial === serial)
    const overrides = { ...(device?.overrides ?? {}) }
    if (value === '') delete overrides[key]
    else overrides[key] = value
    const list = await window.api.setDeviceProfile(serial, { overrides })
    setDevices(list as DeviceInfo[])
  }

  const forget = async (serial: string) => {
    const list = await window.api.forgetDevice(serial)
    setDevices(list as DeviceInfo[])
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2>Devices</h2>
      </div>
      <p className={styles.pageDesc}>
        Every Car Thing that connects gets its own profile, remembered by
        its serial number. Rename them and give each one its own main
        screen, wheel behavior, theme, or background — anything left on
        "Use global setting" follows the Settings page.
      </p>

      {devices === null ? (
        <p className={styles.empty}>Loading…</p>
      ) : devices.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-icons">devices</span>
          <p>No Car Things yet</p>
          <p className={styles.hint}>
            Connect a Car Thing via USB and it will appear here.
          </p>
        </div>
      ) : (
        devices.map(device => {
          const state = stateConfig[device.state]
          return (
            <div key={device.serial} className={styles.card}>
              <div className={styles.cardHeader}>
                <span
                  className={styles.stateDot}
                  style={{ background: state.color }}
                />
                <div className={styles.titleBlock}>
                  {editingSerial === device.serial ? (
                    <input
                      className={styles.nameInput}
                      value={editName}
                      autoFocus
                      maxLength={40}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => saveName(device.serial)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveName(device.serial)
                        if (e.key === 'Escape') setEditingSerial(null)
                      }}
                    />
                  ) : (
                    <p className={styles.deviceName}>
                      {device.name}
                      <button
                        className={styles.iconBtn}
                        title="Rename"
                        onClick={() => {
                          setEditName(device.name)
                          setEditingSerial(device.serial)
                        }}
                      >
                        <span className="material-icons">edit</span>
                      </button>
                    </p>
                  )}
                  <p className={styles.deviceMeta}>
                    {state.label} · Serial {device.serial}
                    {device.state === 'disconnected' && device.lastSeen
                      ? ` · Last seen ${new Date(device.lastSeen).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className={styles.cardActions}>
                  {device.state === 'ready' && (
                    <button
                      className={styles.actionBtn}
                      onClick={() => window.api.rebootCarThing(device.serial)}
                    >
                      <span className="material-icons">restart_alt</span>
                      Reboot
                    </button>
                  )}
                  {device.state === 'disconnected' && (
                    <button
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => forget(device.serial)}
                    >
                      <span className="material-icons">delete</span>
                      Forget
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.overrides}>
                {overrideFields.map(field => (
                  <label key={field.key} className={styles.overrideRow}>
                    <span className={styles.overrideLabel}>{field.label}</span>
                    <select
                      className={styles.select}
                      value={device.overrides[field.key] ?? ''}
                      onChange={e =>
                        setOverride(device.serial, field.key, e.target.value)
                      }
                    >
                      <option value="">Use global setting</option>
                      {field.options.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export default Devices
