import React, { useMemo, useState } from 'react'
import { IconDefinition } from '@fortawesome/free-solid-svg-icons'

import {
  faFolder,
  faFolderOpen,
  faFile,
  faFileCode,
  faGlobe,
  faTerminal,
  faBolt,
  faCode,
  faCog,
  faGear,
  faGears,
  faCogs,
  faGamepad,
  faMusic,
  faVideo,
  faImage,
  faCamera,
  faMicrophone,
  faHeadphones,
  faHeadset,
  faVolumeHigh,
  faVolumeMute,
  faBell,
  faBellSlash,
  faWifi,
  faDesktop,
  faLaptop,
  faMobile,
  faKeyboard,
  faMouse,
  faPrint,
  faPlay,
  faPause,
  faStop,
  faForward,
  faBackward,
  faForwardStep,
  faBackwardStep,
  faHeart,
  faStar,
  faFire,
  faRocket,
  faBug,
  faLock,
  faUnlock,
  faLockOpen,
  faHome,
  faSearch,
  faPlus,
  faMinus,
  faCheck,
  faTimes,
  faBars,
  faArrowUp,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faChartBar,
  faChartLine,
  faDatabase,
  faCloud,
  faDownload,
  faUpload,
  faTrash,
  faEdit,
  faCopy,
  faPaste,
  faShare,
  faSave,
  faUser,
  faUsers,
  faEnvelope,
  faPhone,
  faMapMarker,
  faClock,
  faCalendar,
  faSun,
  faMoon,
  faSnowflake,
  faUmbrella,
  faCar,
  faPlane,
  faBus,
  faBicycle,
  faCreditCard,
  faMoneyBill,
  faFlask,
  faMicroscope,
  faAtom,
  faDna,
  faGraduationCap,
  faBook,
  faPencilAlt,
  faRuler,
  faPalette,
  faPaintbrush,
  faPowerOff,
  faSync,
  faWrench,
  faHammer,
  faScrewdriver,
  faServer,
  faNetworkWired,
  faShield,
  faKey,
  faCompass,
  faMap,
  faGlasses
} from '@fortawesome/free-solid-svg-icons'

import styles from './IconPicker.module.css'

const ICONS: { name: string; icon: IconDefinition }[] = [
  { name: 'folder', icon: faFolder },
  { name: 'folder-open', icon: faFolderOpen },
  { name: 'file', icon: faFile },
  { name: 'file-code', icon: faFileCode },
  { name: 'globe', icon: faGlobe },
  { name: 'terminal', icon: faTerminal },
  { name: 'bolt', icon: faBolt },
  { name: 'code', icon: faCode },
  { name: 'cog', icon: faCog },
  { name: 'gear', icon: faGear },
  { name: 'gears', icon: faGears },
  { name: 'cogs', icon: faCogs },
  { name: 'gamepad', icon: faGamepad },
  { name: 'music', icon: faMusic },
  { name: 'video', icon: faVideo },
  { name: 'image', icon: faImage },
  { name: 'camera', icon: faCamera },
  { name: 'microphone', icon: faMicrophone },
  { name: 'headphones', icon: faHeadphones },
  { name: 'headset', icon: faHeadset },
  { name: 'volume-high', icon: faVolumeHigh },
  { name: 'volume-mute', icon: faVolumeMute },
  { name: 'bell', icon: faBell },
  { name: 'bell-slash', icon: faBellSlash },
  { name: 'wifi', icon: faWifi },
  { name: 'desktop', icon: faDesktop },
  { name: 'laptop', icon: faLaptop },
  { name: 'mobile', icon: faMobile },
  { name: 'keyboard', icon: faKeyboard },
  { name: 'mouse', icon: faMouse },
  { name: 'print', icon: faPrint },
  { name: 'play', icon: faPlay },
  { name: 'pause', icon: faPause },
  { name: 'stop', icon: faStop },
  { name: 'forward', icon: faForward },
  { name: 'backward', icon: faBackward },
  { name: 'forward-step', icon: faForwardStep },
  { name: 'backward-step', icon: faBackwardStep },
  { name: 'heart', icon: faHeart },
  { name: 'star', icon: faStar },
  { name: 'fire', icon: faFire },
  { name: 'rocket', icon: faRocket },
  { name: 'bug', icon: faBug },
  { name: 'lock', icon: faLock },
  { name: 'unlock', icon: faUnlock },
  { name: 'lock-open', icon: faLockOpen },
  { name: 'home', icon: faHome },
  { name: 'search', icon: faSearch },
  { name: 'plus', icon: faPlus },
  { name: 'minus', icon: faMinus },
  { name: 'check', icon: faCheck },
  { name: 'times', icon: faTimes },
  { name: 'bars', icon: faBars },
  { name: 'arrow-up', icon: faArrowUp },
  { name: 'arrow-down', icon: faArrowDown },
  { name: 'arrow-left', icon: faArrowLeft },
  { name: 'arrow-right', icon: faArrowRight },
  { name: 'chart-bar', icon: faChartBar },
  { name: 'chart-line', icon: faChartLine },
  { name: 'database', icon: faDatabase },
  { name: 'cloud', icon: faCloud },
  { name: 'download', icon: faDownload },
  { name: 'upload', icon: faUpload },
  { name: 'trash', icon: faTrash },
  { name: 'edit', icon: faEdit },
  { name: 'copy', icon: faCopy },
  { name: 'paste', icon: faPaste },
  { name: 'share', icon: faShare },
  { name: 'save', icon: faSave },
  { name: 'user', icon: faUser },
  { name: 'users', icon: faUsers },
  { name: 'envelope', icon: faEnvelope },
  { name: 'phone', icon: faPhone },
  { name: 'map-marker', icon: faMapMarker },
  { name: 'clock', icon: faClock },
  { name: 'calendar', icon: faCalendar },
  { name: 'sun', icon: faSun },
  { name: 'moon', icon: faMoon },
  { name: 'snowflake', icon: faSnowflake },
  { name: 'umbrella', icon: faUmbrella },
  { name: 'car', icon: faCar },
  { name: 'plane', icon: faPlane },
  { name: 'bus', icon: faBus },
  { name: 'bicycle', icon: faBicycle },
  { name: 'credit-card', icon: faCreditCard },
  { name: 'money-bill', icon: faMoneyBill },
  { name: 'flask', icon: faFlask },
  { name: 'microscope', icon: faMicroscope },
  { name: 'atom', icon: faAtom },
  { name: 'dna', icon: faDna },
  { name: 'graduation-cap', icon: faGraduationCap },
  { name: 'book', icon: faBook },
  { name: 'pencil', icon: faPencilAlt },
  { name: 'ruler', icon: faRuler },
  { name: 'palette', icon: faPalette },
  { name: 'paintbrush', icon: faPaintbrush },
  { name: 'power-off', icon: faPowerOff },
  { name: 'sync', icon: faSync },
  { name: 'wrench', icon: faWrench },
  { name: 'hammer', icon: faHammer },
  { name: 'screwdriver', icon: faScrewdriver },
  { name: 'server', icon: faServer },
  { name: 'network-wired', icon: faNetworkWired },
  { name: 'shield', icon: faShield },
  { name: 'key', icon: faKey },
  { name: 'compass', icon: faCompass },
  { name: 'map', icon: faMap },
  { name: 'glasses', icon: faGlasses }
]

export function renderIconToDataUrl(icon: IconDefinition, size = 64): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const [w, h, , , d] = icon.icon
  const pathData = Array.isArray(d) ? d[0] : d

  const scaleX = size / (w as number)
  const scaleY = size / (h as number)

  ctx.fillStyle = '#ffffff'
  ctx.save()
  ctx.scale(scaleX, scaleY)
  ctx.fill(new Path2D(pathData as string))
  ctx.restore()

  return canvas.toDataURL('image/png')
}

interface IconPickerProps {
  onSelect: (dataUrl: string) => void
}

const IconPreview: React.FC<{ icon: IconDefinition }> = ({ icon }) => {
  const [w, h, , , d] = icon.icon
  const pathData = Array.isArray(d) ? d[0] : d
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="22"
      height="22"
      fill="currentColor"
      style={{ display: 'block' }}
    >
      <path d={pathData as string} />
    </svg>
  )
}

const IconPicker: React.FC<IconPickerProps> = ({ onSelect }) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => ICONS.filter(i => i.name.includes(search.toLowerCase())),
    [search]
  )

  return (
    <div className={styles.picker}>
      <input
        className={styles.search}
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className={styles.grid}>
        {filtered.map(({ name, icon }) => (
          <button
            key={name}
            className={styles.iconBtn}
            title={name}
            onClick={() => onSelect(renderIconToDataUrl(icon))}
          >
            <IconPreview icon={icon} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default IconPicker
