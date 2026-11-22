// Builds a realistic export file: weeks 1 to 7 of the block, then the given extra sessions.
import { blockWeek, phaseFor, type SessionLog } from '../src/logic'
import { sessions, type SessionType } from '../src/program'

const START = '2026-10-05'
const day = (offset: number) => new Date(Date.UTC(2026, 9, 5 + offset)).toISOString().slice(0, 10)

function session(
  type: SessionType,
  date: string,
  kgFor: (id: string, week: number) => number | undefined,
): SessionLog {
  const week = blockWeek(date, START)
  const phase = phaseFor(date)
  const deload = type !== 'C' && week % 5 === 0
  return {
    type,
    date,
    startedAt: Date.parse(date + 'T17:00:00Z'),
    finishedAt: Date.parse(date + 'T18:02:00Z'),
    status: 'done',
    week,
    phase: phase.n,
    deload,
    backCheck: type === 'C' ? null : 'same',
    warmupDone: Array(6).fill(true),
    index: 0,
    notes: date === '2026-11-16' && type === 'A' ? { pullup: 'Last rep slow' } : {},
    exercises: sessions[type].items.map((it) => {
      const main = it.kind === 'main' ? phase.main[it.exerciseId as 'squat'] : undefined
      const n = deload ? 2 : (main?.sets ?? it.sets)
      const max = main ? main.max : it.max
      const loaded = it.exerciseId === 'pullup' ? phase.pullupLoaded : it.loaded
      const kg = loaded ? kgFor(it.exerciseId, week) : undefined
      return {
        exerciseId: it.exerciseId,
        target: { sets: n, min: main?.min ?? it.min, max },
        sets: Array.from({ length: n }, (_, j) => ({
          kg: kg == null ? undefined : deload ? Math.round((kg * 0.9) / 2.5) * 2.5 : kg,
          value: main?.maxMinus ? 7 - j : j === n - 1 && week % 2 ? max - 1 : max,
          done: true,
        })),
      }
    }),
  }
}

const loads: Record<string, (w: number) => number> = {
  squat: (w) => 70 + w * 2.5,
  deadlift: (w) => 90 + w * 5,
  pullup: (w) => (w >= 7 ? 2.5 : 0),
  backext: () => 5,
  chop: () => 18,
  pallof: () => 14,
  landmine: () => 15,
  dbrow: () => 26,
  suitcase: () => 28,
  goblet: () => 16,
  slrdl: () => 12,
}

export function fixture(extra: SessionLog[] = [], theme: 'dark' | 'light' = 'dark') {
  const out: SessionLog[] = []
  for (let w = 0; w < 7; w++) {
    out.push(session('A', day(w * 7), (id) => loads[id]?.(w + 1)))
    out.push(session('B', day(w * 7 + 2), (id) => loads[id]?.(w + 1)))
    if (w !== 3) out.push(session('C', day(w * 7 + 4), (id) => loads[id]?.(w + 1)))
  }
  // Week 8 so far: Monday A.
  out.push(session('A', day(49), (id) => loads[id]?.(8)))
  return {
    app: 'winter-gym',
    version: 1,
    settings: {
      id: 1,
      blockStart: START,
      extraDeloadWeeks: [],
      redFlag: false,
      videoUrls: {},
      theme,
    },
    sessions: [...out, ...extra],
    quickLogs: [
      { kind: 'squash', date: day(50), at: 0 },
      { kind: 'sim', date: day(49), at: 0 },
      { kind: 'sim', date: day(51), at: 0 },
    ],
  }
}
