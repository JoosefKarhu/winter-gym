import { describe, expect, it } from 'vitest'
import {
  blockWeek,
  detectPRs,
  isDeloadWeek,
  phaseFor,
  prescribe,
  referenceLog,
  roundLoad,
  sessionsPerWeek,
  countPerWeek,
  threeSessionStreak,
  type SessionLog,
  type ExerciseLog,
  sessionSteps,
} from './logic'

const START = '2026-10-05'

function log(
  type: 'A' | 'B' | 'C',
  date: string,
  exercises: ExerciseLog[],
  extra: Partial<SessionLog> = {},
): SessionLog {
  return {
    type,
    date,
    startedAt: 0,
    status: 'done',
    week: blockWeek(date, START),
    phase: phaseFor(date).n,
    deload: false,
    backCheck: 'same',
    warmupDone: [],
    index: 0,
    exercises,
    notes: {},
    ...extra,
  }
}

const squat = (kg: number, reps: number[], max = 8): ExerciseLog => ({
  exerciseId: 'squat',
  target: { sets: reps.length, min: max, max },
  sets: reps.map((r) => ({ kg, value: r, done: true })),
})

describe('Rule 1: phase comes from the date', () => {
  it.each([
    ['2026-10-05', 1],
    ['2026-11-15', 1],
    ['2026-11-16', 2],
    ['2026-12-31', 2],
    ['2027-01-01', 3],
    ['2027-02-28', 3],
    ['2027-03-01', 4],
    ['2027-03-31', 4],
  ])('%s is phase %i', (d, n) => expect(phaseFor(d).n).toBe(n))

  it('clamps dates outside the block', () => {
    expect(phaseFor('2026-09-20').n).toBe(1)
    expect(phaseFor('2027-04-10').n).toBe(4)
  })
})

describe('Rule 2: block week and deload weeks', () => {
  it('week 1 starts on the block start date', () => {
    expect(blockWeek('2026-10-05', START)).toBe(1)
    expect(blockWeek('2026-10-11', START)).toBe(1)
    expect(blockWeek('2026-10-12', START)).toBe(2)
    expect(blockWeek('2026-11-22', START)).toBe(7)
    expect(blockWeek('2026-11-23', START)).toBe(8)
  })
  it('handles the DST change in late October', () => {
    expect(blockWeek('2026-10-26', START)).toBe(4)
    expect(blockWeek('2026-11-02', START)).toBe(5)
  })
  it('never goes below 1', () => expect(blockWeek('2026-09-01', START)).toBe(1))
  it('every 5th week is a deload', () => {
    for (const w of [5, 10, 15, 20, 25]) expect(isDeloadWeek(w, [])).toBe(true)
    for (const w of [1, 4, 6, 9, 11]) expect(isDeloadWeek(w, [])).toBe(false)
  })
  it('extra deload weeks from settings', () => expect(isDeloadWeek(7, [7])).toBe(true))
})

describe('Rule 3: deload prescription', () => {
  const history = [log('A', '2026-11-16', [squat(100, [8, 8, 8, 8])])]
  it('2 sets and about 10 percent lighter, rounded to 2.5 kg', () => {
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2026-12-07',
      deload: true,
      backWorse: false,
      history,
    })
    expect(p.sets).toBe(2)
    expect(p.kg).toBe(90)
  })
  it('accessories also drop to 2 sets and 10 percent', () => {
    const h = [
      log('B', '2026-11-17', [
        {
          exerciseId: 'dbrow',
          target: { sets: 3, min: 10, max: 10 },
          sets: [{ kg: 26, value: 10, done: true }],
        },
      ]),
    ]
    const p = prescribe({
      type: 'B',
      itemIndex: 3,
      date: '2026-12-08',
      deload: true,
      backWorse: false,
      history: h,
    })
    expect(p.sets).toBe(2)
    expect(p.kg).toBe(23) // 23.4 rounded to 1 kg
  })
  it('Session C never changes on deload', () => {
    const p = prescribe({
      type: 'C',
      itemIndex: 0,
      date: '2026-12-09',
      deload: true,
      backWorse: false,
      history: [],
    })
    expect(p.sets).toBe(3)
  })
})

describe('Rule 4: reference load', () => {
  it('is the latest non-deload log of the exercise in the same session type', () => {
    const h = [
      log('A', '2026-11-16', [squat(100, [8, 8, 8, 8])]),
      log('A', '2026-12-07', [squat(90, [8, 8])], { deload: true }),
      log('B', '2026-12-08', [squat(50, [5])]),
    ]
    expect(referenceLog(h, 'A', 'squat')?.sets[0]?.kg).toBe(100)
  })
  it('ignores sessions still in progress', () => {
    const h = [log('A', '2026-11-16', [squat(100, [8])], { status: 'active' })]
    expect(referenceLog(h, 'A', 'squat')).toBeUndefined()
  })
})

describe('Rule 5: main lift progression', () => {
  it('all sets at the top of the range: +2.5 kg and "Add weight today"', () => {
    const h = [log('A', '2026-11-16', [squat(100, [8, 8, 8, 8])])]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2026-11-19',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.kg).toBe(102.5)
    expect(p.hint).toContain('Add weight today')
    expect(p.hint).toContain('+2.5 to 5 kg')
    expect(p.increase).toBe(true)
  })
  it('any set short of the top: same load and "Repeat"', () => {
    const h = [log('A', '2026-11-16', [squat(100, [8, 8, 7, 6])])]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2026-11-19',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.kg).toBe(100)
    expect(p.hint).toBe('Repeat, aim for the top of the range')
    expect(p.increase).toBe(false)
  })
  it('phase 2 uses 4 x 6 to 8 and prefills the top of the range', () => {
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2026-11-19',
      deload: false,
      backWorse: false,
      history: [],
    })
    expect([p.sets, p.min, p.max, p.value]).toEqual([4, 6, 8, 8])
    expect(p.kg).toBeUndefined()
  })
  it('phase 3 hint is +2.5 kg only', () => {
    const h = [log('A', '2027-01-04', [squat(110, [6, 6, 6, 6], 6)])]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2027-01-07',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.kg).toBe(112.5)
    expect(p.hint).not.toContain('to 5 kg')
  })
  it('pull-up in phase 1 has no kg field and prefills last best reps', () => {
    const h = [
      log('A', '2026-10-05', [
        {
          exerciseId: 'pullup',
          target: { sets: 3, min: 1, max: 1 },
          sets: [6, 5, 5].map((v) => ({ value: v, done: true })),
        },
      ]),
    ]
    const p = prescribe({
      type: 'A',
      itemIndex: 1,
      date: '2026-10-08',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.loaded).toBe(false)
    expect(p.value).toBe(6)
  })
  it('pull-up from phase 2 prefills 0 kg added weight with no history', () => {
    const p = prescribe({
      type: 'A',
      itemIndex: 1,
      date: '2026-11-19',
      deload: false,
      backWorse: false,
      history: [],
    })
    expect(p.loaded).toBe(true)
    expect(p.kg).toBe(0)
  })
})

describe('Rule 6: first session in phase 4', () => {
  it('prefills reference x 0.85 rounded to 2.5 kg', () => {
    const h = [log('A', '2027-02-25', [squat(120, [6, 6, 6, 6], 6)])]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2027-03-01',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.kg).toBe(102.5) // 102
    expect(p.increase).toBe(false)
  })
  it('later phase 4 sessions progress normally', () => {
    const h = [
      log('A', '2027-02-25', [squat(120, [6, 6, 6, 6], 6)]),
      log('A', '2027-03-01', [squat(102.5, [5, 5, 5], 5)]),
    ]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2027-03-04',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.kg).toBe(105)
  })
})

describe('Rule 7: accessories', () => {
  it('prefill the last load and never auto increase', () => {
    const h = [
      log('B', '2026-11-17', [
        {
          exerciseId: 'dbrow',
          target: { sets: 3, min: 10, max: 10 },
          sets: [10, 10, 10].map((v) => ({ kg: 26, value: v, done: true })),
        },
      ]),
    ]
    const p = prescribe({
      type: 'B',
      itemIndex: 3,
      date: '2026-11-20',
      deload: false,
      backWorse: false,
      history: h,
    })
    expect(p.kg).toBe(26)
    expect(p.increase).toBe(false)
    expect(p.hint).toBe('Go heavier only when every rep is clean')
  })
  it('loaded accessories with no history start at 0 kg; holds prefill seconds', () => {
    expect(
      prescribe({
        type: 'A',
        itemIndex: 2,
        date: '2026-11-19',
        deload: false,
        backWorse: false,
        history: [],
      }).kg,
    ).toBe(0)
    const plank = prescribe({
      type: 'A',
      itemIndex: 5,
      date: '2026-11-19',
      deload: false,
      backWorse: false,
      history: [],
    })
    expect([plank.measure, plank.value, plank.hold]).toEqual(['secs', 30, true])
  })
})

describe('Rule 8: back clearly worse', () => {
  it('blocks the increase and repeats the last load', () => {
    const h = [log('A', '2026-11-16', [squat(100, [8, 8, 8, 8])])]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2026-11-19',
      deload: false,
      backWorse: true,
      history: h,
    })
    expect(p.kg).toBe(100)
    expect(p.increase).toBe(false)
    expect(p.hint).toBe('Repeat last loads today, no adding')
  })
  it('deload still wins over a bad back', () => {
    const h = [log('A', '2026-11-16', [squat(100, [8, 8, 8, 8])])]
    const p = prescribe({
      type: 'A',
      itemIndex: 0,
      date: '2026-12-07',
      deload: true,
      backWorse: true,
      history: h,
    })
    expect(p.kg).toBe(90)
  })
})

describe('Rule 9: rounding', () => {
  it('barbell to 2.5 kg', () => {
    expect(roundLoad(91.3, 'barbell')).toBe(92.5)
    expect(roundLoad(90.9, 'barbell')).toBe(90)
  })
  it('dumbbells, plates and cables to 1 kg', () => {
    expect(roundLoad(23.4, 'dumbbell')).toBe(23)
    expect(roundLoad(9.5, 'plate')).toBe(10)
    expect(roundLoad(13.6, 'cable')).toBe(14)
  })
})

describe('PRs and stats', () => {
  it('a heavier top set than ever before is a PR', () => {
    const prev = [log('A', '2026-11-16', [squat(100, [8])])]
    const now = log('A', '2026-11-19', [squat(102.5, [8])])
    expect(detectPRs(now, prev)).toEqual([{ exerciseId: 'squat', kg: 102.5 }])
    expect(detectPRs(log('A', '2026-11-19', [squat(100, [8])]), prev)).toEqual([])
  })
  it('first ever log of a lift is not a PR', () => {
    expect(detectPRs(log('A', '2026-11-19', [squat(100, [8])]), [])).toEqual([])
  })
  it('counts gym sessions per block week and the 3-session streak', () => {
    const h = [
      ...['2026-11-09', '2026-11-11', '2026-11-13'].map((d) => log('A', d, [])),
      ...['2026-11-16', '2026-11-18', '2026-11-20'].map((d) => log('B', d, [])),
      log('C', '2026-11-23', []),
    ]
    expect(sessionsPerWeek(h, START).get(7)).toBe(3)
    // Current week 8 has 1 so far: streak counts the completed weeks before it.
    expect(threeSessionStreak(h, START, '2026-11-24')).toBe(2)
    expect(threeSessionStreak(h, START, '2026-12-01')).toBe(0)
  })
})

describe('session steps', () => {
  it('A and B are one screen per exercise', () => {
    expect(sessionSteps('A').map((x) => x.item)).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('Session C part 2 runs as 2 rounds of the whole flow', () => {
    const c = sessionSteps('C')
    expect(c).toHaveLength(4 + 5 * 2)
    expect(c.slice(4, 9).map((x) => [x.item, x.round])).toEqual([
      [4, 0],
      [5, 0],
      [6, 0],
      [7, 0],
      [8, 0],
    ])
    expect(c.slice(9).map((x) => [x.item, x.round])).toEqual([
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
    ])
  })
})

describe('quick logs per week', () => {
  it('counts squash dates by block week', () => {
    const m = countPerWeek(['2026-11-24', '2026-11-27', '2026-12-01'], START)
    expect(m.get(8)).toBe(2)
    expect(m.get(9)).toBe(1)
  })
})
