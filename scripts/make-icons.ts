// Renders the app icons from one SVG: a red bumper plate. Run: npx tsx scripts/make-icons.ts
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const svg = (pad: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#111111"/>
<circle cx="256" cy="256" r="${200 - pad}" fill="#d7262e"/>
<circle cx="256" cy="256" r="${150 - pad * 0.75}" fill="none" stroke="#111111" stroke-opacity="0.25" stroke-width="6"/>
<circle cx="256" cy="256" r="${46 - pad * 0.2}" fill="#d9d9d4"/>
<circle cx="256" cy="256" r="${22 - pad * 0.1}" fill="#111111"/>
</svg>`

await writeFile('public/favicon.svg', svg(0))
await sharp(Buffer.from(svg(0)))
  .resize(192)
  .png()
  .toFile('public/icon-192.png')
// Maskable: keep the plate inside the 80% safe zone.
await sharp(Buffer.from(svg(40)))
  .resize(512)
  .png()
  .toFile('public/icon-512.png')
await sharp(Buffer.from(svg(0)))
  .resize(180)
  .png()
  .toFile('public/apple-touch-icon.png')
