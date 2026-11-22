import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  backup,
  daysSinceBackup,
  db,
  saveSettings,
  useActiveSession,
  useSessions,
  useSettings,
  type QuickLog,
} from '../db'
import { backupText } from './Settings'
import {
  loadSeries,
  sessionSteps,
  dayContext,
  dayNumber,
  isoFromDay,
  mondayOf,
  todayIso,
  type SessionLog,
} from '../logic'
import {
  BLOCK_WEEKS,
  HARD_MATCHES_FOR_DELOAD,
  exercises,
  sessions,
  type SessionType,
} from '../program'
import { Badge, Icon, fmtDate, plate } from '../ui'
import { go } from '../App'

const TYPES: SessionType[] = ['A', 'B', 'C']
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Home() {
  const settings = useSettings()
  const all = useSessions()
  const active = useActiveSession()
  const today = todayIso()
  const ctx = dayContext(today, settings.blockStart, settings.extraDeloadWeeks)
  const monday = mondayOf(today)
  const days = Array.from({ length: 7 }, (_, i) => isoFromDay(dayNumber(monday) + i))
  const quick = useLiveQuery(
    () => db.quickLogs.where('date').between(days[0]!, days[6]!, true, true).toArray(),
    [monday],
  )
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [undo, setUndo] = useState<{ id: number; kind: QuickLog['kind'] } | null>(null)

  const done = (all ?? []).filter((s) => s.status === 'done')
  const backupDays = daysSinceBackup(settings)
  const lastDate = (t: SessionType) =>
    done.filter((s) => s.type === t).sort((a, b) => b.date.localeCompare(a.date))[0]?.date

  // Quick logs go to the day picked in the week strip, today when none is.
  const logDay = openDay ?? today
  async function quickLog(kind: QuickLog['kind']) {
    const id = await db.quickLogs.add({ kind, date: logDay, at: Date.now() })
    setUndo({ id, kind })
    setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 6000)
  }

  async function start(t: SessionType) {
    if (active && active.type !== t) {
      if (
        !confirm(`Session ${active.type} is still in progress. Discard it and start Session ${t}?`)
      )
        return
      await db.sessions.delete(active.id!)
    }
    go('session/' + t)
  }

  const activeStep = active ? sessionSteps(active.type)[active.index - 1] : undefined
  const activeItem = active && activeStep ? sessions[active.type].items[activeStep.item] : undefined

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="pb-5 pt-2">
        <p className="text-[15px] font-semibold text-muted">{fmtDate(today)}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="display text-[64px] font-extrabold">Week {ctx.week}</h1>
          {ctx.deload && (
            <div className="mb-2">
              <Badge>Deload</Badge>
            </div>
          )}
        </div>
        <p className="display mt-1 text-[22px] font-semibold text-muted">
          Phase {ctx.phase.n} <span className="text-ink">{ctx.phase.name}</span>
        </p>
        {ctx.deload && (
          <p className="mt-2 text-[15px] text-muted">
            A and B: 2 sets, about 10 percent lighter. C stays the same.
          </p>
        )}
      </header>

      {ctx.week > BLOCK_WEEKS && <BlockComplete done={done} />}

      {!ctx.deload &&
        (quick ?? []).filter((q) => q.kind === 'squash').length >= HARD_MATCHES_FOR_DELOAD && (
          <div role="status" className="mb-5 rounded-2xl border-2 border-warn p-4">
            <p className="display text-[22px] font-bold">
              {(quick ?? []).filter((q) => q.kind === 'squash').length} squash matches this week
            </p>
            <p className="mt-1 text-[15px]">
              Your program makes this an extra deload week: A and B drop to 2 sets, about 10 percent
              lighter.
            </p>
            <button
              onClick={() =>
                saveSettings({
                  extraDeloadWeeks: [...settings.extraDeloadWeeks, ctx.week].sort((a, b) => a - b),
                })
              }
              className="mt-3 h-14 w-full rounded-xl bg-plate-c font-bold text-on-plate-c"
            >
              Make week {ctx.week} a deload week
            </button>
          </div>
        )}

      {active && (
        <a
          href={'#/session/' + active.type}
          className={`mb-5 flex min-h-[72px] items-center justify-between gap-3 rounded-2xl px-5 py-3 ${plate[active.type].bg} ${plate[active.type].text}`}
        >
          <span>
            <span className="display block text-[26px] font-bold">
              Continue session {active.type}
            </span>
            <span className="text-[15px] font-medium">
              {activeItem
                ? exercises[activeItem.exerciseId]!.name
                : active.index === 0
                  ? 'Warm-up'
                  : 'Finish and save'}
            </span>
          </span>
          <Icon name="right" size={30} />
        </a>
      )}

      <section aria-label="This week" className="mb-4">
        <ol className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const isToday = d === today
            const daySessions = done.filter((s) => s.date === d)
            const dayQuick = (quick ?? []).filter((q) => q.date === d)
            const open = openDay === d
            return (
              <li key={d}>
                <button
                  onClick={() => setOpenDay(open ? null : d)}
                  aria-expanded={open}
                  className={`flex min-h-[104px] w-full flex-col items-center gap-1 rounded-xl pb-2 pt-1.5 ${isToday ? 'bg-surface-2' : 'bg-surface'} ${open ? 'ring-2 ring-ink' : isToday ? 'ring-1 ring-muted' : ''}`}
                >
                  <span className="sr-only">
                    {fmtDate(d)}, {daySessions.length + dayQuick.length} logged.
                  </span>
                  <span aria-hidden="true" className="text-xs font-semibold text-muted">
                    {DAY_LETTERS[i]}
                  </span>
                  <span aria-hidden="true" className="num text-xl font-bold leading-none">
                    {Number(d.slice(8))}
                  </span>
                  <span className="mt-1 flex flex-col items-center gap-1">
                    {daySessions.map((s) => (
                      <span
                        key={s.id}
                        className={`num grid h-6 w-7 place-items-center rounded text-sm font-extrabold ${plate[s.type].bg} ${plate[s.type].text}`}
                      >
                        {s.type}
                      </span>
                    ))}
                    {dayQuick.map((q) => (
                      <span
                        key={q.id}
                        className="grid h-6 w-7 place-items-center rounded border border-line text-[11px] font-bold uppercase text-muted"
                      >
                        {q.kind === 'squash' ? 'SQ' : 'SIM'}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        {openDay && (
          <div className="mt-2 rounded-2xl bg-surface p-3">
            <p className="px-1 pb-1 font-semibold">{fmtDate(openDay)}</p>
            <ul className="flex flex-col">
              {done
                .filter((s) => s.date === openDay)
                .map((s) => (
                  <li key={s.id}>
                    <a href="#/history" className="flex min-h-12 items-center gap-3 px-1">
                      <span
                        className={`num grid h-6 w-7 place-items-center rounded text-sm font-extrabold ${plate[s.type].bg} ${plate[s.type].text}`}
                      >
                        {s.type}
                      </span>
                      <span className="flex-1">{sessions[s.type].title}</span>
                      <span className="text-[15px] text-muted">See in history</span>
                    </a>
                  </li>
                ))}
              {(quick ?? [])
                .filter((q) => q.date === openDay)
                .map((q) => (
                  <li key={q.id} className="flex min-h-12 items-center gap-3 px-1">
                    <span className="grid h-6 w-7 place-items-center rounded border border-line text-[11px] font-bold uppercase text-muted">
                      {q.kind === 'squash' ? 'SQ' : 'SIM'}
                    </span>
                    <span className="flex-1">
                      {q.kind === 'squash' ? 'Squash match' : 'Simulator'}
                    </span>
                    <button
                      onClick={() => db.quickLogs.delete(q.id!)}
                      className="h-12 px-3 font-semibold text-danger"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              {!done.some((s) => s.date === openDay) &&
                !(quick ?? []).some((q) => q.date === openDay) && (
                  <li className="px-1 py-2 text-muted">Nothing logged this day.</li>
                )}
            </ul>
          </div>
        )}
      </section>

      <div className="mb-7 grid grid-cols-2 gap-2">
        {(['squash', 'sim'] as const).map((k) =>
          undo?.kind === k ? (
            <button
              key={k}
              onClick={async () => {
                await db.quickLogs.delete(undo.id)
                setUndo(null)
              }}
              className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-go font-semibold text-go"
            >
              <Icon name="check" size={22} /> Logged. Undo
            </button>
          ) : (
            <button
              key={k}
              onClick={() => quickLog(k)}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-surface font-semibold active:bg-surface-2"
            >
              <Icon name="plus" size={22} /> {k === 'squash' ? 'Squash' : 'Simulator'}
              {logDay !== today && (
                <span className="font-medium text-muted">{fmtDate(logDay, false)}</span>
              )}
            </button>
          ),
        )}
      </div>

      {done.length > 0 && (backupDays == null || backupDays >= 14) && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface p-3 pl-4">
          <p className="flex-1 text-[15px]">
            <strong className="block text-[17px]">Back up your log</strong>
            <span className="text-muted">Last backup: {backupText(backupDays)}</span>
          </p>
          <button
            onClick={() => backup()}
            className="h-12 shrink-0 rounded-xl bg-ink px-4 font-semibold text-bg"
          >
            Save a backup
          </button>
        </div>
      )}

      {settings.redFlag && (
        <div role="alert" className="mb-3 rounded-2xl border-2 border-danger p-4">
          <p className="display text-[22px] font-bold text-danger">Red flag logged</p>
          <p className="mt-1 text-[15px]">
            Sessions A and B are off until a physiotherapist has seen you. Clear it in Settings.
            Session C is fine.
          </p>
        </div>
      )}

      <h2 className="sr-only">Sessions</h2>
      <ul className="flex flex-col gap-2.5">
        {TYPES.map((t) => {
          const off = settings.redFlag && t !== 'C'
          const last = lastDate(t)
          return (
            <li key={t}>
              <button
                onClick={() => start(t)}
                disabled={off}
                className={`flex h-[104px] w-full items-center gap-4 rounded-2xl pl-5 pr-4 text-left disabled:opacity-35 ${plate[t].bg} ${plate[t].text}`}
              >
                <span className="num text-[84px] font-extrabold leading-none">{t}</span>
                <span className="flex-1">
                  <span className="display block text-[26px] font-bold">
                    {sessions[t].subtitle}
                  </span>
                  <span className="text-[15px] font-medium">
                    {last ? `Last done ${fmtDate(last)}` : 'Not done yet'}
                  </span>
                </span>
                <Icon name="right" size={30} />
              </button>
            </li>
          )
        })}
      </ul>

      <button
        onClick={() => start('C')}
        className="mx-auto mt-4 flex min-h-12 items-center justify-center px-4 text-[15px] font-semibold text-muted underline underline-offset-4"
      >
        Bad back day? Do Session C
      </button>
    </div>
  )
}

const BLOCK_LIFTS = [
  ['squat', 'Back squat'],
  ['deadlift', 'Deadlift'],
  ['pullup', 'Pull-up, added kg'],
] as const

function BlockComplete({ done }: { done: SessionLog[] }) {
  return (
    <section className="mb-5 rounded-2xl border-2 border-ink p-4">
      <h2 className="display text-[30px] font-bold">Block complete</h2>
      <p className="mt-1 text-[15px] text-muted">{done.length} gym sessions logged.</p>
      <dl className="mt-3 flex flex-col gap-1">
        {BLOCK_LIFTS.map(([id, name]) => {
          const series = loadSeries(done, id)
          if (!series.length) return null
          const best = Math.max(...series.map((x) => x.kg))
          return (
            <div key={id} className="flex items-baseline justify-between gap-3">
              <dt>{name}</dt>
              <dd className="num text-[20px] font-bold">
                {series[0]!.kg} to {best} kg
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="mt-3 text-[15px]">
        For the next block, update the program in <code>src/program.ts</code> and set its start date
        in Settings.
      </p>
      <a
        href="#/settings"
        className="mt-3 flex h-14 items-center justify-center rounded-xl bg-ink font-semibold text-bg"
      >
        Set the next start date
      </a>
    </section>
  )
}
