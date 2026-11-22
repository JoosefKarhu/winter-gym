import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { db, saveSettings, useActiveSession, useSessions, useSettings, type Settings } from '../db'
import {
  dayContext,
  detectPRs,
  prescribe,
  referenceLog,
  sessionSteps,
  HINT,
  timesDone,
  todayIso,
  type ExerciseLog,
  type Prescription,
  type SessionLog,
  type SetLog,
  type Reference,
  type Step,
} from '../logic'
import { backRules, exercises, mobilityIntro, sessions, warmup, type SessionType } from '../program'
import {
  Badge,
  Icon,
  Stepper,
  beep,
  fmtClock,
  fmtDate,
  plate,
  primeAudio,
  useNow,
  useWakeLock,
} from '../ui'
import { go } from '../App'
import { ExercisePhoto } from './Guide'

// ---------- create ----------

/** Prefilled set rows for every exercise in a session. */
function buildExercises(
  type: SessionType,
  date: string,
  deload: boolean,
  backWorse: boolean,
  history: SessionLog[],
): ExerciseLog[] {
  return sessions[type].items.map((item, i) => {
    const rx = prescribe({ type, itemIndex: i, date, deload, backWorse, history })
    return {
      exerciseId: item.exerciseId,
      target: { sets: rx.sets, min: rx.min, max: rx.max },
      sets: Array.from({ length: rx.sets }, () => ({
        kg: rx.loaded ? rx.kg : undefined,
        value: rx.value,
        done: false,
      })),
    }
  })
}

let creating = false
async function createSession(type: SessionType, settings: Settings) {
  if (creating) return
  creating = true
  try {
    if (await db.sessions.where('status').equals('active').count()) return
    const history = await db.sessions.toArray()
    const date = todayIso()
    const ctx = dayContext(date, settings.blockStart, settings.extraDeloadWeeks)
    const deload = type !== 'C' && ctx.deload
    await db.sessions.add({
      type,
      date,
      startedAt: Date.now(),
      status: 'active',
      week: ctx.week,
      phase: ctx.phase.n,
      deload,
      // A and B assume "same or better" until the warm-up switch says otherwise.
      backCheck: type === 'C' ? null : 'same',
      warmupDone: warmup.map(() => false),
      index: 0,
      exercises: buildExercises(type, date, deload, false, history),
      notes: {},
    })
  } finally {
    creating = false
  }
}

// ---------- entry ----------

export default function Session({ type }: { type: SessionType }) {
  const settings = useSettings()
  // null once loaded with no row, undefined while loading: never start A or B before the red flag is known.
  const stored = useLiveQuery(async () => (await db.settings.get(1)) ?? null)
  const active = useActiveSession()
  const history = useSessions()
  const blocked = settings.redFlag && type !== 'C'

  useEffect(() => {
    // The hash check stops a cancelled session restarting while the app navigates away.
    if (active !== null || stored === undefined || blocked) return
    if (location.hash === '#/session/' + type) void createSession(type, settings)
  }, [active, stored, blocked, type, settings])

  if (active === undefined || history === undefined || stored === undefined) return null

  if (active && active.type !== type) {
    return (
      <Shell type={type} title={sessions[type].title} onClose={() => go('')}>
        <div className="px-4 pt-6">
          <p className="display text-[30px] font-bold">Session {active.type} is still open</p>
          <p className="mt-2 text-muted">Finish or discard it before starting Session {type}.</p>
          <a
            href={'#/session/' + active.type}
            className={`mt-6 flex h-16 items-center justify-center rounded-2xl text-xl font-bold ${plate[active.type].bg} ${plate[active.type].text}`}
          >
            Continue session {active.type}
          </a>
          <button
            onClick={async () => {
              await db.sessions.delete(active.id!)
            }}
            className="mt-3 h-14 w-full rounded-2xl border border-line font-semibold"
          >
            Discard it and start {type}
          </button>
        </div>
      </Shell>
    )
  }

  if (!active) {
    if (blocked) {
      return (
        <Shell type={type} title={sessions[type].title} onClose={() => go('')}>
          <div className="px-4 pt-6">
            <p className="display text-[30px] font-bold text-danger">Red flag logged</p>
            <p className="mt-2">{backRules.redFlagAction}</p>
            <a
              href="#/session/C"
              className="mt-6 flex h-16 items-center justify-center rounded-2xl bg-plate-c text-xl font-bold text-on-plate-c"
            >
              Do Session C instead
            </a>
          </div>
        </Shell>
      )
    }
    return null
  }

  return (
    <Flow
      key={active.id}
      initial={active}
      history={history.filter((s) => s.status === 'done')}
      settings={settings}
    />
  )
}

// ---------- layout ----------

function Shell({
  type,
  title,
  onClose,
  progress,
  children,
  footer,
}: {
  type: SessionType
  title: string
  onClose: () => void
  progress?: { at: number; of: number }
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col">
      <header className="sticky top-0 z-20 bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <button
            onClick={onClose}
            aria-label="Back to today"
            className="grid h-12 w-12 place-items-center rounded-xl active:bg-surface-2"
          >
            <Icon name="close" />
          </button>
          <span
            className={`num grid h-8 w-9 place-items-center rounded-md text-xl font-extrabold ${plate[type].bg} ${plate[type].text}`}
          >
            {type}
          </span>
          <span className="display flex-1 truncate text-[20px] font-bold">{title}</span>
          {progress && (
            <span className="num pr-3 text-[22px] font-bold">
              {progress.at}
              <span className="text-muted"> of {progress.of}</span>
            </span>
          )}
        </div>
        {progress && (
          <div className="flex gap-1 px-4 pb-2" aria-hidden="true">
            {Array.from({ length: progress.of }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < progress.at ? plate[type].bg : 'bg-surface-2'}`}
              />
            ))}
          </div>
        )}
      </header>
      <main className="flex-1 pb-48">{children}</main>
      {footer && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[520px] bg-bg">
          {footer}
        </div>
      )}
    </div>
  )
}

// ---------- flow ----------

interface Rest {
  endsAt: number
  total: number
}

function Flow({
  initial,
  history,
  settings,
}: {
  initial: SessionLog
  history: SessionLog[]
  settings: Settings
}) {
  const [s, setS] = useState(initial)
  const [rest, setRestState] = useState<Rest | null>(() =>
    initial.rest && initial.rest.endsAt > Date.now() ? initial.rest : null,
  )
  const items = sessions[s.type].items
  const steps = sessionSteps(s.type)
  const last = steps.length + 1
  useWakeLock(true)

  function update(patch: Partial<SessionLog>) {
    setS((cur) => ({ ...cur, ...patch }))
    void db.sessions.update(s.id!, patch)
  }
  const setRest = (r: Rest | null) => {
    setRestState(r)
    update({ rest: r ?? undefined })
  }
  const goTo = (index: number) => {
    update({ index: Math.max(0, Math.min(last, index)) })
    window.scrollTo(0, 0)
  }

  const touch = useRef<{ x: number; y: number } | null>(null)
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]!
      touch.current = { x: t.clientX, y: t.clientY }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const start = touch.current
      touch.current = null
      if (!start || (e.target as HTMLElement).closest('input,textarea,button')) return
      const t = e.changedTouches[0]!
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(s.index + (dx < 0 ? 1 : -1))
    },
  }

  const restBar = rest && <RestBar rest={rest} type={s.type} onChange={setRest} />
  const title = sessions[s.type].title
  const [leaving, setLeaving] = useState(false)
  const close = () => setLeaving(true)
  const sheet = leaving && (
    <LeaveSheet
      type={s.type}
      onKeep={() => go('')}
      onCancel={async () => {
        go('')
        await db.sessions.delete(s.id!)
      }}
      onStay={() => setLeaving(false)}
    />
  )

  function setBackWorse(worse: boolean) {
    // Re-prefill only exercises not started yet.
    const fresh = buildExercises(s.type, s.date, s.deload, worse, history)
    update({
      backCheck: worse ? 'worse' : 'same',
      exercises: s.exercises.map((e, j) => (e.sets.some((x) => x.done) ? e : fresh[j]!)),
    })
  }

  if (s.index === 0) {
    return (
      <>
        {sheet}
        <Shell
          type={s.type}
          title={title}
          onClose={close}
          footer={
            <ActionBar>
              <PrimaryButton type={s.type} onClick={() => goTo(1)}>
                Start {s.type === 'C' ? 'part 1' : 'lifting'}
              </PrimaryButton>
            </ActionBar>
          }
        >
          <Banners s={{ ...s, backCheck: null }} />
          <Warmup
            s={s}
            update={update}
            firstLift={exercises[items[0]!.exerciseId]!.name}
            onBackWorse={setBackWorse}
            onRedFlag={async () => {
              await saveSettings({ redFlag: true })
              go('')
              await db.sessions.delete(s.id!)
            }}
          />
        </Shell>
      </>
    )
  }

  if (s.index >= last) {
    return <Finish s={s} history={history} onBack={() => goTo(last - 1)} update={update} />
  }

  const step = steps[s.index - 1]!
  const i = step.item
  const item = items[i]!
  const rx = prescribe({
    type: s.type,
    itemIndex: i,
    date: s.date,
    deload: s.deload,
    backWorse: s.backCheck === 'worse',
    history,
  })
  const log = s.exercises[i]!
  const ref = referenceLog(history, s.type, item.exerciseId)

  return (
    <>
      {sheet}
      <Shell
        type={s.type}
        title={title}
        onClose={close}
        progress={{ at: s.index, of: steps.length }}
        footer={null}
      >
        <div {...swipe}>
          <Banners s={s} />
          {step.round === 0 && steps.findIndex((x) => x.round === 0) === s.index - 1 && (
            <p className="mx-4 mb-3 rounded-xl bg-surface p-3 text-[15px]">
              <strong className="display mr-1 text-[18px]">Part 2.</strong>
              {mobilityIntro}
            </p>
          )}
          <ExerciseScreen
            key={s.index}
            type={s.type}
            rx={rx}
            step={step}
            lastTime={ref && step.round == null ? lastTimeText(ref, rx) : undefined}
            note={s.notes[item.exerciseId] ?? ''}
            itemNote={item.note}
            log={log}
            seen={timesDone(history, item.exerciseId)}
            videoUrl={settings.videoUrls[item.exerciseId]}
            onSets={(sets) => {
              const next = s.exercises.map((e, j) => (j === i ? { ...e, sets } : e))
              update({ exercises: next })
            }}
            onNote={(text) => update({ notes: { ...s.notes, [item.exerciseId]: text } })}
            startRest={(sec) => sec > 0 && setRest({ endsAt: Date.now() + sec * 1000, total: sec })}
            onPrev={() => goTo(s.index - 1)}
            onNext={() => goTo(s.index + 1)}
            isLast={s.index === steps.length}
            restBar={restBar}
          />
        </div>
      </Shell>
    </>
  )
}

function LeaveSheet({
  type,
  onKeep,
  onCancel,
  onStay,
}: {
  type: SessionType
  onKeep: () => void
  onCancel: () => void
  onStay: () => void
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onStay()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onStay])
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={onStay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom mx-auto w-full max-w-[520px] rounded-t-3xl bg-surface px-4 pb-4 pt-5"
      >
        <h2 id="leave-title" className="display text-[30px] font-bold">
          Leave the session?
        </h2>
        <p className="mt-1 text-muted">
          Keep it to carry on later from Today. A cancelled session is not saved.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            autoFocus
            onClick={onKeep}
            className={`h-14 rounded-2xl text-[18px] font-bold ${plate[type].bg} ${plate[type].text}`}
          >
            Keep it for later
          </button>
          <button
            onClick={onCancel}
            className="h-14 rounded-2xl border-2 border-danger text-[18px] font-bold text-danger"
          >
            Cancel session
          </button>
          <button onClick={onStay} className="h-12 font-semibold text-muted">
            Stay here
          </button>
        </div>
      </div>
    </div>
  )
}

function lastTimeText(ref: Reference, rx: Prescription) {
  const unit = rx.measure === 'secs' ? ' s' : rx.measure === 'metres' ? ' m' : ''
  const kgs = ref.sets.map((x) => x.kg)
  const sameKg = kgs.every((k) => k === kgs[0])
  const body =
    rx.loaded && kgs[0] != null && sameKg
      ? `${kgs[0]} kg x ${ref.sets.map((x) => x.value ?? '-').join(', ')}`
      : ref.sets
          .map((x) =>
            rx.loaded && x.kg != null ? `${x.kg}x${x.value ?? '-'}` : `${x.value ?? '-'}`,
          )
          .join(', ')
  return `${body}${unit} on ${fmtDate(ref.date)}`
}

function Banners({ s }: { s: SessionLog }) {
  if (!s.deload && s.backCheck !== 'worse') return null
  return (
    <div className="flex flex-col gap-2 px-4 pb-3 pt-1">
      {s.deload && (
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <Badge tone="warn">Deload</Badge> 2 sets, about 10 percent lighter
        </p>
      )}
      {s.backCheck === 'worse' && (
        <p role="status" className="rounded-xl border-2 border-warn px-3 py-2 font-semibold">
          Repeat last loads today, no adding
        </p>
      )}
    </div>
  )
}

function ActionBar({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 border-t border-line px-3 pb-3 pt-3">{children}</div>
}

function PrimaryButton({
  type,
  children,
  onClick,
  disabled,
}: {
  type: SessionType
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => {
        primeAudio()
        onClick()
      }}
      disabled={disabled}
      className={`display flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl text-[26px] font-bold disabled:opacity-40 ${plate[type].bg} ${plate[type].text}`}
    >
      {children}
    </button>
  )
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: 'left' | 'right'
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface-2"
    >
      <Icon name={icon} size={30} />
    </button>
  )
}

// ---------- warm-up ----------

function Warmup({
  s,
  update,
  firstLift,
  onBackWorse,
  onRedFlag,
}: {
  s: SessionLog
  update: (p: Partial<SessionLog>) => void
  firstLift: string
  onBackWorse: (worse: boolean) => void
  onRedFlag: () => void
}) {
  const count = s.warmupDone.filter(Boolean).length
  return (
    <div className="px-4 pt-2">
      <div className="flex items-baseline justify-between">
        <h1 className="display text-[40px] font-extrabold">Warm-up</h1>
        <span className="num text-[22px] font-bold text-muted">
          {count}/{warmup.length}
        </span>
      </div>
      <p className="mb-4 text-muted">15 minutes. Tap each step when done.</p>
      <ul className="flex flex-col gap-2">
        {warmup.map((w, i) => {
          const done = s.warmupDone[i]
          return (
            <li key={w.name}>
              <button
                role="checkbox"
                aria-checked={!!done}
                onClick={() =>
                  update({ warmupDone: s.warmupDone.map((d, j) => (j === i ? !d : d)) })
                }
                className={`flex min-h-[72px] w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors ${done ? 'bg-surface-2' : 'bg-surface'}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 ${done ? `${plate[s.type].bg} ${plate[s.type].border} ${plate[s.type].text}` : 'border-muted'}`}
                >
                  {done && <Icon name="check" size={24} />}
                </span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span
                      className={`text-[18px] font-semibold ${done ? 'text-muted line-through decoration-2' : ''}`}
                    >
                      {w.name}
                    </span>
                    <span className="num text-[18px] font-bold">{w.dose}</span>
                  </span>
                  <span className="block text-[15px] text-muted">{w.point}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {s.type !== 'C' && <BackCheck s={s} onBackWorse={onBackWorse} onRedFlag={onRedFlag} />}
      {s.type !== 'C' && (
        <div className={`mt-3 rounded-2xl border-2 p-4 ${plate[s.type].border}`}>
          <p className="display text-[22px] font-bold">Then ramp up</p>
          <p className="mt-1">
            Do 2 or 3 lighter sets of <strong>{firstLift.toLowerCase()}</strong> before set 1. They
            are not logged.
          </p>
        </div>
      )}
    </div>
  )
}

function BackCheck({
  s,
  onBackWorse,
  onRedFlag,
}: {
  s: SessionLog
  onBackWorse: (worse: boolean) => void
  onRedFlag: () => void
}) {
  const [flags, setFlags] = useState(false)
  const worse = s.backCheck === 'worse'
  const started = s.exercises.some((e) => e.sets.some((x) => x.done))
  return (
    <div className="mt-5 rounded-2xl bg-surface px-3 py-2">
      <button
        role="switch"
        aria-checked={worse}
        disabled={started}
        onClick={() => onBackWorse(!worse)}
        className="flex min-h-16 w-full items-center gap-3 px-1 text-left disabled:opacity-60"
      >
        <span className="flex-1">
          <span className="block text-[18px] font-semibold">Back clearly worse today?</span>
          <span className="block text-[15px] text-muted">
            {worse ? 'Repeating last loads, no adding' : 'Than the morning after your last session'}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${worse ? 'bg-plate-c' : 'bg-surface-2'}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full transition-[left] ${worse ? 'left-7 bg-[#141414]' : 'left-1 bg-muted'}`}
          />
        </span>
      </button>
      <button
        onClick={() => setFlags((f) => !f)}
        aria-expanded={flags}
        className="flex min-h-12 items-center gap-2 px-1 text-[15px] font-semibold text-danger"
      >
        <Icon name="alert" size={20} /> Pain down a leg, numbness or sharp pain?
      </button>
      {flags && (
        <div className="mb-2 rounded-xl border-2 border-danger p-3">
          <ul className="list-disc pl-5">
            {backRules.redFlags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2">{backRules.redFlagAction}</p>
          <button
            onClick={onRedFlag}
            className="mt-3 h-14 w-full rounded-xl bg-danger font-bold text-white"
          >
            I have one of these
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- exercise ----------

const measureLabel = {
  reps: ['Reps', ''],
  secs: ['Seconds', 's'],
  metres: ['Metres', 'm'],
} as const
const valueStep = { reps: 1, secs: 5, metres: 5 } as const

function targetText(rx: Prescription, step: Step) {
  const unit = rx.measure === 'secs' ? ' s' : rx.measure === 'metres' ? ' m' : ''
  const range = rx.min === rx.max ? `${rx.max}` : `${rx.min} to ${rx.max}`
  if (step.round != null) {
    return `Round ${step.round + 1} of ${step.rounds}: ${range}${unit}${rx.perSide ? ' per side' : ''}`
  }
  if (rx.maxMinus != null) return `${rx.sets} x max minus ${rx.maxMinus}`
  return `${rx.sets} x ${range}${unit}${rx.perSide ? ' per side' : ''}`
}

function ExerciseScreen(props: {
  type: SessionType
  rx: Prescription
  step: Step
  lastTime?: string
  log: ExerciseLog
  note: string
  itemNote: string
  seen: number
  videoUrl?: string
  onSets: (sets: SetLog[]) => void
  onNote: (t: string) => void
  startRest: (sec: number) => void
  onPrev: () => void
  onNext: () => void
  isLast: boolean
  restBar: ReactNode
}) {
  const { type, rx, log, onSets, step } = props
  const ex = exercises[rx.exerciseId]!
  // A mobility round shows only its own set.
  const visible = step.round != null ? [step.round] : log.sets.map((_, j) => j)
  const firstOpen = visible.find((j) => !log.sets[j]?.done) ?? -1
  const [sel, setSel] = useState(firstOpen)
  const [hold, setHold] = useState<{ endsAt: number; side: 1 | 2 } | null>(null)
  const allDone = firstOpen === -1
  const cur = sel >= 0 ? log.sets[sel] : undefined
  const [vLabel, vUnit] = measureLabel[rx.measure]

  function edit(patch: Partial<SetLog>) {
    onSets(log.sets.map((x, j) => (j === sel ? { ...x, ...patch } : x)))
  }

  function complete() {
    if (!cur) return
    // Carry today's numbers forward to the sets not done yet.
    const sets = log.sets.map((x, j) =>
      j === sel
        ? { ...x, done: true }
        : j > sel && !x.done
          ? { ...x, kg: cur.kg, value: cur.value }
          : x,
    )
    onSets(sets)
    setSel(visible.find((j) => !sets[j]?.done) ?? -1)
    props.startRest(rx.restSec)
  }

  function startHold() {
    primeAudio()
    setHold({ endsAt: Date.now() + (cur?.value ?? rx.value) * 1000, side: 1 })
  }

  return (
    <>
      <div className="px-4">
        <h1 className="display text-[40px] font-extrabold">{ex.name}</h1>
        <p className="num mt-2 text-[24px] font-bold">
          {targetText(rx, step)}
          {rx.rir && <span className="text-muted"> at {rx.rir}</span>}
        </p>
        <p className="mt-0.5 text-[15px] text-muted">
          {rx.restSec ? `Rest ${rx.restSec} s` : 'No rest timer'}. {props.itemNote}.
        </p>
        {props.lastTime && (
          <p className="mt-2 text-[15px]">
            <span className="font-semibold text-muted">Last time </span>
            <span className="num text-[18px] font-bold">{props.lastTime}</span>
          </p>
        )}
        {rx.hint && rx.hint !== HINT.backWorse && step.round == null && (
          <p
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold ${rx.increase ? `${plate[type].bg} ${plate[type].text}` : 'bg-surface'}`}
          >
            {rx.increase && <Icon name="up" size={22} />}
            {rx.hint}
          </p>
        )}
      </div>

      <section aria-label="Sets" className="mt-4 px-4">
        <ol className="flex flex-col gap-2">
          {visible.map((j) => {
            const x = log.sets[j]!
            const label = step.round != null ? `Round ${j + 1}` : `Set ${j + 1}`
            if (j === sel) {
              return (
                <li key={j} className={`rounded-2xl border-2 bg-surface p-3 ${plate[type].border}`}>
                  <p className="display mb-2 text-[22px] font-bold">
                    {label}
                    {step.round == null && (
                      <span className="text-muted"> of {log.sets.length}</span>
                    )}
                  </p>
                  <div className="flex flex-col gap-2">
                    {rx.loaded && (
                      <Stepper
                        label={rx.exerciseId === 'pullup' ? 'Added kg' : 'kg'}
                        value={x.kg}
                        step={rx.step}
                        decimals
                        onChange={(kg) => edit({ kg })}
                      />
                    )}
                    <Stepper
                      label={vLabel}
                      value={x.value}
                      step={valueStep[rx.measure]}
                      onChange={(value) => edit({ value })}
                    />
                  </div>
                  {rx.hold && !hold && !x.done && (
                    <button
                      onClick={complete}
                      className="mt-2 min-h-12 w-full text-[15px] font-semibold text-muted underline underline-offset-4"
                    >
                      Log without the timer
                    </button>
                  )}
                </li>
              )
            }
            return (
              <li key={j}>
                <button
                  onClick={() => setSel(j)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-surface px-4 text-left"
                  aria-label={`Edit ${label.toLowerCase()}`}
                >
                  <span className="display w-[72px] text-[18px] font-bold text-muted">{label}</span>
                  <span className="num flex-1 text-[22px] font-bold">
                    {rx.loaded && x.kg != null && `${x.kg} kg x `}
                    {x.value ?? '-'}
                    {vUnit && ` ${vUnit}`}
                  </span>
                  {x.done ? (
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full bg-go text-[#0b2316]"
                      aria-label="done"
                    >
                      <Icon name="check" size={20} />
                    </span>
                  ) : (
                    <span className="text-[15px] text-muted">to do</span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
        {allDone && sel === -1 && (
          <p className="mt-3 flex items-center gap-2 font-semibold text-go">
            <Icon name="check" /> {step.round != null ? 'Round done' : 'All sets done'}
          </p>
        )}
      </section>

      <details open={props.seen < 3} className="group mx-4 mt-4 rounded-2xl bg-surface">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between px-4 font-semibold">
          How to do it
          <Icon name="chevronDown" className=" group-open:rotate-180" />
        </summary>
        <div className="px-3 pb-1">
          <ExercisePhoto id={rx.exerciseId} videoUrl={props.videoUrl} />
        </div>
        {ex.cues && <Cues cues={ex.cues} note={ex.photoNote} />}
      </details>

      <label className="mx-4 mt-4 block">
        <span className="text-[15px] font-semibold text-muted">Note</span>
        <input
          type="text"
          value={props.note}
          onChange={(e) => props.onNote(e.target.value)}
          placeholder="For example: used trap bar, band assisted"
          className="mt-1 h-14 w-full rounded-xl bg-surface px-4 outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-ink"
        />
      </label>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[520px] bg-bg">
        {props.restBar}
        {hold && (
          <HoldCountdown
            hold={hold}
            perSide={rx.perSide}
            seconds={cur?.value ?? rx.value}
            onSide2={() =>
              setHold({
                endsAt: Date.now() + 3000 + (cur?.value ?? rx.value) * 1000,
                side: 2,
              })
            }
            onDone={() => {
              setHold(null)
              complete()
            }}
            type={type}
          />
        )}
        <ActionBar>
          <IconButton icon="left" label="Previous" onClick={props.onPrev} />
          {sel >= 0 && !log.sets[sel]!.done ? (
            rx.hold ? (
              hold ? (
                <PrimaryButton type={type} onClick={() => setHold(null)}>
                  Stop hold
                </PrimaryButton>
              ) : (
                <PrimaryButton type={type} onClick={startHold}>
                  <Icon name="play" size={26} /> Start hold {cur?.value ?? rx.value} s
                </PrimaryButton>
              )
            ) : (
              <PrimaryButton type={type} onClick={complete}>
                <Icon name="check" size={30} /> Done{' '}
                {step.round != null ? 'round' : `set ${sel + 1}`}
              </PrimaryButton>
            )
          ) : sel >= 0 ? (
            <PrimaryButton type={type} onClick={() => setSel(firstOpen)}>
              {firstOpen >= 0 ? `Back to set ${firstOpen + 1}` : 'Done editing'}
            </PrimaryButton>
          ) : (
            <PrimaryButton type={type} onClick={props.onNext}>
              {props.isLast ? 'Finish' : 'Next exercise'} <Icon name="right" size={28} />
            </PrimaryButton>
          )}
          <IconButton icon="right" label="Next" onClick={props.onNext} />
        </ActionBar>
      </div>
    </>
  )
}

export function Cues({
  cues,
  note,
}: {
  cues: { setup: string; move: string; avoid: string }
  note?: string
}) {
  return (
    <dl className="grid gap-3 px-4 pb-4 pt-1 text-[16px]">
      {(
        [
          ['Setup', note ? `${note} ${cues.setup}` : cues.setup],
          ['Move', cues.move],
          ['Avoid', cues.avoid],
        ] as const
      ).map(([k, v]) => (
        <div key={k}>
          <dt
            className={`display text-[16px] font-bold tracking-wider ${k === 'Avoid' ? 'text-danger' : 'text-muted'}`}
          >
            {k}
          </dt>
          <dd className="mt-0.5">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

// ---------- timers ----------

function RestBar({
  rest,
  type,
  onChange,
}: {
  rest: Rest
  type: SessionType
  onChange: (r: Rest | null) => void
}) {
  const now = useNow(200)
  const left = (rest.endsAt - now) / 1000
  const over = left <= 0
  const change = useRef(onChange)
  change.current = onChange
  useEffect(() => {
    if (!over) return
    beep()
    const t = setTimeout(() => change.current(null), 2500)
    return () => clearTimeout(t)
  }, [over])
  const pct = Math.max(0, Math.min(1, left / rest.total))
  return (
    <div
      role="timer"
      aria-label="Rest timer"
      className="relative overflow-hidden border-t border-line bg-surface"
    >
      <div
        className={`absolute inset-y-0 left-0 ${plate[type].bg} opacity-25 transition-[width] duration-200 ease-linear`}
        style={{ width: `${pct * 100}%` }}
      />
      <div className="relative flex items-center gap-2 px-3 py-2">
        <div className="flex-1">
          <span className="block text-[13px] font-semibold uppercase tracking-wider text-muted">
            {over ? 'Go' : 'Rest'}
          </span>
          <span
            className={`num block text-[56px] font-extrabold leading-none ${over ? 'text-go' : ''}`}
          >
            {fmtClock(left)}
          </span>
        </div>
        <button
          onClick={() =>
            onChange({ ...rest, endsAt: rest.endsAt + 30_000, total: rest.total + 30 })
          }
          className="num h-14 rounded-xl bg-surface-2 px-4 text-[22px] font-bold"
        >
          +30 s
        </button>
        <button
          onClick={() => onChange(null)}
          className="h-14 rounded-xl bg-surface-2 px-4 text-[18px] font-semibold"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

function HoldCountdown({
  hold,
  perSide,
  seconds,
  onSide2,
  onDone,
  type,
}: {
  hold: { endsAt: number; side: 1 | 2 }
  perSide: boolean
  seconds: number
  onSide2: () => void
  onDone: () => void
  type: SessionType
}) {
  const now = useNow(100)
  const left = (hold.endsAt - now) / 1000
  const switching = hold.side === 2 && left > seconds
  const finished = useRef(false)
  useEffect(() => {
    if (left > 0 || finished.current) return
    finished.current = true
    beep(perSide && hold.side === 1 ? 2 : 3)
    if (perSide && hold.side === 1) {
      finished.current = false
      onSide2()
    } else onDone()
  }, [left, perSide, hold.side, onSide2, onDone])
  return (
    <div
      role="timer"
      aria-label="Hold timer"
      className="relative overflow-hidden border-t border-line bg-surface"
    >
      <div
        className={`absolute inset-y-0 left-0 ${plate[type].bg} opacity-25`}
        style={{ width: `${switching ? 0 : Math.max(0, Math.min(1, left / seconds)) * 100}%` }}
      />
      <div className="relative flex items-end justify-between px-4 py-2">
        <span className="pb-1.5 text-[15px] font-semibold uppercase tracking-wider text-muted">
          {switching ? 'Switch sides' : perSide ? `Side ${hold.side}` : 'Hold'}
        </span>
        <span className="num text-[72px] font-extrabold leading-none">
          {switching ? fmtClock(left - seconds) : fmtClock(left)}
        </span>
      </div>
    </div>
  )
}

// ---------- finish ----------

function Finish({
  s,
  history,
  onBack,
}: {
  s: SessionLog
  history: SessionLog[]
  onBack: () => void
  update: (p: Partial<SessionLog>) => void
}) {
  const now = useNow(1000)
  const minutes = Math.round((now - s.startedAt) / 60000)
  const prs = detectPRs(s, history)
  const setsDone = s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)
  const setsAll = s.exercises.reduce((n, e) => n + e.sets.length, 0)

  async function save() {
    await db.sessions.update(s.id!, { status: 'done', finishedAt: Date.now() })
    go('history')
  }

  return (
    <Shell
      type={s.type}
      title={sessions[s.type].title}
      onClose={() => go('')}
      footer={
        <ActionBar>
          <IconButton icon="left" label="Back to last exercise" onClick={onBack} />
          <PrimaryButton type={s.type} onClick={save}>
            <Icon name="check" size={30} /> Save session
          </PrimaryButton>
        </ActionBar>
      }
    >
      <div className="px-4 pt-2">
        <h1 className="display text-[44px] font-extrabold">Session done</h1>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface p-4">
            <dt className="text-[15px] font-semibold text-muted">Time</dt>
            <dd className="num text-[40px] font-extrabold leading-tight">{minutes} min</dd>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <dt className="text-[15px] font-semibold text-muted">Sets</dt>
            <dd className="num text-[40px] font-extrabold leading-tight">
              {setsDone}
              <span className="text-muted">/{setsAll}</span>
            </dd>
          </div>
        </dl>
        {prs.length > 0 && (
          <div className={`mt-3 rounded-2xl p-4 ${plate[s.type].bg} ${plate[s.type].text}`}>
            <p className="display text-[26px] font-bold">New best</p>
            <ul className="mt-1">
              {prs.map((p) => (
                <li key={p.exerciseId} className="num text-[22px] font-bold">
                  {exercises[p.exerciseId]!.name}: {p.kg} kg
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="mt-4 divide-y divide-line rounded-2xl bg-surface">
          {s.exercises.map((e) => {
            const done = e.sets.filter((x) => x.done)
            return (
              <li
                key={e.exerciseId}
                className="flex items-baseline justify-between gap-3 px-4 py-3"
              >
                <span className="font-semibold">{exercises[e.exerciseId]!.name}</span>
                <span className="num shrink-0 text-[18px] font-bold">
                  {done.length ? summarizeSets(done) : <span className="text-muted">skipped</span>}
                </span>
              </li>
            )
          })}
        </ul>
        <button
          onClick={async () => {
            if (confirm('Discard this session? Nothing will be saved.')) {
              go('')
              await db.sessions.delete(s.id!)
            }
          }}
          className="mt-4 h-12 w-full font-semibold text-danger"
        >
          Discard session
        </button>
      </div>
    </Shell>
  )
}

export function summarizeSets(sets: SetLog[]) {
  return sets.map((x) => (x.kg ? `${x.kg}x${x.value ?? '-'}` : `${x.value ?? '-'}`)).join('  ')
}
