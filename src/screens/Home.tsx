import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, useActiveSession, useSessions, useSettings, type QuickLog } from '../db'
import { dayContext, dayNumber, isoFromDay, mondayOf, todayIso } from '../logic'
import { exercises, sessions, type SessionType } from '../program'
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
  const [undo, setUndo] = useState<{ id: number; kind: QuickLog['kind'] } | null>(null)

  const done = (all ?? []).filter((s) => s.status === 'done')
  const lastDate = (t: SessionType) =>
    done.filter((s) => s.type === t).sort((a, b) => b.date.localeCompare(a.date))[0]?.date

  async function quickLog(kind: QuickLog['kind']) {
    const id = await db.quickLogs.add({ kind, date: today, at: Date.now() })
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

  const activeItem = active ? sessions[active.type].items[active.index - 1] : undefined

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="pb-5 pt-2">
        <p className="text-[15px] font-semibold text-muted">{fmtDate(today)}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="display text-[64px] font-extrabold">Week {ctx.week}</h1>
          {ctx.deload && (
            <div className="mb-2">
              <Badge tone="warn">Deload</Badge>
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

      {active && (
        <a
          href={'#/session/' + active.type}
          className={`mb-5 flex min-h-[72px] items-center justify-between gap-3 rounded-2xl px-5 py-3 ${plate[active.type].bg} ${plate[active.type].text}`}
        >
          <span>
            <span className="display block text-[26px] font-bold">
              Continue session {active.type}
            </span>
            <span className="text-[15px] font-medium opacity-90">
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
            return (
              <li
                key={d}
                aria-label={fmtDate(d)}
                className={`flex min-h-[104px] flex-col items-center gap-1 rounded-xl pb-2 pt-1.5 ${isToday ? 'bg-surface-2 ring-2 ring-ink' : 'bg-surface'}`}
              >
                <span className="text-xs font-semibold text-muted">{DAY_LETTERS[i]}</span>
                <span className="num text-xl font-bold leading-none">{Number(d.slice(8))}</span>
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
                      title={q.kind === 'squash' ? 'Squash' : 'Simulator'}
                    >
                      {q.kind === 'squash' ? 'SQ' : 'SIM'}
                    </span>
                  ))}
                </span>
              </li>
            )
          })}
        </ol>
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
              <Icon name="plus" size={22} /> {k === 'squash' ? 'Squash match' : 'Simulator'}
            </button>
          ),
        )}
      </div>

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
                className={`flex h-[104px] w-full items-center gap-4 rounded-2xl pl-5 pr-4 text-left transition-transform active:scale-[0.99] disabled:opacity-35 ${plate[t].bg} ${plate[t].text}`}
              >
                <span className="num text-[84px] font-extrabold leading-none">{t}</span>
                <span className="flex-1">
                  <span className="display block text-[26px] font-bold">
                    {sessions[t].subtitle}
                  </span>
                  <span className="text-[15px] font-medium opacity-90">
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
