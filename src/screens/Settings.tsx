import { useState } from 'react'
import { db, saveSettings, useSettings, DEFAULT_SETTINGS, type Settings } from '../db'
import { DELOAD_EVERY, exercises, sessions } from '../program'
import { Icon } from '../ui'
import type { SessionLog } from '../logic'

const WEEKS = 26

async function exportJson() {
  const data = {
    app: 'winter-gym',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: (await db.settings.get(1)) ?? DEFAULT_SETTINGS,
    sessions: await db.sessions.toArray(),
    quickLogs: await db.quickLogs.toArray(),
  }
  return JSON.stringify(data, null, 2)
}

async function exportCsv() {
  const rows = [
    [
      'date',
      'session',
      'week',
      'phase',
      'deload',
      'exercise',
      'set',
      'kg',
      'value',
      'unit',
      'done',
      'note',
    ],
  ]
  const all = (await db.sessions.toArray()).filter((s) => s.status === 'done')
  for (const s of all.sort((a, b) => a.date.localeCompare(b.date))) {
    s.exercises.forEach((e, i) => {
      const unit = sessions[s.type].items[i]?.measure ?? ''
      e.sets.forEach((x, j) =>
        rows.push([
          s.date,
          s.type,
          String(s.week),
          String(s.phase),
          s.deload ? '1' : '0',
          exercises[e.exerciseId]?.name ?? e.exerciseId,
          String(j + 1),
          x.kg == null ? '' : String(x.kg),
          x.value == null ? '' : String(x.value),
          unit,
          x.done ? '1' : '0',
          s.notes[e.exerciseId] ?? '',
        ]),
      )
    })
  }
  for (const q of await db.quickLogs.toArray())
    rows.push([q.date, q.kind, '', '', '', '', '', '', '', '', '1', ''])
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
    .join('\n')
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Validates an export file before it replaces everything on this phone. */
function parseImport(text: string) {
  const d = JSON.parse(text) as {
    app?: string
    sessions?: unknown
    quickLogs?: unknown
    settings?: unknown
  }
  if (d.app !== 'winter-gym' || !Array.isArray(d.sessions) || !Array.isArray(d.quickLogs)) {
    throw new Error('This is not a Winter Gym export file.')
  }
  const okSession = (s: SessionLog) =>
    typeof s === 'object' &&
    ['A', 'B', 'C'].includes(s.type) &&
    /^\d{4}-\d\d-\d\d$/.test(s.date) &&
    Array.isArray(s.exercises)
  if (!(d.sessions as SessionLog[]).every(okSession))
    throw new Error('Some sessions in the file are damaged.')
  return d as {
    sessions: SessionLog[]
    quickLogs: { kind: 'squash' | 'sim'; date: string; at: number }[]
    settings?: Settings
  }
}

export default function SettingsScreen() {
  const s = useSettings()
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const flash = (text: string, bad = false) => {
    setMsg({ text, bad })
    setTimeout(() => setMsg(null), 4000)
  }
  const noPhoto = Object.values(exercises).filter((e) => !e.photo)

  async function copy(make: () => Promise<string>, what: string) {
    try {
      await navigator.clipboard.writeText(await make())
      flash(`${what} copied`)
    } catch {
      flash('Copy failed. Use download instead.', true)
    }
  }

  async function importFile(file: File) {
    try {
      const d = parseImport(await file.text())
      if (
        !confirm(
          `Replace everything on this phone with ${d.sessions.length} sessions from the file?`,
        )
      )
        return
      await db.transaction('rw', db.sessions, db.quickLogs, db.settings, async () => {
        await db.sessions.clear()
        await db.quickLogs.clear()
        await db.sessions.bulkAdd(d.sessions)
        await db.quickLogs.bulkAdd(d.quickLogs)
        if (d.settings) await db.settings.put({ ...DEFAULT_SETTINGS, ...d.settings, id: 1 })
      })
      flash(`Imported ${d.sessions.length} sessions`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Import failed', true)
    }
  }

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <h1 className="display pb-4 pt-2 text-[48px] font-extrabold">Settings</h1>

      {s.redFlag && (
        <Section title="Red flag">
          <p>
            Sessions A and B are hidden. Clear this only after a physiotherapist has cleared you.
          </p>
          <button
            onClick={() =>
              confirm('Has a physiotherapist cleared you for loaded hinging and squatting?') &&
              saveSettings({ redFlag: false })
            }
            className="mt-3 h-14 w-full rounded-xl border-2 border-danger font-bold text-danger"
          >
            Clear red flag
          </button>
        </Section>
      )}

      <Section title="Block">
        <label className="block">
          <span className="font-semibold">Block start date</span>
          <span className="block text-[15px] text-muted">Week 1 starts on this date.</span>
          <input
            type="date"
            value={s.blockStart}
            onChange={(e) => e.target.value && saveSettings({ blockStart: e.target.value })}
            className="mt-2 h-14 w-full rounded-xl bg-surface-2 px-4 outline-none focus:ring-2 focus:ring-ink"
          />
        </label>
        <fieldset className="mt-5">
          <legend className="font-semibold">Extra deload weeks</legend>
          <p className="text-[15px] text-muted">
            Squash tournament or more than one hard match that week. Every {DELOAD_EVERY}th week is
            always a deload.
          </p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {Array.from({ length: WEEKS }, (_, i) => i + 1).map((w) => {
              const fixed = w % DELOAD_EVERY === 0
              const on = fixed || s.extraDeloadWeeks.includes(w)
              return (
                <button
                  key={w}
                  disabled={fixed}
                  aria-pressed={on}
                  aria-label={`Week ${w}${fixed ? ', planned deload' : ''}`}
                  onClick={() =>
                    saveSettings({
                      extraDeloadWeeks: on
                        ? s.extraDeloadWeeks.filter((x) => x !== w)
                        : [...s.extraDeloadWeeks, w].sort((a, b) => a - b),
                    })
                  }
                  className={`num h-12 rounded-lg text-[18px] font-bold ${on ? 'bg-warn text-[#141414]' : 'bg-surface-2'} ${fixed ? 'opacity-60' : ''}`}
                >
                  {w}
                </button>
              )
            })}
          </div>
        </fieldset>
      </Section>

      <Section title="Theme">
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1"
        >
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={s.theme === t}
              onClick={() => saveSettings({ theme: t })}
              className={`h-12 rounded-lg font-semibold capitalize ${s.theme === t ? 'bg-ink text-bg' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Your videos">
        <p className="text-[15px] text-muted">
          These moves have no good photo. Paste a link to a video you trust.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {noPhoto.map((e) => (
            <label key={e.id} className="block">
              <span className="font-semibold">{e.name}</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://"
                defaultValue={s.videoUrls[e.id] ?? ''}
                onBlur={(ev) =>
                  saveSettings({ videoUrls: { ...s.videoUrls, [e.id]: ev.target.value.trim() } })
                }
                className="mt-1 h-14 w-full rounded-xl bg-surface-2 px-4 outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-ink"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Your data">
        <p className="text-[15px] text-muted">
          Everything lives on this phone. Export it to move phones or keep a backup.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DataButton
            icon="download"
            onClick={async () =>
              download(
                `winter-gym-${new Date().toISOString().slice(0, 10)}.json`,
                await exportJson(),
                'application/json',
              )
            }
          >
            JSON file
          </DataButton>
          <DataButton icon="copy" onClick={() => copy(exportJson, 'JSON')}>
            Copy JSON
          </DataButton>
          <DataButton
            icon="download"
            onClick={async () =>
              download(
                `winter-gym-${new Date().toISOString().slice(0, 10)}.csv`,
                await exportCsv(),
                'text/csv',
              )
            }
          >
            CSV file
          </DataButton>
          <DataButton icon="copy" onClick={() => copy(exportCsv, 'CSV')}>
            Copy CSV
          </DataButton>
        </div>
        <label className="mt-2 flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-line font-semibold focus-within:ring-2 focus-within:ring-ink">
          <Icon name="upload" size={22} /> Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importFile(f)
              e.target.value = ''
            }}
          />
        </label>
      </Section>

      <p className="pb-6 pt-2 text-center text-[13px] text-muted">
        Winter Gym Block. Works offline.
      </p>

      {msg && (
        <p
          role="status"
          className={`fixed inset-x-4 bottom-20 z-40 mx-auto max-w-[480px] rounded-xl px-4 py-3 text-center font-semibold shadow-[0_6px_24px_rgba(0,0,0,0.35)] ${msg.bad ? 'bg-danger text-white' : 'bg-ink text-bg'}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-surface p-4">
      <h2 className="display mb-3 text-[26px] font-bold">{title}</h2>
      {children}
    </section>
  )
}

function DataButton({
  icon,
  onClick,
  children,
}: {
  icon: 'download' | 'copy'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 items-center justify-center gap-2 rounded-xl bg-surface-2 font-semibold active:scale-[0.98]"
    >
      <Icon name={icon} size={22} /> {children}
    </button>
  )
}
