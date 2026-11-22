import { useEffect, useState, type ReactNode } from 'react'
import type { SessionType } from './program'

export const plate: Record<
  SessionType,
  { bg: string; text: string; border: string; fill: string }
> = {
  A: {
    bg: 'bg-plate-a',
    text: 'text-on-plate-a',
    border: 'border-plate-a',
    fill: 'var(--plate-a)',
  },
  B: {
    bg: 'bg-plate-b',
    text: 'text-on-plate-b',
    border: 'border-plate-b',
    fill: 'var(--plate-b)',
  },
  C: {
    bg: 'bg-plate-c',
    text: 'text-on-plate-c',
    border: 'border-plate-c',
    fill: 'var(--plate-c)',
  },
}

// ---------- icons (authored, 24px grid, 2px stroke) ----------

const paths = {
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  check: 'M4.5 12.5l5 5 10-11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  chart: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-7',
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  play: 'M8 5v14l11-7z',
  chevronDown: 'M6 9l6 6 6-6',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  up: 'M12 19V5M6 11l6-6 6 6',
  racquet: 'M14 3a6 6 0 016 6c0 3.3-2.7 6-6 6s-5-2-5-5 2-7 5-7zM9.5 13.5L4 19l1 1 5.5-5.5',
  flag: 'M6 21V4M6 4h11l-2 4 2 4H6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
}
export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 24,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const filled = name === 'play'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  )
}

// ---------- stepper ----------

export function Stepper({
  label,
  value,
  step,
  onChange,
  decimals = false,
}: {
  label: string
  value: number | undefined
  step: number
  onChange: (v: number | undefined) => void
  decimals?: boolean
}) {
  const bump = (d: number) => onChange(Math.max(0, Math.round(((value ?? 0) + d) * 100) / 100))
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => bump(-step)}
        aria-label={`${label} minus ${step}`}
        className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-surface-2"
      >
        <Icon name="minus" size={28} />
      </button>
      <label className="relative flex-1 rounded-xl bg-surface-2">
        <span className="absolute left-3 top-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        <input
          type="number"
          inputMode={decimals ? 'decimal' : 'numeric'}
          step={decimals ? 0.5 : 1}
          min={0}
          value={value ?? ''}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          onFocus={(e) => e.target.select()}
          className="num h-16 w-full rounded-xl bg-transparent pt-3 text-center text-[34px] font-bold outline-none placeholder:text-muted/50"
        />
      </label>
      <button
        type="button"
        onClick={() => bump(step)}
        aria-label={`${label} plus ${step}`}
        className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-surface-2"
      >
        <Icon name="plus" size={28} />
      </button>
    </div>
  )
}

// ---------- misc ----------

export function Badge({
  children,
  tone = 'ink',
}: {
  children: ReactNode
  tone?: 'ink' | 'warn' | 'danger' | 'go'
}) {
  const cls = {
    ink: 'bg-ink text-bg',
    warn: 'bg-plate-c text-on-plate-c',
    danger: 'bg-danger text-white',
    go: 'bg-go text-[#0b2316]',
  }[tone]
  return (
    <span
      className={`display inline-flex items-center rounded-md px-2 py-1 text-[15px] font-bold tracking-wider ${cls}`}
    >
      {children}
    </span>
  )
}

export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function fmtDate(iso: string, withDay = true) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return `${withDay ? DAYS[date.getDay()] + ' ' : ''}${d} ${MONTHS[m! - 1]}`
}

// ---------- sound, vibration, wake lock ----------

let audio: AudioContext | undefined
/** Call from a tap so iOS unlocks audio for later beeps. */
export function primeAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* no audio */
  }
}
export function beep(times = 3) {
  try {
    navigator.vibrate?.([200, 100, 200, 100, 300])
  } catch {
    /* no vibration */
  }
  if (!audio) return
  for (let i = 0; i < times; i++) {
    const t = audio.currentTime + i * 0.28
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = i === times - 1 ? 1320 : 880
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    o.connect(g).connect(audio.destination)
    o.start(t)
    o.stop(t + 0.22)
  }
}

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const get = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => {})
    const onVis = () => document.visibilityState === 'visible' && get()
    void get()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [active])
}
