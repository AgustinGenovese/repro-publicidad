import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { PlayerItem } from '../api'

const IMAGE_DURATION_S = 300
const FADE_IN_MS = 3000
const FADE_OUT_MS = 1200

export default function Player({ items }: { items: PlayerItem[] }) {
  const [index, setIndex] = useState(0)
  const [gen, setGen] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const advancing = useRef(false)
  const prevItems = useRef(items)

  const safeIndex = index % items.length
  const current = items[safeIndex]
  const next = items[(safeIndex + 1) % items.length]

  useEffect(() => {
    if (prevItems.current === items) return
    const previous = prevItems.current
    prevItems.current = items

    const prevCurrent = previous[safeIndex]
    if (prevCurrent) {
      const pos = items.findIndex((i) => i.mediaId === prevCurrent.mediaId)
      if (pos !== -1) {
        setIndex(pos)
        return
      }
    }
    setIndex(0)
    setGen((g) => g + 1)
  }, [items, safeIndex])

  function advance() {
    if (advancing.current) return
    advancing.current = true
    setFadingOut(true)
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % items.length)
      setGen((g) => g + 1)
      setFadingOut(false)
      advancing.current = false
    }, FADE_OUT_MS)
  }

  const advanceFromTimer = useEffectEvent(advance)

  useEffect(() => {
    if (!current || current.type !== 'image') return
    const id = window.setTimeout(() => advanceFromTimer(), IMAGE_DURATION_S * 1000)
    return () => window.clearTimeout(id)
  }, [current, gen])

  if (!current) return null

  const layerStyle = { animationDuration: `${fadingOut ? FADE_OUT_MS : FADE_IN_MS}ms` }
  const layerClass = `absolute inset-0 w-full h-full object-contain ${
    fadingOut ? 'image-out' : 'image-in'
  }`

  return (
    <div className="absolute inset-0 bg-black" onDoubleClick={advance}>
      {current.type === 'video' ? (
        <video
          key={`v-${gen}-${safeIndex}`}
          src={current.url}
          autoPlay
          muted
          playsInline
          onEnded={advance}
          onError={advance}
          style={layerStyle}
          className={layerClass}
        />
      ) : (
        <img
          key={`i-${gen}-${safeIndex}`}
          src={current.url}
          alt=""
          style={layerStyle}
          className={layerClass}
        />
      )}

      {next?.type === 'image' && (
        <img src={next.url} alt="" className="hidden" aria-hidden="true" />
      )}
    </div>
  )
}
