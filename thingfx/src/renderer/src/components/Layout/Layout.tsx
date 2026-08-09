import React from 'react'
import { Outlet } from 'react-router-dom'

import Developer from '@/pages/Developer/Developer.js'
import Sidebar from '@/components/Sidebar/Sidebar.js'

import styles from './Layout.module.css'

const Layout: React.FC = () => {
  return (
    <>
      <div className={styles.layout}>
        <Sidebar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
      <Developer />
    </>
  )
}

export default Layout
