import React, { useMemo } from 'react'
import styles from './Visualizer.module.css'

interface VisualizerProps {
  isPlaying: boolean
}

const BAR_COUNT = 24

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying }) => {
  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => ({
      height: Math.floor(Math.random() * 18) + 6,
      delay: (i * 37) % 800,
      duration: Math.floor(Math.random() * 300) + 500,
    }))
  }, [])

  return (
    <div className={styles.visualizer} data-playing={isPlaying}>
      {bars.map((bar, i) => (
        <div
          key={i}
          className={styles.bar}
          style={{
            '--bar-height': `${bar.height}px`,
            '--delay': `${bar.delay}ms`,
            '--duration': `${bar.duration}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export default Visualizer
