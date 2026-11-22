// Pure progression, phase and deload rules. No React, no database.
import {
  DELOAD_EVERY,
  exercises,
  phases,
  sessions,
  type Equipment,
  type MainLift,
  type Measure,
  type Phase,
  type SessionType,
} from './program'

export interface SetLog {
  kg?: number
  /** Reps, seconds or metres depending on the exercise measure. */
  value?: number
  done: boolean
}

export interface ExerciseLog {
  exerciseId: string
  /** Snapshot of what was prescribed, so later sessions know what "top of range" meant. */
  target: { sets: number; min: number; max: number }
  sets: SetLog[]
}

export interface SessionLog {
  id?: number
  type: SessionType
  /** Local date YYYY-MM-DD. */
  date: string
  startedAt: number
  finishedAt?: number
  status: 'active' | 'done'
  week: number
  phase: number
  deload: boolean
  backCheck: 'same' | 'worse' | null
  warmupDone: boolean[]
  /** Screen index inside the session flow. */
  index: number
  exercises: ExerciseLog[]
  notes: Record<string, string>
  /** Running rest timer, saved so it survives the app being closed. */
  rest?: { endsAt: number; total: number }
}

// ---------- dates ----------

/** Days since epoch for a YYYY-MM-DD string, immune to DST and time zones. */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000)
}

export function isoFromDay(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10)
}

export function todayIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/** Monday of the calendar week containing the date (Finnish weeks). */
export function mondayOf(iso: string): string {
  const n = dayNumber(iso)
  const weekday = (n + 3) % 7 // 1970-01-01 was a Thursday; 0 = Monday
  return isoFromDay(n - weekday)
}

// ---------- Rule 1: phase ----------

/** Season ordinal: Jul to Dec stay as is, Jan to Jun move after December. */
function seasonOrdinal(month: number, day: number): number {
  return (month < 7 ? month + 12 : month) * 100 + day
}

export function phaseFor(iso: string): Phase {
  const [, m, d] = iso.split('-').map(Number)
  const t = seasonOrdinal(m!, d!)
  const first = phases[0]!
  const last = phases[phases.length - 1]!
  if (t < seasonOrdinal(...first.start)) return first
  return phases.find((p) => t >= seasonOrdinal(...p.start) && t <= seasonOrdinal(...p.end)) ?? last
}

// ---------- Rule 2: weeks ----------

export function blockWeek(iso: string, blockStart: string): number {
  return Math.max(1, Math.floor((dayNumber(iso) - dayNumber(blockStart)) / 7) + 1)
}

export function isDeloadWeek(week: number, extraDeloadWeeks: number[]): boolean {
  return week % DELOAD_EVERY === 0 || extraDeloadWeeks.includes(week)
}

/** First day (YYYY-MM-DD) of a block week. */
export function weekStart(week: number, blockStart: string): string {
  return isoFromDay(dayNumber(blockStart) + (week - 1) * 7)
}

// ---------- Rule 9: rounding ----------

export function loadStep(equipment: Equipment): number {
  return equipment === 'barbell' ? 2.5 : 1
}

export function roundLoad(kg: number, equipment: Equipment): number {
  const step = loadStep(equipment)
  return Math.round(kg / step) * step
}

// ---------- Rule 4: reference ----------

function byNewest(a: SessionLog, b: SessionLog) {
  return b.date.localeCompare(a.date) || b.startedAt - a.startedAt
}

function findExercise(s: SessionLog, exerciseId: string) {
  return s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done))
}

export interface Reference extends ExerciseLog {
  phase: number
  date: string
}

export function referenceLog(
  history: SessionLog[],
  type: SessionType,
  exerciseId: string,
): Reference | undefined {
  for (const s of [...history].sort(byNewest)) {
    if (s.status !== 'done' || s.type !== type || s.deload) continue
    const e = findExercise(s, exerciseId)
    if (e) return { ...e, sets: e.sets.filter((x) => x.done), phase: s.phase, date: s.date }
  }
  return undefined
}

function topKg(e: ExerciseLog): number | undefined {
  const kgs = e.sets.filter((s) => s.done && s.kg != null).map((s) => s.kg!)
  return kgs.length ? Math.max(...kgs) : undefined
}

function bestValue(e: ExerciseLog): number | undefined {
  const v = e.sets.filter((s) => s.done && s.value != null).map((s) => s.value!)
  return v.length ? Math.max(...v) : undefined
}

// ---------- Rules 3, 5, 6, 7, 8: prescription ----------

export interface PrescribeInput {
  type: SessionType
  itemIndex: number
  date: string
  deload: boolean
  backWorse: boolean
  history: SessionLog[]
}

export interface Prescription {
  exerciseId: string
  sets: number
  min: number
  max: number
  measure: Measure
  perSide: boolean
  loaded: boolean
  hold: boolean
  restSec: number
  rir?: string
  /** Prefill for the kg field (undefined = no history for a main lift, user picks). */
  kg?: number
  /** Prefill for reps / seconds / metres. */
  value: number
  hint: string
  increase: boolean
  step: number
  /** Pull-up phase 1: "max minus 2". */
  maxMinus?: number
}

export const HINT = {
  add: 'Add weight today',
  repeat: 'Repeat, aim for the top of the range',
  accessory: 'Go heavier only when every rep is clean',
  backWorse: 'Repeat last loads today, no adding',
  deload: 'Deload: lighter and fewer sets',
  phase4: 'Phase 4: about 15 percent lighter, move it fast',
  firstTime: 'No log yet: pick a load you own with clean reps',
  maxMinus: 'Max reps minus 2: stop 2 short of failure',
}

export function prescribe(input: PrescribeInput): Prescription {
  const { type, itemIndex, date, deload, backWorse, history } = input
  const item = sessions[type].items[itemIndex]
  if (!item) throw new Error(`No item ${itemIndex} in session ${type}`)
  const ex = exercises[item.exerciseId]!
  const phase = phaseFor(date)
  const ref = referenceLog(history, type, item.exerciseId)
  const refKg = ref ? topKg(ref) : undefined
  const isC = type === 'C'
  const useDeload = deload && !isC
  const round = (kg: number) => roundLoad(kg, ex.equipment)

  const base = {
    exerciseId: item.exerciseId,
    measure: item.measure,
    perSide: !!item.perSide,
    hold: !!item.hold,
    restSec: item.restSec,
    step: loadStep(ex.equipment),
    increase: false,
  }

  if (item.kind !== 'main') {
    const loaded = item.loaded
    let kg = loaded ? (refKg ?? 0) : undefined
    if (kg != null && useDeload) kg = round(kg * 0.9)
    return {
      ...base,
      sets: useDeload ? 2 : item.sets,
      min: item.min,
      max: item.max,
      loaded,
      kg,
      value: item.max,
      hint: useDeload ? HINT.deload : loaded ? HINT.accessory : '',
    }
  }

  const lift = item.exerciseId as MainLift
  const rx = phase.main[lift]
  const loaded = lift === 'pullup' ? phase.pullupLoaded : true
  const sets = useDeload ? 2 : rx.sets
  const common = { ...base, sets, min: rx.min, max: rx.max, loaded, rir: phase.rir }

  // Pull-up in phase 1: bodyweight, max minus 2.
  if (rx.maxMinus != null) {
    return {
      ...common,
      maxMinus: rx.maxMinus,
      value: (ref && bestValue(ref)) ?? 5,
      hint: useDeload ? HINT.deload : HINT.maxMinus,
    }
  }

  const value = rx.max
  const zero = lift === 'pullup' ? 0 : undefined
  if (refKg == null) {
    return { ...common, value, kg: zero, hint: zero == null ? HINT.firstTime : HINT.repeat }
  }
  if (useDeload) return { ...common, value, kg: round(refKg * 0.9), hint: HINT.deload }
  if (phase.n === 4 && ref!.phase < 4) {
    return { ...common, value, kg: round(refKg * 0.85), hint: HINT.phase4 }
  }
  if (backWorse) return { ...common, value, kg: refKg, hint: HINT.backWorse }

  const top = ref!.target.max
  const hitTop = ref!.sets.length > 0 && ref!.sets.every((s) => (s.value ?? 0) >= top)
  // A phase-1 pull-up reference has no real range, so it never counts as "top hit".
  const hadRange = ref!.target.min > 1 || ref!.target.max > 1
  if (hitTop && hadRange) {
    return {
      ...common,
      value,
      kg: round(refKg + 2.5),
      increase: true,
      hint: `${HINT.add} (${phase.addHint})`,
    }
  }
  return { ...common, value, kg: refKg, hint: HINT.repeat }
}

// ---------- PRs, history helpers, stats ----------

export function detectPRs(
  current: SessionLog,
  previous: SessionLog[],
): { exerciseId: string; kg: number }[] {
  const out: { exerciseId: string; kg: number }[] = []
  for (const e of current.exercises) {
    const now = topKg(e)
    if (now == null || now <= 0) continue
    const before = previous
      .filter((s) => s.status === 'done')
      .map((s) => findExercise(s, e.exerciseId))
      .map((x) => (x ? topKg(x) : undefined))
      .filter((x): x is number => x != null)
    if (before.length && now > Math.max(...before)) out.push({ exerciseId: e.exerciseId, kg: now })
  }
  return out
}

/** How many finished sessions included this exercise (drives the cue block default). */
export function timesDone(history: SessionLog[], exerciseId: string): number {
  return history.filter((s) => s.status === 'done' && findExercise(s, exerciseId)).length
}

export function sessionsPerWeek(history: SessionLog[], blockStart: string): Map<number, number> {
  const m = new Map<number, number>()
  for (const s of history) {
    if (s.status !== 'done') continue
    const w = blockWeek(s.date, blockStart)
    m.set(w, (m.get(w) ?? 0) + 1)
  }
  return m
}

/** Consecutive block weeks with 3+ gym sessions, ending this week (if already 3) or last week. */
export function threeSessionStreak(history: SessionLog[], blockStart: string, today: string) {
  const per = sessionsPerWeek(history, blockStart)
  let w = blockWeek(today, blockStart)
  if ((per.get(w) ?? 0) < 3) w--
  let n = 0
  while (w >= 1 && (per.get(w) ?? 0) >= 3) {
    n++
    w--
  }
  return n
}

/** Best set load per date for one exercise (chart data). Deload sessions flagged. */
export function loadSeries(history: SessionLog[], exerciseId: string) {
  return history
    .filter((s) => s.status === 'done')
    .map((s) => {
      const e = findExercise(s, exerciseId)
      return e && topKg(e) != null ? { date: s.date, kg: topKg(e)!, deload: s.deload } : undefined
    })
    .filter((x): x is { date: string; kg: number; deload: boolean } => !!x)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Everything the header needs for a given day. */
export function dayContext(date: string, blockStart: string, extraDeloadWeeks: number[]) {
  const week = blockWeek(date, blockStart)
  return { week, phase: phaseFor(date), deload: isDeloadWeek(week, extraDeloadWeeks) }
}

/** Calendar range of each phase inside the block, clipped to start at the block start. */
export function phaseRanges(
  blockStart: string,
): { n: number; name: string; short: string; from: string; to: string }[] {
  const [y, m] = blockStart.split('-').map(Number)
  const year0 = m! >= 7 ? y! : y! - 1
  const iso = ([mm, dd]: [number, number]) =>
    `${mm >= 7 ? year0 : year0 + 1}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  return phases.map((p, i) => ({
    n: p.n,
    name: p.name,
    short: p.short,
    from: i === 0 && blockStart > iso(p.start) ? blockStart : iso(p.start),
    to: iso(p.end),
  }))
}

/** One screen of a session flow: an exercise, or one round of a mobility flow item. */
export interface Step {
  item: number
  /** Set index this screen covers (mobility rounds); absent = all sets on one screen. */
  round?: number
  rounds?: number
}

/** Exercise screens in order. Mobility items run as rounds: all of them once, then again. */
export function sessionSteps(type: SessionType): Step[] {
  const items = sessions[type].items
  const steps: Step[] = []
  items.forEach((it, i) => it.kind !== 'mobility' && steps.push({ item: i }))
  const flow = items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === 'mobility')
  const rounds = Math.max(0, ...flow.map((x) => x.it.sets))
  for (let r = 0; r < rounds; r++) {
    for (const { it, i } of flow) if (r < it.sets) steps.push({ item: i, round: r, rounds })
  }
  return steps
}
