export function extractAccentColor(imageSrc: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 40
      canvas.height = 40
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve('#a78bfa')
      ctx.drawImage(img, 0, 0, 40, 40)
      const data = ctx.getImageData(0, 0, 40, 40).data
      let r = 0, g = 0, b = 0, count = 0
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
      }
      r = Math.floor(r / count)
      g = Math.floor(g / count)
      b = Math.floor(b / count)

      // boost saturation: scale so the brightest channel = 210
      const max = Math.max(r, g, b, 1)
      const scale = 210 / max
      r = Math.min(255, Math.floor(r * scale))
      g = Math.min(255, Math.floor(g * scale))
      b = Math.min(255, Math.floor(b * scale))

      // if too grey (channels too similar), fall back to purple
      const range = Math.max(r, g, b) - Math.min(r, g, b)
      if (range < 30) return resolve('#a78bfa')

      resolve(`rgb(${r}, ${g}, ${b})`)
    }
    img.onerror = () => resolve('#a78bfa')
    img.src = imageSrc
  })
}
