import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CompassMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn('compass-mark', className)}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="17.5" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
      <path d="m25.7 9.7-3 13-8.4 7.6 3-13z" fill="currentColor" />
      <path
        d="m25.7 9.7-8.4 7.6 5.4 5.4z"
        fill="var(--background)"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="M20 1v4m0 30v4M1 20h4m30 0h4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
export function Brand() {
  return (
    <div className="brand">
      <CompassMark />
      <h1>司南</h1>
    </div>
  )
}
export function SiteIcon({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  let src = ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:') src = `${parsed.origin}/favicon.ico`
  } catch {
    /* 名称首字兜底 */
  }
  return (
    <span className="site-icon" aria-hidden="true">
      {!loaded ? <span>{title.slice(0, 1).toUpperCase()}</span> : null}
      {!failed && src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  )
}
