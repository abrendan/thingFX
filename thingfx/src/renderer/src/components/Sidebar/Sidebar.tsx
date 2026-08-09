import React, { useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ModalContext } from '@/contexts/ModalContext.js'
import { DevModeContext } from '@/contexts/DevModeContext.js'
import { ChannelContext } from '@/contexts/ChannelContext.js'
import icon from '@/assets/icon.png'
import iconNightly from '@/assets/icon-nightly.png'
import styles from './Sidebar.module.css'

const Sidebar: React.FC = () => {
  const { openModals, setModalOpen } = useContext(ModalContext)
  const { devMode } = useContext(DevModeContext)
  const { channel } = useContext(ChannelContext)
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { id: 'home', icon: 'home', label: 'Home', action: () => { navigate('/'); setModalOpen('developer', false) }, isActive: location.pathname === '/' && openModals.length === 0 },
    { id: 'shortcuts', icon: 'apps', label: 'Shortcuts', action: () => { navigate('/shortcuts'); setModalOpen('developer', false) }, isActive: location.pathname === '/shortcuts' && openModals.length === 0 },
    { id: 'settings', icon: 'tune', label: 'Settings', action: () => { navigate('/settings'); setModalOpen('developer', false) }, isActive: location.pathname === '/settings' && openModals.length === 0 },
    ...(devMode ? [{ id: 'developer', icon: 'code', label: 'Developer', action: () => setModalOpen('developer', !openModals.includes('developer')), isActive: openModals.includes('developer') }] : []),
  ]

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <img src={channel === 'nightly' ? iconNightly : icon} className={styles.logo} alt="" />
          <span className={styles.appName}>thingFX{channel === 'nightly' ? ' Nightly' : ''}</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={styles.navItem}
            data-active={item.isActive}
            onClick={item.action}
          >
            <span className="material-icons">{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.footerText}>thingFX</span>
      </div>
    </div>
  )
}

export default Sidebar
