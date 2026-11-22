import Dexie, { type Table } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { todayIso, type SessionLog } from './logic'
import { DEFAULT_BLOCK_START } from './program'

export interface QuickLog {
  id?: number
  kind: 'squash' | 'sim'
  date: string
  at: number
}

export interface Settings {
  id: 1
  blockStart: string
  extraDeloadWeeks: number[]
  redFlag: boolean
  videoUrls: Record<string, string>
  theme: 'dark' | 'light' | 'system'
  lastBackupAt?: number
}

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  blockStart: DEFAULT_BLOCK_START,
  extraDeloadWeeks: [],
  redFlag: false,
  videoUrls: {},
  theme: 'dark',
}

class GymDB extends Dexie {
  sessions!: Table<SessionLog, number>
  quickLogs!: Table<QuickLog, number>
  settings!: Table<Settings, number>
  constructor() {
    super('winter-gym')
    this.version(1).stores({
      sessions: '++id, type, date, status',
      quickLogs: '++id, date, kind',
      settings: 'id',
    })
  }
}

export const db = new GymDB()

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get(1))
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = (await db.settings.get(1)) ?? DEFAULT_SETTINGS
  await db.settings.put({ ...cur, ...patch, id: 1 })
}

export function useSessions(): SessionLog[] | undefined {
  return useLiveQuery(() => db.sessions.toArray())
}

export function useActiveSession(): SessionLog | null | undefined {
  return useLiveQuery(
    async () => (await db.sessions.where('status').equals('active').first()) ?? null,
  )
}

export async function exportJson() {
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

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Saves a JSON backup: the share sheet on a phone (Files, iCloud, mail), a download elsewhere. */
export async function backup(): Promise<boolean> {
  const name = `winter-gym-${todayIso()}.json`
  const text = await exportJson()
  const file = new File([text], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
      download(name, text, 'application/json')
    }
  } else {
    download(name, text, 'application/json')
  }
  await saveSettings({ lastBackupAt: Date.now() })
  return true
}

/** Whole days since the last backup, or null if there has never been one. */
export function daysSinceBackup(s: Settings, now = Date.now()): number | null {
  return s.lastBackupAt == null ? null : Math.floor((now - s.lastBackupAt) / 86_400_000)
}
