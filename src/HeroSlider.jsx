import { useCallback, useEffect, useRef, useState } from 'react'

const SLIDES = [
  ['/images/slide1.jpg', 'Гидролаты Safrose: цикорий, янток и роза'],
  ['/images/slide2.jpg', 'Линейка Safrose: цикорий, янток, роза и виноград'],
  ['/images/slide3.jpg', 'Три флакона Safrose 250 мл'],
  ['/images/slide4.jpg', 'Цикориевая вода и вода янтока'],
  ['/images/slide5.jpg', 'Цикориевая и розовая вода Safrose'],
]
const N = SLIDES.length
const DELAY = 2000

export default function HeroSlider() {
  const [i, setI] = useState(0)
  const [anim, setAnim] = useState(true)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const pending = useRef(null)

  const next = useCallback(() => {
    setAnim(true)
    setI((v) => v + 1)
  }, [])

  const prev = useCallback(() => {
    if (i === 0) {
      pending.current = N - 1
      setAnim(false)
      setI(N)
    } else {
      setAnim(true)
      setI(i - 1)
    }
  }, [i])

  useEffect(() => {
    if (dragging) return
    const t = setTimeout(next, DELAY)
    return () => clearTimeout(t)
  }, [i, dragging, next])

  useEffect(() => {
    if (anim) return
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setAnim(true)
        if (pending.current !== null) {
          setI(pending.current)
          pending.current = null
        }
      })
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [anim])

  const onEnd = (e) => {
    if (e.target !== e.currentTarget) return
    if (i >= N) {
      setAnim(false)
      setI(0)
    }
  }

  const down = (e) => {
    startX.current = e.clientX
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    if (dragging) setDx(e.clientX - startX.current)
  }
  const up = () => {
    if (!dragging) return
    const d = dx
    setDragging(false)
    setDx(0)
    if (d < -50) next()
    else if (d > 50) prev()
  }

  return (
    <div
      className="slider"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div
        className="slider__track"
        style={{
          transform: `translateX(calc(${-i * 100}% + ${dx}px))`,
          transition: dragging || !anim ? 'none' : 'transform 0.9s cubic-bezier(0.65, 0, 0.25, 1)',
        }}
        onTransitionEnd={onEnd}
      >
        {[...SLIDES, SLIDES[0]].map(([src, alt], k) => (
          <img key={k} src={src} alt={alt} draggable="false" />
        ))}
      </div>
      <div className="slider__dots">
        {SLIDES.map((_, k) => (
          <button
            key={k}
            className={k === i % N ? 'on' : ''}
            aria-label={`Слайд ${k + 1}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setAnim(true)
              setI(k)
            }}
          />
        ))}
      </div>
    </div>
  )
}
