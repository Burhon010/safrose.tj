import { useEffect, useRef } from 'react'

const PALETTE = [
  ['#fde4e4', '#f4b4b8'],
  ['#fbd3d6', '#ec9aa4'],
  ['#fff0ef', '#f7c9c9'],
  ['#f3e6f7', '#c9a7dd'],
  ['#fce1e8', '#e88ea3'],
]

function makePetal(w, h, fromTop) {
  const size = 9 + Math.random() * 15
  return {
    x: Math.random() * w,
    y: fromTop ? -size * 2 - Math.random() * h * 0.3 : Math.random() * h,
    size,
    vy: 0.35 + Math.random() * 0.55,
    sway: 0.6 + Math.random() * 1.2,
    swayFreq: 0.4 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.02,
    flip: Math.random() * Math.PI * 2,
    vf: 0.015 + Math.random() * 0.025,
    alpha: 0.55 + Math.random() * 0.4,
    colors: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  }
}

function drawPetal(ctx, p) {
  const s = p.size
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  ctx.scale(1, Math.max(0.25, Math.abs(Math.cos(p.flip))))
  ctx.globalAlpha = p.alpha
  const g = ctx.createLinearGradient(0, -s, 0, s)
  g.addColorStop(0, p.colors[0])
  g.addColorStop(1, p.colors[1])
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.bezierCurveTo(s * 0.95, -s * 0.7, s * 0.85, s * 0.55, 0, s)
  ctx.bezierCurveTo(-s * 0.85, s * 0.55, -s * 0.95, -s * 0.7, 0, -s)
  ctx.fill()
  ctx.globalAlpha = p.alpha * 0.35
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 0.7
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.7)
  ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 0.75)
  ctx.stroke()
  ctx.restore()
}

export default function Petals() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let petals = []
    let raf = 0
    let last = performance.now()
    let t = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(34, Math.max(14, w / 45)))
      petals = Array.from({ length: count }, () => makePetal(w, h, false))
    }

    const frame = (now) => {
      const dt = Math.min(48, now - last) / 16.67
      last = now
      t += dt / 60
      ctx.clearRect(0, 0, w, h)
      for (const p of petals) {
        p.y += p.vy * dt
        p.x += Math.sin(t * p.swayFreq * 3 + p.phase) * p.sway * 0.5 * dt
        p.rot += p.vr * dt
        p.flip += p.vf * dt
        if (p.y - p.size > h || p.x < -60 || p.x > w + 60) {
          Object.assign(p, makePetal(w, h, true))
        }
        drawPetal(ctx, p)
      }
      raf = requestAnimationFrame(frame)
    }

    resize()
    if (reduce) {
      petals.forEach((p) => drawPetal(ctx, p))
    } else {
      raf = requestAnimationFrame(frame)
    }
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="petals" aria-hidden="true" />
}
