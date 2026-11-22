// Downloads start/finish photos from Free Exercise DB (public domain), plus single credited photos
// (photoFile) for moves the DB lacks, joins them side by side
// with "1" and "2" labels and writes compressed JPEGs to public/img. Run: npm run photos
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { exercises, photoBaseUrl } from '../src/program'

const FRAME_W = 540
const H = 360
const OUT = new URL('../public/img/', import.meta.url)

async function frame(dbId: string, n: 0 | 1, label?: string) {
  const res = await fetch(`${photoBaseUrl}/${dbId}/${n}.jpg`)
  if (!res.ok) throw new Error(`${dbId}/${n}.jpg: HTTP ${res.status}`)
  const img = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(FRAME_W, H, { fit: 'contain', background: '#ffffff' })
    .toBuffer()
  if (!label) return img
  const tag = Buffer.from(
    `<svg width="44" height="44"><rect width="44" height="44" rx="10" fill="#141414"/>` +
      `<text x="22" y="31" font-size="26" font-weight="700" font-family="Helvetica, Arial" fill="#fff" text-anchor="middle">${label}</text></svg>`,
  )
  return sharp(img)
    .composite([{ input: tag, left: 10, top: 10 }])
    .toBuffer()
}

async function pair(dbId: string, file: string) {
  const [a, b] = await Promise.all([frame(dbId, 0, '1'), frame(dbId, 1, '2')])
  await sharp({ create: { width: FRAME_W * 2, height: H, channels: 3, background: '#ffffff' } })
    .composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: FRAME_W, top: 0 },
    ])
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(new URL(file, OUT).pathname)
}

await mkdir(OUT, { recursive: true })
for (const ex of Object.values(exercises)) {
  if (ex.photoFile) {
    const res = await fetch(ex.photoFile.url, {
      headers: { 'User-Agent': 'winter-gym-photo-script/1.0' },
    })
    if (!res.ok) throw new Error(`${ex.id}: HTTP ${res.status}`)
    await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(FRAME_W, H, { fit: 'cover' })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(new URL(`${ex.id}.jpg`, OUT).pathname)
    console.log('ok', ex.id)
    continue
  }
  if (!ex.photo) continue
  if (ex.photoFrame != null) {
    await sharp(await frame(ex.photo, ex.photoFrame))
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(new URL(`${ex.id}.jpg`, OUT).pathname)
  } else {
    await pair(ex.photo, `${ex.id}.jpg`)
  }
  if (ex.altPhoto) await pair(ex.altPhoto.id, `${ex.id}-alt.jpg`)
  console.log('ok', ex.id)
}
