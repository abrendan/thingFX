import React, { useEffect, useRef, useState } from 'react'
import styles from './ScrollText.module.css'

interface ScrollTextProps {
  children: string
  className?: string
}

const ScrollText: React.FC<ScrollTextProps> = ({ children, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    // Temporarily force single-line to measure true text width
    const prev = text.style.cssText
    text.style.cssText += ';white-space:nowrap;display:block;overflow:visible;'
    const overflow = text.scrollWidth - container.clientWidth
    text.style.cssText = prev

    setShift(overflow > 2 ? -overflow : 0)
  }, [children])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const text = textRef.current
      if (!text) return
      const prev = text.style.cssText
      text.style.cssText += ';white-space:nowrap;display:block;overflow:visible;'
      const overflow = text.scrollWidth - container.clientWidth
      text.style.cssText = prev
      setShift(overflow > 2 ? -overflow : 0)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  const isScrolling = shift < 0

  return (
    <div ref={containerRef} className={styles.container}>
      <span
        ref={textRef}
        className={`${className ?? ''} ${isScrolling ? styles.scrolling : ''}`}
        style={isScrolling ? {
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'visible',
          WebkitLineClamp: 'unset',
          '--shift': `${shift}px`,
        } as React.CSSProperties : undefined}
      >
        {children}
      </span>
    </div>
  )
}

export default ScrollText
