// Fails if the long dash character appears in any tracked or new file.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const DASH = String.fromCharCode(0x2014)
const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/\.(jpe?g|png|webp|ico|woff2?)$/.test(f) && f !== 'package-lock.json')

const bad = files.filter((f) => {
  try {
    return readFileSync(f, 'utf8').includes(DASH)
  } catch {
    return false
  }
})
if (bad.length) {
  console.error('Long dash (U+2014) found in:\n' + bad.join('\n'))
  process.exit(1)
}
