import { useEffect, useRef, useState } from 'react'
import { PlayerItem } from '../api'

export default function Player({ items }: { items: PlayerItem[] }) {
  const [index, setIndex] = useState(0)
  const [gen, setGen] = useState(0)
  const prevItems = useRef(items)
  const currentMediaId = useRef<string | null>(null)

  const safeIndex = index % items.length
  const current = items[safeIndex]
  const next = items[(safeIndex + 1) % items.length]

  useEffect(() => {
    currentMediaId.current = current?.mediaId ?? null
  }, [current])

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
    setGen((g) => g + 1)
    setIndex((i) => (i + 1) % items.length)
  }

  useEffect(() => {
    if (!current || current.type !== 'image') return
    const id = window.setTimeout(advance, current.duration * 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, gen])

  if (!current) return null

  return (
    <div className="absolute inset-0 bg-black">
      {current.type === 'video' ? (
        <video
          key={`v-${gen}-${safeIndex}`}
          src={current.url}
          autoPlay
          muted
          playsInline
          onEnded={advance}
          onError={advance}
          className="w-full h-full object-contain"
        />
      ) : (
        <img
          key={`i-${gen}-${safeIndex}`}
          src={current.url}
          alt=""
          style={{ animationDuration: `${current.duration}s` }}
          className="w-full h-full object-contain image-fade"
        />
      )}
      {next?.type === 'image' && (
        <img src={next.url} alt="" className="hidden" aria-hidden="true" />
      )}
    </div>
  )
}