import { useEffect, useState } from 'react'
import { useSettings } from './db'
import { Icon, type IconName } from './ui'
import Home from './screens/Home'
import Session from './screens/Session'
import History from './screens/History'
import Guide from './screens/Guide'
import SettingsScreen from './screens/Settings'
import type { SessionType } from './program'

function useHash() {
  const [hash, setHash] = useState(() => location.hash.replace(/^#\/?/, ''))
  useEffect(() => {
    const on = () => {
      setHash(location.hash.replace(/^#\/?/, ''))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export function go(path: string) {
  location.hash = '#/' + path
}

const tabs: { path: string; label: string; icon: IconName }[] = [
  { path: '', label: 'Today', icon: 'home' },
  { path: 'history', label: 'History', icon: 'chart' },
  { path: 'guide', label: 'Guide', icon: 'book' },
  { path: 'settings', label: 'Settings', icon: 'gear' },
]

export default function App() {
  const route = useHash()
  const settings = useSettings()

  useEffect(() => {
    const dark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#111111' : '#f3f2ee')
  }, [settings.theme])

  const [head, arg] = route.split('/')
  if (head === 'session' && (arg === 'A' || arg === 'B' || arg === 'C')) {
    return <Session type={arg as SessionType} />
  }

  const screen =
    head === 'history' ? (
      <History />
    ) : head === 'guide' ? (
      <Guide />
    ) : head === 'settings' ? (
      <SettingsScreen />
    ) : (
      <Home />
    )

  return (
    <div className="mx-auto min-h-dvh max-w-[520px] pb-24">
      <main>{screen}</main>
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-[520px]">
          {tabs.map((t) => {
            const active = (head ?? '') === t.path
            return (
              <li key={t.label} className="flex-1">
                <a
                  href={'#/' + t.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold ${active ? 'text-ink' : 'text-muted'}`}
                >
                  <Icon name={t.icon} size={24} />
                  {t.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
