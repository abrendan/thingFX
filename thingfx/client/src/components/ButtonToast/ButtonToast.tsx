import React from 'react'
import styles from './ButtonToast.module.css'

interface ButtonToastProps {
  buttonNum: string | null
  name: string | null
  icon: string | null
}

const ButtonToast: React.FC<ButtonToastProps> = ({ buttonNum, name, icon }) => {
  return (
    <div className={styles.toast} data-visible={!!name}>
      <div className={styles.badge}>
        <span className={styles.num}>{buttonNum}</span>
      </div>
      {icon
        ? <img src={icon} className={styles.icon} alt="" />
        : <span className="material-icons">apps</span>
      }
      <span className={styles.name}>{name}</span>
    </div>
  )
}

export default ButtonToast
