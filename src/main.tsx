import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import './index.css'
import App from './App'

// A new version waits until you are out of a session, so a reload never lands mid-set.
let updateReady = false
const reloadIfIdle = () => {
  if (updateReady && !location.hash.startsWith('#/session')) location.reload()
}
registerSW({
  immediate: true,
  onNeedReload() {
    updateReady = true
    reloadIfIdle()
  },
})
addEventListener('hashchange', reloadIfIdle)

// Ask the browser not to clear this app's data when the phone runs low or the app sits unused.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
