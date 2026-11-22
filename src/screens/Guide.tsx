import { useState } from 'react'
import { useSettings } from '../db'
import { backRules, exercises, photoCredit, sessions, warmup, type SessionType } from '../program'
import { Icon, plate } from '../ui'
import { Cues } from './Session'

const img = (name: string) => `${import.meta.env.BASE_URL}img/${name}.jpg`

export function ExercisePhoto({
  id,
  videoUrl,
  alt,
  lazy,
}: {
  id: string
  videoUrl?: string
  alt?: boolean
  lazy?: boolean
}) {
  const ex = exercises[id]!
  if (!ex.photo && !ex.photoFile) {
    return (
      <div className="flex aspect-[3/1] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 text-center">
        <p className="display text-[22px] font-bold">{ex.name}</p>
        {videoUrl ? (
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center gap-2 rounded-xl bg-ink px-4 font-semibold text-bg"
          >
            <Icon name="play" size={20} /> Watch your video
          </a>
        ) : (
          <p className="text-[15px] text-muted">
            No photo for this one. Add your own video link in Settings.
          </p>
        )}
      </div>
    )
  }
  const single = ex.photoFrame != null || !!ex.photoFile
  return (
    <figure>
      <img
        src={img(alt ? `${id}-alt` : id)}
        alt={single ? ex.name : `${ex.name}: start and finish position`}
        width={single ? 540 : 1080}
        height={360}
        loading={lazy ? 'lazy' : 'eager'}
        className={`block h-auto rounded-2xl bg-white ${single ? 'mx-auto w-1/2' : 'w-full'}`}
      />
    </figure>
  )
}

function ExerciseCard({ id, dose, note }: { id: string; dose: string; note?: string }) {
  const ex = exercises[id]!
  const { videoUrls } = useSettings()
  return (
    <article className="rounded-2xl bg-surface p-3">
      <header className="mb-3 px-1">
        <h3 className="display text-[26px] font-bold">{ex.name}</h3>
        <p className="num font-semibold">{dose}</p>
        {note && <p className="text-[15px] text-muted">{note}</p>}
      </header>
      <ExercisePhoto id={id} videoUrl={videoUrls[id]} lazy />
      {ex.altPhoto && (
        <div className="mt-3">
          <p className="mb-1 px-1 text-[15px] font-semibold text-muted">{ex.altPhoto.label}</p>
          <ExercisePhoto id={id} alt lazy />
        </div>
      )}
      {ex.photo && videoUrls[id] && (
        <a
          href={videoUrls[id]}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex min-h-12 items-center gap-2 px-1 font-semibold underline underline-offset-4"
        >
          <Icon name="play" size={18} /> Your video
        </a>
      )}
      {ex.cues && (
        <div className="-mx-3">
          <Cues cues={ex.cues} note={ex.photoNote} />
        </div>
      )}
    </article>
  )
}

export default function Guide() {
  const [q, setQ] = useState('')
  const match = (id: string) => {
    const ex = exercises[id]!
    const hay = [ex.name, ex.cues?.setup, ex.cues?.move, ex.cues?.avoid].join(' ').toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  }
  const groups: {
    key: string
    title: string
    type?: SessionType
    items: { id: string; dose: string; note?: string }[]
  }[] = [
    {
      key: 'w',
      title: 'Warm-up',
      items: warmup
        .filter((w) => w.exerciseId)
        .map((w) => ({ id: w.exerciseId!, dose: w.dose, note: w.point })),
    },
    ...(['A', 'B', 'C'] as const).map((t) => ({
      key: t,
      title: `${sessions[t].title}: ${sessions[t].subtitle}`,
      type: t,
      items: sessions[t].items.map((i) => ({
        id: i.exerciseId,
        dose: i.kind === 'main' ? 'Main lift, sets and reps follow the phase' : i.dose,
        note: i.note,
      })),
    })),
  ]
  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => match(i.id)) }))
    .filter((g) => g.items.length)

  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <h1 className="display pb-4 pt-2 text-[48px] font-extrabold">Movement guide</h1>
      <label className="relative block">
        <span className="sr-only">Search exercises</span>
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search, for example squat or hip"
          className="h-14 w-full rounded-xl bg-surface pl-12 pr-4 outline-none placeholder:text-muted/80 focus:ring-2 focus:ring-ink"
        />
      </label>

      {!q && (
        <details className="mt-4 rounded-2xl border-2 border-line">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between px-4">
            <span className="display text-[22px] font-bold">Back rules</span>
            <Icon name="chevronDown" />
          </summary>
          <ul className="flex list-disc flex-col gap-2 px-4 pb-4 pl-8">
            <li>{backRules.normal}</li>
            <li>{backRules.same}</li>
            <li>{backRules.worse}</li>
            <li>{backRules.rep}</li>
            <li>
              <strong className="text-danger">Red flags:</strong>{' '}
              {backRules.redFlags.join(', ').toLowerCase()}. {backRules.redFlagAction}
            </li>
            <li>{backRules.badDay}</li>
          </ul>
        </details>
      )}

      {filtered.map((g) => (
        <section key={g.key} className="mt-7">
          <h2 className="display mb-3 flex items-center gap-2 text-[28px] font-bold">
            {g.type && (
              <span
                className={`num grid h-8 w-9 place-items-center rounded-md text-xl font-extrabold ${plate[g.type].bg} ${plate[g.type].text}`}
              >
                {g.type}
              </span>
            )}
            {g.title}
          </h2>
          <div className="flex flex-col gap-3">
            {g.items.map((i) => (
              <ExerciseCard key={g.key + i.id} {...i} />
            ))}
          </div>
        </section>
      ))}
      {!filtered.length && (
        <p className="mt-8 text-center text-muted">No exercise matches "{q}".</p>
      )}
      <p className="mt-8 pb-4 text-center text-[15px] text-muted">
        {photoCredit}
        {Object.values(exercises)
          .filter((e) => e.photoFile)
          .map((e) => (
            <span key={e.id} className="block">
              {e.photoFile!.credit}
            </span>
          ))}
      </p>
    </div>
  )
}
