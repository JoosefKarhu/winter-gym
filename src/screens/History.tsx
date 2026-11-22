import { useLiveQuery } from 'dexie-react-hooks'
import { useSessions, useSettings, db, type QuickLog } from '../db'
import {
  dayNumber,
  isDeloadWeek,
  loadSeries,
  phaseRanges,
  sessionsPerWeek,
  countPerWeek,
  threeSessionStreak,
  todayIso,
  blockWeek,
  weekStart,
  type SessionLog,
} from '../logic'
import {
  BLOCK_WEEKS,
  HARD_MATCHES_FOR_DELOAD,
  exercises,
  sessions,
  type SessionType,
} from '../program'
import { Badge, fmtDate, plate } from '../ui'
import { summarizeSets } from './Session'

const CHARTS: { id: string; title: string; type: SessionType }[] = [
  { id: 'squat', title: 'Back squat', type: 'A' },
  { id: 'deadlift', title: 'Deadlift', type: 'B' },
  { id: 'pullup', title: 'Pull-up, added kg', type: 'A' },
]

export default function History() {
  const all = useSessions()
  const quick = useLiveQuery(() => db.quickLogs.toArray())
  const settings = useSettings()
  if (!all || !quick) return null
  const done = all
    .filter((s) => s.status === 'done')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt)
  const today = todayIso()
  const per = sessionsPerWeek(done, settings.blockStart)
  const current = blockWeek(today, settings.blockStart)
  const thisWeek = per.get(current) ?? 0
  const streak = threeSessionStreak(done, settings.blockStart, today)
  const ofKind = (k: QuickLog['kind']) =>
    countPerWeek(
      quick.filter((q) => q.kind === k).map((q) => q.date),
      settings.blockStart,
    )
  const squash = ofKind('squash')
  const sim = ofKind('sim')
  const feed = [
    ...done.map((s) => ({ date: s.date, order: 0, at: s.startedAt, session: s, quick: undefined })),
    ...quick.map((q) => ({ date: q.date, order: 1, at: q.at, session: undefined, quick: q })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order || b.at - a.at)

  const sessionItem = (s: SessionLog) => (
    <li key={s.id}>
      <details className="rounded-2xl bg-surface">
        <summary className="flex min-h-16 cursor-pointer items-center gap-3 px-3">
          <span
            className={`num grid h-10 w-11 place-items-center rounded-lg text-2xl font-extrabold ${plate[s.type].bg} ${plate[s.type].text}`}
          >
            {s.type}
          </span>
          <span className="flex-1">
            <span className="block font-semibold">{fmtDate(s.date)}</span>
            <span className="text-[15px] text-muted">
              Week {s.week}, phase {s.phase}
              {s.finishedAt ? `, ${Math.round((s.finishedAt - s.startedAt) / 60000)} min` : ''}
            </span>
          </span>
          {s.deload && <Badge>Deload</Badge>}
        </summary>
        <ul className="divide-y divide-line border-t border-line">
          {s.exercises.map((e) => {
            const d = e.sets.filter((x) => x.done)
            return (
              <li key={e.exerciseId} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{exercises[e.exerciseId]!.name}</span>
                  <span className="num shrink-0 font-bold">
                    {d.length ? summarizeSets(d) : <span className="text-muted">skipped</span>}
                  </span>
                </div>
                {s.notes[e.exerciseId] && (
                  <p className="text-[15px] text-muted">{s.notes[e.exerciseId]}</p>
                )}
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[15px] text-muted">
          <span>
            {s.backCheck === 'worse'
              ? 'Back: clearly worse'
              : s.backCheck === 'same'
                ? 'Back: same or better'
                : sessions[s.type].subtitle}
          </span>
          <button
            onClick={() => confirm('Delete this session for good?') && db.sessions.delete(s.id!)}
            className="h-12 px-2 font-semibold text-danger"
          >
            Delete
          </button>
        </div>
      </details>
    </li>
  )

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <h1 className="display pb-4 pt-2 text-[48px] font-extrabold">History</h1>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Gym this week" value={`${thisWeek}/3`} />
        <Stat label="3-session streak" value={`${streak} wk`} />
        <Stat label="Squash this week" value={String(squash.get(current) ?? 0)} />
        <Stat label="Simulator this week" value={String(sim.get(current) ?? 0)} />
      </dl>

      <WeekBars
        gym={per}
        squash={squash}
        sim={sim}
        current={current}
        extra={settings.extraDeloadWeeks}
      />

      <h2 className="display mb-2 mt-8 text-[28px] font-bold">Best set load</h2>
      <div className="flex flex-col gap-3">
        {CHARTS.map((c) => (
          <LoadChart
            key={c.id}
            title={c.title}
            type={c.type}
            data={loadSeries(done, c.id)}
            blockStart={settings.blockStart}
            extra={settings.extraDeloadWeeks}
          />
        ))}
      </div>

      <h2 className="display mb-2 mt-8 text-[28px] font-bold">Activity</h2>
      {!feed.length && (
        <p className="text-muted">
          Nothing logged yet. Saved sessions, squash matches and simulator sessions show up here.
        </p>
      )}
      <ul className="flex flex-col gap-2 pb-4">
        {feed.map((f) =>
          f.quick ? (
            <li
              key={'q' + f.quick.id}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface pl-3 pr-1"
            >
              <span className="grid h-10 w-11 place-items-center rounded-lg border-2 border-line text-[13px] font-bold uppercase text-muted">
                {f.quick.kind === 'squash' ? 'SQ' : 'SIM'}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">
                  {f.quick.kind === 'squash' ? 'Squash match' : 'Simulator'}
                </span>
                <span className="text-[15px] text-muted">
                  {fmtDate(f.quick.date)}, week {blockWeek(f.quick.date, settings.blockStart)}
                </span>
              </span>
              <button
                onClick={() => db.quickLogs.delete(f.quick!.id!)}
                className="h-12 px-3 text-[15px] font-semibold text-danger"
              >
                Delete
              </button>
            </li>
          ) : (
            sessionItem(f.session!)
          ),
        )}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-3">
      <dt className="text-[13px] font-semibold leading-tight text-muted">{label}</dt>
      <dd className="num mt-1 text-[30px] font-extrabold leading-none">{value}</dd>
    </div>
  )
}

function WeekBars({
  gym,
  squash,
  sim,
  current,
  extra,
}: {
  gym: Map<number, number>
  squash: Map<number, number>
  sim: Map<number, number>
  current: number
  extra: number[]
}) {
  const weeks = Array.from({ length: Math.max(current, 1) }, (_, i) => i + 1).slice(-12)
  const blocks = (n: number, cls: string) =>
    Array.from({ length: n }, (_, i) => (
      <span key={i} className={`h-2 w-full rounded-[2px] ${cls}`} />
    ))
  return (
    <figure className="mt-3 rounded-2xl bg-surface p-3">
      <figcaption className="mb-3 text-[15px] font-semibold text-muted">
        Your week, one block per session
      </figcaption>
      <ol className="flex items-end gap-1.5">
        {weeks.map((w) => {
          const g = gym.get(w) ?? 0
          const sq = squash.get(w) ?? 0
          const sm = sim.get(w) ?? 0
          const heavy = sq >= HARD_MATCHES_FOR_DELOAD && !isDeloadWeek(w, extra)
          return (
            <li
              key={w}
              className="flex flex-1 flex-col items-center gap-1"
              aria-label={`Week ${w}: ${g} gym, ${sq} squash, ${sm} simulator${heavy ? ', heavy squash week without a deload' : ''}`}
            >
              <span className="flex min-h-[84px] w-full flex-col-reverse justify-start gap-[3px]">
                {blocks(g, g >= 3 ? 'bg-ink' : 'bg-ink/60')}
                {blocks(sq, heavy ? 'bg-plate-c' : 'border-2 border-ink')}
                {blocks(sm, 'bg-muted/45')}
              </span>
              <span
                className={`num text-[12px] ${w === current ? 'font-bold text-ink' : 'text-muted'} ${isDeloadWeek(w, extra) ? 'underline decoration-warn decoration-2' : ''}`}
              >
                {w}
              </span>
            </li>
          )
        })}
      </ol>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[2px] bg-ink" /> Gym
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[2px] border-2 border-ink" /> Squash
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[2px] bg-muted/45" /> Simulator
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[2px] bg-plate-c" /> {HARD_MATCHES_FOR_DELOAD}+ matches,
          no deload
        </li>
        <li className="flex items-center gap-1.5">
          <span className="num text-ink underline decoration-warn decoration-2">5</span> Deload week
        </li>
      </ul>
    </figure>
  )
}

function LoadChart({
  title,
  type,
  data,
  blockStart,
  extra,
}: {
  title: string
  type: SessionType
  data: { date: string; kg: number; deload: boolean }[]
  blockStart: string
  extra: number[]
}) {
  const W = 340
  const H = 150
  const L = 34
  const T = 18
  const B = 20
  const start = dayNumber(blockStart)
  const end = dayNumber(weekStart(BLOCK_WEEKS + 1, blockStart))
  const x = (iso: string) => L + ((dayNumber(iso) - start) / (end - start)) * (W - L - 4)
  const kgs = data.map((d) => d.kg)
  const lo = kgs.length ? Math.floor((Math.min(...kgs) - 5) / 5) * 5 : 0
  const hi = kgs.length ? Math.ceil((Math.max(...kgs) + 5) / 5) * 5 : 100
  const y = (kg: number) =>
    T + (1 - (kg - Math.max(0, lo)) / (hi - Math.max(0, lo) || 1)) * (H - T - B)
  const deloads = Array.from({ length: BLOCK_WEEKS }, (_, i) => i + 1).filter((w) =>
    isDeloadWeek(w, extra),
  )
  const last = data[data.length - 1]

  return (
    <figure className="rounded-2xl bg-surface p-3">
      <figcaption className="mb-1 flex items-baseline justify-between">
        <span className="font-semibold">{title}</span>
        <span className="num text-[22px] font-extrabold">{last ? `${last.kg} kg` : ''}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`${title} best set load over the block`}
      >
        {phaseRanges(blockStart).map((p, i) => (
          <g key={p.n}>
            <rect
              x={x(p.from)}
              y={T}
              width={Math.max(0, x(p.to) - x(p.from) + 2)}
              height={H - T - B}
              fill={i % 2 ? 'var(--surface-2)' : 'transparent'}
            />
            <text
              x={x(p.from) + 4}
              y={12}
              fontSize="11"
              fontWeight="600"
              fill="var(--muted)"
              fontFamily="Barlow"
            >
              {p.n} {p.short}
            </text>
          </g>
        ))}
        {deloads.map((w) => (
          <rect
            key={w}
            x={x(weekStart(w, blockStart))}
            y={T}
            width={(7 / (end - start)) * (W - L - 4)}
            height={H - T - B}
            fill="var(--warn)"
            opacity="0.18"
          />
        ))}
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <text
            key={v}
            x={L - 6}
            y={y(Math.max(v, 0)) + 4}
            fontSize="11"
            textAnchor="end"
            fill="var(--muted)"
            fontFamily="Barlow"
          >
            {Math.max(v, 0)}
          </text>
        ))}
        <line x1={L} x2={W} y1={H - B} y2={H - B} stroke="var(--line)" />
        {data.length > 1 && (
          <polyline
            points={data.map((d) => `${x(d.date)},${y(d.kg)}`).join(' ')}
            fill="none"
            stroke={plate[type].fill}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={x(d.date)}
            cy={y(d.kg)}
            r="3.5"
            fill={d.deload ? 'var(--surface)' : plate[type].fill}
            stroke={plate[type].fill}
            strokeWidth="2"
          />
        ))}
        {!data.length && (
          <text
            x={(W + L) / 2}
            y={H / 2 + 6}
            textAnchor="middle"
            fontSize="14"
            fill="var(--muted)"
            fontFamily="Barlow"
          >
            No sessions logged yet
          </text>
        )}
        <text x={L} y={H - 4} fontSize="11" fill="var(--muted)" fontFamily="Barlow">
          {fmtDate(blockStart, false)}
        </text>
        <text
          x={W}
          y={H - 4}
          fontSize="11"
          textAnchor="end"
          fill="var(--muted)"
          fontFamily="Barlow"
        >
          {fmtDate(weekStart(BLOCK_WEEKS + 1, blockStart), false)}
        </text>
      </svg>
      <p className="mt-1 text-[13px] text-muted">
        Shaded: phases. Yellow: deload weeks. Hollow dots: deload sessions.
      </p>
    </figure>
  )
}
