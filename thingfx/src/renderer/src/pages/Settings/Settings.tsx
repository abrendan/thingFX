import React, { useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { DevModeContext } from '@/contexts/DevModeContext.js'

import Loader from '@/components/Loader/Loader.js'
import Switch from '@/components/Switch/Switch.js'

import styles from './Settings.module.css'

import icon from '@/assets/icon.png'
import iconNightly from '@/assets/icon-nightly.png'
import abrendanLogo from '@/assets/abrendan.png'
import vortexxPfp from '@/assets/vortexx.png'
import { useNavigate } from 'react-router-dom'
import { ChannelContext } from '@/contexts/ChannelContext.js'

enum Tab {
  General,
  Client,
  Appearance,
  Startup,
  Buttons,
  Advanced,
  Logs,
  About
}

const TAB_PARAM: Record<string, Tab> = {
  general: Tab.General,
  client: Tab.Client,
  appearance: Tab.Appearance,
  startup: Tab.Startup,
  buttons: Tab.Buttons,
  advanced: Tab.Advanced,
  logs: Tab.Logs,
  about: Tab.About
}

const Settings: React.FC = () => {
  const { devMode } = useContext(DevModeContext)
  const location = useLocation()

  const [currentTab, setCurrentTab] = useState<Tab>(() => {
    const param = new URLSearchParams(location.search).get('tab')
    return TAB_PARAM[param ?? ''] ?? Tab.General
  })

  return (
    <div className={styles.settingsPage}>
      <h2 className={styles.pageTitle}>Settings</h2>
      <div className={styles.content}>
          <div className={styles.tabs}>
            <button
              onClick={() => setCurrentTab(Tab.General)}
              data-active={currentTab === Tab.General}
            >
              <span className="material-icons">settings</span>
              General
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Client)}
              data-active={currentTab === Tab.Client}
            >
              <span className="material-icons">devices</span>
              Client
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Appearance)}
              data-active={currentTab === Tab.Appearance}
            >
              <span className="material-icons">palette</span>
              Theme
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Startup)}
              data-active={currentTab === Tab.Startup}
            >
              <span className="material-icons">security</span>
              Startup
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Advanced)}
              data-active={currentTab === Tab.Advanced}
            >
              <span className="material-icons">code</span>
              Advanced
            </button>
            {devMode && (
              <button
                onClick={() => setCurrentTab(Tab.Logs)}
                data-active={currentTab === Tab.Logs}
              >
                <span className="material-icons">description</span>
                Logs
              </button>
            )}
            <button
              onClick={() => setCurrentTab(Tab.Buttons)}
              data-active={currentTab === Tab.Buttons}
            >
              <span className="material-icons">developer_board</span>
              Buttons
            </button>
            <button
              onClick={() => setCurrentTab(Tab.About)}
              data-active={currentTab === Tab.About}
            >
              <span className="material-icons">info</span>
              About
            </button>
          </div>
          <div className={styles.tab}>
            {currentTab === Tab.General ? (
              <GeneralTab />
            ) : currentTab === Tab.Client ? (
              <ClientTab />
            ) : currentTab === Tab.Appearance ? (
              <AppearanceTab />
            ) : currentTab === Tab.Startup ? (
              <StartupTab />
            ) : currentTab === Tab.Advanced ? (
              <AdvancedTab />
            ) : currentTab === Tab.Logs ? (
              <LogsTab />
            ) : currentTab === Tab.Buttons ? (
              <ButtonsTab />
            ) : currentTab === Tab.About ? (
              <AboutTab />
            ) : null}
          </div>
        </div>
    </div>
  )
}

const ToggleSetting: React.FC<{
  label: string
  description?: string
  defaultValue?: boolean
  value?: boolean
  onChange: (value: boolean) => void
}> = ({ label, description, defaultValue, value, onChange }) => {
  return (
    <div className={styles.toggleSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <Switch
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}

const ColorSetting: React.FC<{
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
}> = ({ label, description, value, onChange }) => {
  return (
    <div className={styles.toggleSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '48px',
          height: '32px',
          border: 'none',
          borderRadius: '6px',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0
        }}
      />
    </div>
  )
}

const ButtonSetting: React.FC<{
  label: string
  description?: string
  onClick: () => void
}> = ({ label, description, onClick }) => {
  return (
    <div className={styles.buttonSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <button onClick={onClick}>
        <span className="material-icons">arrow_forward</span>
      </button>
    </div>
  )
}

const SelectSetting: React.FC<{
  label: string
  description?: string
  defaultValue?: string | number
  value?: string | number
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
}> = ({ label, description, defaultValue, value, options, onChange }) => {
  return (
    <div className={styles.selectSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <select
        defaultValue={defaultValue}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const SliderSetting: React.FC<{
  label: string
  description?: string
  disabled?: boolean
  defaultValue?: number
  value?: number
  min: number
  max: number
  step: number
  onChange?: (value: number) => void
  onRelease?: (value: number) => void
}> = ({
  label,
  description,
  disabled,
  defaultValue,
  value,
  min,
  max,
  step,
  onChange,
  onRelease
}) => {
  return (
    <div className={styles.sliderSetting} data-disabled={disabled}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <input
        type="range"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={
          onChange ? e => onChange(Number(e.target.value)) : undefined
        }
        onMouseUp={
          onRelease
            ? e => onRelease(Number(e.currentTarget.value))
            : undefined
        }
      />
    </div>
  )
}

const InputSubmitSetting: React.FC<{
  label: string
  description?: string
  disabled?: boolean
  defaultValue?: string
  placeholder?: string
  regex?: RegExp
  onSubmit: (value: string) => void
  clearOnSubmit?: boolean
  submitLabel: string
}> = ({
  label,
  description,
  disabled,
  defaultValue,
  placeholder,
  regex,
  onSubmit,
  clearOnSubmit,
  submitLabel
}) => {
  const [value, setValue] = useState(defaultValue ?? '')

  function submit() {
    if (disabled) return
    onSubmit(value.trim())
    if (clearOnSubmit) setValue('')
  }

  return (
    <div className={styles.inputWithSubmitSetting}>
      <div className={styles.title}>
        <p>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.form}>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onKeyDown={e => {
            const controlKeys = [
              'Backspace',
              'ArrowUp',
              'ArrowDown',
              'ArrowLeft',
              'ArrowRight',
              'Delete'
            ]

            if (
              regex &&
              !regex.test(e.key) &&
              !controlKeys.includes(e.key)
            )
              e.preventDefault()
            else if (e.key === 'Enter') submit()
          }}
          onChange={e => setValue(e.target.value)}
        />
        <button disabled={disabled} onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

const GeneralTab: React.FC = () => {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  const settings = useRef<{
    installAutomatically?: boolean
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        installAutomatically:
          (await window.api.getStorageValue('installAutomatically')) ===
          true
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <ToggleSetting
          label="Install Automatically"
          description="Automatically installs the web app to the CarThing when it is connected."
          defaultValue={settings.current.installAutomatically ?? false}
          onChange={value =>
            window.api.setStorageValue('installAutomatically', value)
          }
        />
        <ButtonSetting
          label="Playback Setup"
          description="Run the playback setup again to change how playback is handled."
          onClick={() => navigate('/setup?step=3')}
        />
      </div>
    )
  )
}

const ClientTab: React.FC = () => {
  const [loaded, setLoaded] = useState(false)
  const [hasCustomImage, setHasCustomImage] = useState(false)
  const [screensaverStatus, setScreensaverStatus] = useState<{
    message: string
    status: 'error' | 'success'
  } | null>(null)
  const settings = useRef<{
    timeFormat?: string
    dateFormat?: string
    autoBrightness?: boolean
    brightness?: number
    sleepMethod?: string
    weatherCity?: string
    weatherUnit?: string
  }>({})

  const [autoBrightness, setAutoBrightness] = useState(false)
  const [sleepMethod, setSleepMethod] = useState('sleep')
  const [weatherStatus, setWeatherStatus] = useState<{
    message: string
    status: 'error' | 'success' | 'loading'
  } | null>(null)
  const [screensaverStyle, setScreensaverStyle] = useState('bubbles')
  const [patches, setPatches] = useState<
    | { name: string; description: string; installed: boolean }[]
    | false
    | null
  >(null)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        timeFormat: ((await window.api.getStorageValue('timeFormat')) ||
          'HH:mm') as string,
        dateFormat: ((await window.api.getStorageValue('dateFormat')) ||
          'ddd, D MMM') as string,
        autoBrightness:
          ((await window.api.getStorageValue('autoBrightness')) ??
            true) === true,
        brightness: ((await window.api.getStorageValue('brightness')) ??
          0.5) as number,
        sleepMethod: ((await window.api.getStorageValue('sleepMethod')) ||
          'sleep') as string,
        weatherCity: ((await window.api.getStorageValue('weatherCity')) || '') as string,
        weatherUnit: ((await window.api.getStorageValue('weatherUnit')) || 'fahrenheit') as string
      }
      setAutoBrightness(settings.current.autoBrightness ?? false)
      setSleepMethod(settings.current.sleepMethod ?? 'sleep')
      setScreensaverStyle(((await window.api.getStorageValue('screensaverStyle')) || 'bubbles') as string)

      const hasImage = await window.api.hasCustomScreensaverImage()
      setHasCustomImage(hasImage)

      setLoaded(true)
    }

    window.api.isDevMode().then(setIsDev)

    loadSettings()
    loadPatches()
  }, [])

  async function loadPatches() {
    setPatches(null)
    const patches = await window.api.getPatches()

    setPatches(patches)
  }

  async function applyPatch(patchName: string) {
    await window.api.applyPatch(patchName)
    loadPatches()
  }

  useEffect(() => {
    const removeListener = window.api.on('carThingState', async s => {
      if (patches && s !== 'ready') {
        setPatches(false)
      } else if (!patches && s === 'ready') {
        loadPatches()
      }
    })

    return () => removeListener()
  })

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <SelectSetting
          label="Time Format"
          description="Displayed time format in the titlebar"
          defaultValue={settings.current.timeFormat}
          options={[
            { value: 'HH:mm', label: '24-hour' },
            { value: 'h:mm A', label: '12-hour' }
          ]}
          onChange={value =>
            window.api.setStorageValue('timeFormat', value as string)
          }
        />
        <SelectSetting
          label="Date Format"
          description="Displayed date format in the titlebar"
          defaultValue={settings.current.dateFormat}
          options={[
            { value: 'ddd, D MMM', label: 'Short' },
            { value: 'dddd, D MMMM', label: 'Long' }
          ]}
          onChange={value =>
            window.api.setStorageValue('dateFormat', value as string)
          }
        />
        <ToggleSetting
          label="Auto Brightness"
          description="Automatically adjust the brightness"
          defaultValue={settings.current.autoBrightness ?? false}
          onChange={value => {
            window.api.setStorageValue('autoBrightness', value)
            setAutoBrightness(value)
          }}
        />
        <SliderSetting
          label="Brightness"
          description="Adjust the brightness of the screen"
          disabled={autoBrightness}
          defaultValue={settings.current.brightness}
          min={0}
          max={1}
          step={0.05}
          onRelease={value =>
            window.api.setStorageValue('brightness', value as number)
          }
        />
        <InputSubmitSetting
          label="Weather City"
          description="City name to show weather in the TopBar. Leave empty to disable."
          defaultValue={settings.current.weatherCity ?? ''}
          placeholder="e.g. New York"
          submitLabel="Set"
          onSubmit={async value => {
            await window.api.setStorageValue('weatherCity', value || null)
            if (!value) { setWeatherStatus(null); return }
            setWeatherStatus({ message: 'Fetching weather...', status: 'loading' })
            const result = await window.api.refreshWeather()
            setWeatherStatus({ message: result.message, status: result.success ? 'success' : 'error' })
          }}
        />
        {weatherStatus && (
          <div
            className={styles.status}
            data-type={weatherStatus.status === 'loading' ? undefined : weatherStatus.status}
          >
            <span className="material-icons">
              {weatherStatus.status === 'error' ? 'error_outline' : weatherStatus.status === 'loading' ? 'hourglass_empty' : 'check_circle'}
            </span>
            {weatherStatus.message}
          </div>
        )}
        <SelectSetting
          label="Temperature Unit"
          description="Unit for weather temperature display."
          defaultValue={settings.current.weatherUnit ?? 'fahrenheit'}
          options={[
            { value: 'fahrenheit', label: '°F — Fahrenheit' },
            { value: 'celsius', label: '°C — Celsius' }
          ]}
          onChange={value => window.api.setStorageValue('weatherUnit', value as string)}
        />
        <SelectSetting
          label="Sleep Method"
          description="Method used for putting the CarThing to sleep"
          defaultValue={settings.current.sleepMethod}
          options={[
            { value: 'sleep', label: 'Black Screen' },
            {
              value: 'screensaver',
              label: 'Screensaver'
            }
          ]}
          onChange={value => {
            window.api.setStorageValue('sleepMethod', value as string)
            setSleepMethod(value as string)
          }}
        />

        {sleepMethod === 'screensaver' && (
          <div className={styles.screensaverSettings}>
            <SelectSetting
              label="Screensaver Style"
              description="Choose what is shown when the screensaver is active."
              value={screensaverStyle}
              options={[
                { value: 'bubbles', label: 'Bubbles' },
                { value: 'clock', label: 'Clock' }
              ]}
              onChange={value => {
                window.api.setStorageValue('screensaverStyle', value as string)
                setScreensaverStyle(value as string)
              }}
            />
            <div className={styles.header}>
              <div className={styles.text}>
                <p className={styles.label}>Custom Screensaver Image</p>
                <p className={styles.description}>
                  Upload a custom image to use as your screensaver
                  background
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  onClick={async () => {
                    setScreensaverStatus(null)

                    const result =
                      await window.api.uploadScreensaverImage()

                    if (result && result.success) {
                      setHasCustomImage(true)
                      setScreensaverStatus({
                        message: 'Image uploaded successfully!',
                        status: 'success'
                      })
                    } else {
                      setScreensaverStatus({
                        message:
                          result.message || 'Failed to upload image',
                        status: 'error'
                      })
                    }
                  }}
                >
                  <span className="material-icons">upload</span>
                </button>
                {hasCustomImage && (
                  <button
                    data-type="danger"
                    onClick={async () => {
                      setScreensaverStatus(null)

                      const success =
                        await window.api.removeScreensaverImage()

                      if (success) {
                        setHasCustomImage(false)
                        setScreensaverStatus({
                          message: 'Image removed successfully!',
                          status: 'success'
                        })
                      } else {
                        setScreensaverStatus({
                          message: 'Failed to remove image',
                          status: 'error'
                        })
                      }
                    }}
                  >
                    <span className="material-icons">delete</span>
                  </button>
                )}
              </div>
            </div>
            {screensaverStatus && (
              <div
                className={styles.status}
                data-type={screensaverStatus.status}
              >
                <span className="material-icons">
                  {screensaverStatus.status === 'error'
                    ? 'error_outline'
                    : 'check_circle'}
                </span>
                {screensaverStatus.message}
              </div>
            )}
          </div>
        )}
        {patches !== null && isDev ? (
          <div className={styles.patches}>
            <h2>Patches</h2>

            {patches ? (
              patches.map(patch => (
                <Patch
                  key={patch.name}
                  {...patch}
                  onApply={() => applyPatch(patch.name)}
                />
              ))
            ) : (
              <div className={styles.status}>
                <span className="material-icons">info_outline</span>
                Please connect your CarThing to see and install patches!
              </div>
            )}
          </div>
        ) : null}
      </div>
    )
  )
}

const Patch: React.FC<{
  name: string
  description: string
  installed: boolean
  onApply: () => void
}> = ({ name, description, installed, onApply }) => {
  const [applying, setApplying] = useState(false)

  return (
    <div className={styles.patch}>
      <div className={styles.info}>
        <h3>{name}</h3>
        <p>{description}</p>
      </div>
      {applying ? (
        <Loader />
      ) : installed ? (
        <span className="material-icons">check</span>
      ) : (
        <button
          onClick={() => {
            setApplying(true)
            onApply()
          }}
        >
          <span className="material-icons">get_app</span>
        </button>
      )}
    </div>
  )
}

const AppearanceTab: React.FC = () => {
  const [loaded, setLoaded] = useState(false)
  const [appTheme, setAppTheme] = useState<string>('dark')
  const [accentAuto, setAccentAuto] = useState(true)
  const [orientation, setOrientation] = useState<string>('landscape')
  const [visualizerSize, setVisualizerSize] = useState<string>('normal')
  const [backButton, setBackButton] = useState<string>('shortcuts')
  const [visualizer, setVisualizer] = useState(true)
  const [wheelMode, setWheelMode] = useState<string>('volume')
  const [holdToLock, setHoldToLock] = useState(false)
  const [sleepTimer, setSleepTimer] = useState<string>('300')
  const [launcherAutoReturn, setLauncherAutoReturn] = useState(true)
  const [defaultView, setDefaultView] = useState<string>('nowplaying')
  const [accentColor, setAccentColor] = useState('#a78bfa')
  const settings = useRef<{ bgStyle?: string }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        bgStyle: ((await window.api.getStorageValue('bgStyle')) || 'full') as string
      }
      const theme = ((await window.api.getStorageValue('clientTheme')) || 'dark') as string
      const accent = (await window.api.getStorageValue('accentColor')) as string | null
      setOrientation(((await window.api.getStorageValue('orientation')) || 'landscape') as string)
      setVisualizerSize(((await window.api.getStorageValue('visualizerSize')) || 'normal') as string)
      setBackButton(((await window.api.getStorageValue('backButton')) || 'shortcuts') as string)
      setVisualizer((await window.api.getStorageValue('visualizer')) !== false)
      setWheelMode(((await window.api.getStorageValue('wheelMode')) || 'volume') as string)
      setHoldToLock((await window.api.getStorageValue('holdToLock')) === true)
      setSleepTimer(((await window.api.getStorageValue('sleepTimer')) || '300') as string)
      setLauncherAutoReturn((await window.api.getStorageValue('launcherAutoReturn')) !== false)
      setDefaultView(((await window.api.getStorageValue('defaultView')) || 'nowplaying') as string)
      setAppTheme(theme)
      setAccentAuto(!accent)
      if (accent) setAccentColor(accent)
      setLoaded(true)
    }
    loadSettings()
  }, [])

  function changeTheme(value: string) {
    setAppTheme(value)
    window.api.setStorageValue('clientTheme', value)
  }

  function changeAccentAuto(auto: boolean) {
    setAccentAuto(auto)
    window.api.setStorageValue('accentColor', auto ? null : accentColor)
  }

  function changeAccentColor(color: string) {
    setAccentColor(color)
    window.api.setStorageValue('accentColor', color)
  }

  return (
    <div className={styles.settingsTab}>
      {loaded && (
        <SelectSetting
          label="Client theme"
          description="Color theme of the Car Thing display."
          value={appTheme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'glassy', label: 'Glassy' },
            { value: 'aero', label: 'Aero' }
          ]}
          onChange={value => changeTheme(value as string)}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Screen orientation"
          description="Orientation of the Car Thing display. Use portrait if your Car Thing is mounted vertically."
          value={orientation}
          options={[
            { value: 'landscape', label: 'Landscape' },
            { value: 'portrait-right', label: 'Portrait (rotated right)' },
            { value: 'portrait-left', label: 'Portrait (rotated left)' }
          ]}
          onChange={value => {
            setOrientation(value as string)
            window.api.setStorageValue('orientation', value as string)
          }}
        />
      )}
      {loaded && (
        <ToggleSetting
          label="Visualizer"
          description="Show the music spectrum visualizer on the player screen."
          value={visualizer}
          onChange={value => {
            setVisualizer(value)
            window.api.setStorageValue('visualizer', value)
          }}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Visualizer size"
          description="Size of the music spectrum visualizer on the player screen."
          value={visualizerSize}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Large' },
            { value: 'xl', label: 'Extra large' }
          ]}
          onChange={value => {
            setVisualizerSize(value as string)
            window.api.setStorageValue('visualizerSize', value as string)
          }}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Back button"
          description="View opened by one press of the Car Thing back button while playing. Double press opens the other view."
          value={backButton}
          options={[
            { value: 'shortcuts', label: 'App launcher (default)' },
            { value: 'library', label: 'Library' }
          ]}
          onChange={value => {
            setBackButton(value as string)
            window.api.setStorageValue('backButton', value as string)
          }}
        />
      )}
      {loaded && (
        <ToggleSetting
          label="Automatic accent color"
          description="Derive the Car Thing accent color from the current album art."
          value={accentAuto}
          onChange={changeAccentAuto}
        />
      )}
      {loaded && !accentAuto && (
        <ColorSetting
          label="Accent color"
          description="Fixed accent color used on the Car Thing."
          value={accentColor}
          onChange={changeAccentColor}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Album Art Background"
          description="How album art is shown behind the media player on the Car Thing."
          defaultValue={settings.current.bgStyle}
          options={[
            { value: 'full', label: 'Full bleed' },
            { value: 'thumbnail', label: 'Thumbnail (small)' },
            { value: 'thumbnail-blur', label: 'Thumbnail (blurred background)' },
            { value: 'thumbnail-lg', label: 'Thumbnail (large)' }
          ]}
          onChange={value => window.api.setStorageValue('bgStyle', value as string)}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Wheel behavior"
          description="What turning the Car Thing wheel does on the player screen."
          value={wheelMode}
          options={[
            { value: 'volume', label: 'Volume' },
            { value: 'scrub', label: 'Scrub through song' }
          ]}
          onChange={value => {
            setWheelMode(value as string)
            window.api.setStorageValue('wheelMode', value as string)
          }}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Main screen"
          description="Which screen the Car Thing uses as its home base."
          value={defaultView}
          options={[
            { value: 'nowplaying', label: 'Now Playing' },
            { value: 'shortcuts', label: 'App Launcher' }
          ]}
          onChange={value => {
            setDefaultView(value as string)
            window.api.setStorageValue('defaultView', value as string)
          }}
        />
      )}
      {loaded && (
        <ToggleSetting
          label="Return to main screen automatically"
          description="Go back to the main screen after 1 minute without input."
          value={launcherAutoReturn}
          onChange={value => {
            setLauncherAutoReturn(value)
            window.api.setStorageValue('launcherAutoReturn', value)
          }}
        />
      )}
      {loaded && (
        <SelectSetting
          label="Sleep timer"
          description="How long the Car Thing waits without input before showing the screensaver."
          value={sleepTimer}
          options={[
            { value: '0', label: 'Off' },
            { value: '60', label: '1 minute' },
            { value: '300', label: '5 minutes' },
            { value: '600', label: '10 minutes' }
          ]}
          onChange={value => {
            setSleepTimer(value as string)
            window.api.setStorageValue('sleepTimer', value as string)
          }}
        />
      )}
      {loaded && (
        <ToggleSetting
          label="Hold to lock PC"
          description="Holding the Car Thing's confirm (play/pause) button for 3 seconds locks this computer."
          value={holdToLock}
          onChange={value => {
            setHoldToLock(value)
            window.api.setStorageValue('holdToLock', value)
          }}
        />
      )}
    </div>
  )
}

const StartupTab: React.FC = () => {
  const [loaded, setLoaded] = useState(false)
  const settings = useRef<{
    launchOnStartup?: boolean
    launchMinimized?: boolean
    installOnStartup?: boolean
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        launchOnStartup:
          (await window.api.getStorageValue('launchOnStartup')) === true,
        launchMinimized:
          (await window.api.getStorageValue('launchMinimized')) === true
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <ToggleSetting
          label="Launch on startup"
          description="Starts the app when you log in. This will also start the server."
          defaultValue={settings.current.launchOnStartup ?? false}
          onChange={value =>
            window.api.setStorageValue('launchOnStartup', value)
          }
        />
        <ToggleSetting
          label="Launch minimized"
          description="Starts the app minimized in the system tray."
          defaultValue={settings.current.launchMinimized ?? false}
          onChange={value =>
            window.api.setStorageValue('launchMinimized', value)
          }
        />
      </div>
    )
  )
}

const AdvancedTab: React.FC = () => {
  const { devMode, setDevMode } = useContext(DevModeContext)
  const [loaded, setLoaded] = useState(false)
  const settings = useRef<{
    disableSocketAuth?: boolean
    logLevel?: number
    port?: number | null
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        disableSocketAuth:
          (await window.api.getStorageValue('disableSocketAuth')) === true,
        logLevel: ((await window.api.getStorageValue('logLevel')) ||
          1) as number,
        port: ((await window.api.getStorageValue('port')) || null) as
          | number
          | null
      }

      setLoaded(true)
    }

    loadSettings()
  }, [])

  const [portNotice, setPortNotice] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  async function changePort(newPort: number | null) {
    setPortNotice(null)

    if (newPort === settings.current.port) return

    if (newPort === null) {
      await window.api.setStorageValue('port', null)
      settings.current.port = null
    } else {
      if (isNaN(newPort) || newPort < 1024 || newPort > 65535)
        return setPortNotice({
          type: 'error',
          message: 'Port is not valid (must be between 1024 and 65535)'
        })

      if (!(await window.api.isPortOpen(newPort)))
        return setPortNotice({
          type: 'error',
          message: 'The port is unavailable, choose another one'
        })

      await window.api.setStorageValue('port', newPort)
      settings.current.port = newPort
    }

    setPortNotice({
      type: 'success',
      message: 'Port changed and server restarted!'
    })
  }

  useEffect(() => {
    if (portNotice) {
      const timeout = setTimeout(() => setPortNotice(null), 5000)

      return () => clearTimeout(timeout)
    }

    return
  }, [portNotice])

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <ToggleSetting
          label="Developer Mode"
          description="Enables some options for development purposes."
          value={devMode}
          onChange={value => setDevMode(value)}
        />
        <SelectSetting
          label="Log Level"
          description="Useful for debugging purposes."
          defaultValue={settings.current.logLevel}
          options={[
            { value: 0, label: 'Debug' },
            { value: 1, label: 'Info' },
            { value: 2, label: 'Warn' },
            { value: 3, label: 'Error' }
          ]}
          onChange={value =>
            window.api.setStorageValue(
              'logLevel',
              parseInt(value as string)
            )
          }
        />
        <ToggleSetting
          label="Disable WebSocket Authentication"
          description="Allows connections to the WebSocket server without authentication."
          defaultValue={settings.current.disableSocketAuth ?? false}
          onChange={value =>
            window.api.setStorageValue('disableSocketAuth', value)
          }
        />
        <div className={styles.customPort}>
          <InputSubmitSetting
            label="Server Port"
            description="The port the server listens on. Leave empty to use a random available port."
            defaultValue={settings.current.port?.toString()}
            placeholder="1337"
            regex={/[\d]/}
            onSubmit={async value => {
              const port = parseInt(value)
              changePort(isNaN(port) ? null : port)
            }}
            submitLabel="Change"
          />
          {portNotice && (
            <p className={styles.notice} data-type={portNotice.type}>
              <span className="material-icons">
                {portNotice.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {portNotice.message}
            </p>
          )}
        </div>
      </div>
    )
  )
}

const LogsTab: React.FC = () => {
  const logsRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<string[]>([])

  const [loaded, setLoaded] = useState(false)
  const settings = useRef<{
    logLevel?: number
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        logLevel: ((await window.api.getStorageValue('logLevel')) ||
          1) as number
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const updateLogs = async () => setLogs(await window.api.getLogs())

    const interval = setInterval(() => {
      updateLogs()
    }, 500)

    updateLogs()

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scroll({
        top: logsRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [logsRef.current])

  useEffect(() => {
    if (logsRef.current) {
      const currentScroll =
        logsRef.current.scrollHeight - logsRef.current.clientHeight

      if (currentScroll <= logsRef.current.scrollTop + 200) {
        logsRef.current.scroll({
          top: logsRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }, [logs])

  return loaded ? (
    <div className={styles.logsTab}>
      <div className={styles.logs} ref={logsRef}>
        {logs.map((log, i) => (
          <p key={i} className={styles.log}>
            {log}
          </p>
        ))}
      </div>
      <div className={styles.controls}>
        <div className={styles.level}>
          <p>Log level</p>
          <select
            defaultValue={settings.current.logLevel}
            onChange={e =>
              window.api.setStorageValue(
                'logLevel',
                parseInt(e.target.value as string)
              )
            }
          >
            <option value="0">Debug</option>
            <option value="1">Info</option>
            <option value="2">Warn</option>
            <option value="3">Error</option>
          </select>
        </div>
        <div className={styles.buttons}>
          <button
            onClick={() => window.api.clearLogs().then(() => setLogs([]))}
            className={styles.clear}
            data-type="danger"
          >
            <span className="material-icons">delete_forever</span>
          </button>
          <button
            onClick={() => window.api.downloadLogs()}
            className={styles.download}
          >
            <span className="material-icons">download</span>
          </button>
        </div>
      </div>
    </div>
  ) : null
}

const AboutTab: React.FC = () => {
  const { devMode, setDevMode } = useContext(DevModeContext)
  const { channel } = useContext(ChannelContext)

  const [version, setVersion] = useState<string | null>(null)
  const [timesClicked, setTimesClicked] = useState(0)

  useEffect(() => {
    window.api.getVersion().then(setVersion)
  }, [])

  useEffect(() => {
    if (timesClicked <= 0) return

    if (devMode) return

    if (timesClicked >= 5) setDevMode(true)
  }, [timesClicked])

  return (
    <div className={styles.aboutTab}>
      <div className={styles.app}>
        <img src={channel === 'nightly' ? iconNightly : icon} alt="" />
        <div className={styles.info}>
          <h2>thingFX{channel === 'nightly' ? ' Nightly' : ''}</h2>
          <p
            onClick={() => setTimesClicked(t => (t += 1))}
            className={styles.version}
          >
            Version {version}
          </p>
        </div>
      </div>
      <h2>Credits</h2>
      <div className={styles.credit}>
        <img src={abrendanLogo} alt="" />
        <div className={styles.info}>
          <a href="https://www.abrendan.dev" target="_blank" rel="noreferrer">
            abrendan
          </a>
          <p>Main developer of thingFX</p>
        </div>
      </div>
      <div className={styles.credit}>
        <img src={vortexxPfp} alt="" />
        <div className={styles.info}>
          <a href="https://itsvortexx.space" target="_blank" rel="noreferrer">
            1Vortexx
          </a>
          <p>Developer of LumiThing, the base of thingFX</p>
        </div>
      </div>
      <div className={styles.credit}>
        <img src="https://api.bludood.com/avatar?size=48" alt="" />
        <div className={styles.info}>
          <a href="https://bludood.com" target="_blank" rel="noreferrer">
            BluDood
          </a>
          <p>Developer and creator of GlanceThing, LumiThing's base and inspiration</p>
        </div>
      </div>
    </div>
  )
}

const ButtonsTab: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<{ id: string; name?: string; command: string }[]>([])
  const [buttons, setButtons] = useState<Record<string, string | null>>({ '1': null, '2': null, '3': null, '4': null })

  useEffect(() => {
    window.api.getShortcuts().then(setShortcuts)
    window.api.getButtonShortcuts().then(setButtons)
  }, [])

  async function assign(btn: string, id: string | null) {
    const next = { ...buttons, [btn]: id }
    setButtons(next)
    await window.api.setButtonShortcuts(next)
  }

  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '16px' }}>
        Assign a shortcut to each physical preset button (1–4) on the top of the Car Thing.
      </p>
      {(['1', '2', '3', '4'] as const).map(btn => (
        <div className={styles.selectSetting} key={btn}>
          <div className={styles.text}>
            <p className={styles.label}>Button {btn}</p>
          </div>
          <select
            value={buttons[btn] ?? ''}
            onChange={e => assign(btn, e.target.value || null)}
          >
            <option value=''>— None —</option>
            <option value='__lock__'>Lock PC</option>
            {shortcuts.map(s => (
              <option key={s.id} value={s.id}>{s.name ?? s.id}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

export default Settings
