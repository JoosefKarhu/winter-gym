import Dexie, { type Table } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SessionLog } from './logic'
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
