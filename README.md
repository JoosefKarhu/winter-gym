# Winter Gym Block

A phone-first, offline workout tracker for one winter strength block (October 2026 to March 2027).
It works out each session's sets, reps and loads from the date, the phase, deload weeks, the
back check and your past logs.

Built with Vite, React, TypeScript, Tailwind CSS, Dexie (IndexedDB) and vite-plugin-pwa. All data
stays on the phone.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173. To try it on your phone over Wi-Fi, run `npm run dev -- --host` and open
the network URL it prints.

## Test

```bash
npm test            # Vitest: every progression, phase and deload rule (src/logic.test.ts)
npm run typecheck
npm run lint        # ESLint, Prettier, and a check that no file contains the long dash
npx playwright install chromium   # once
npm run e2e         # full Session A, back check, red flag, reload, PWA offline, screenshots
```

The screenshot spec writes every screen in light and dark at 390 x 844 to `.impeccable/review/`.

## Build and deploy

```bash
npm run build       # static site in dist/
npm run preview     # serve the build locally, service worker included
```

**Vercel:** import the repository. Framework preset: Vite. Build command `npm run build`, output
directory `dist`. Nothing else to set.

**GitHub Pages:** a project site lives under `/<repo-name>/`, so build with that base path:

```bash
BASE=/<repo-name>/ npm run build
```

Then publish `dist/`, for example with a GitHub Action using `actions/upload-pages-artifact` (path
`dist`) and `actions/deploy-pages`, with `BASE=/${{ github.event.repository.name }}/` set on the build
step. A user site (`<name>.github.io`) needs no `BASE`.

On the phone, open the site in Safari, tap Share, then **Add to Home Screen**. After the first
load it works with no signal.

## Moving phones

Settings > Your data > JSON file. On the new phone: Settings > Import JSON. Import replaces
everything on that phone. CSV export (one row per set) is for spreadsheets.

## Editing the program for the next block

Everything lives in `src/program.ts`. No UI code needs to change.

- `DEFAULT_BLOCK_START`: the Monday that week 1 starts (also changeable in Settings).
- `phases`: dates as `[month, day]`. October to December count as the start year, January to June
  as the next year. Main lift sets and rep ranges per phase are in `main`.
- `sessions.A / B / C .items`: order, sets, target (`min` to `max`), `measure` (reps, secs,
  metres), `restSec`, `loaded` (show a kg field), `hold` (show the hold timer), `perSide`.
- `exercises`: name, `equipment` (sets rounding: barbell 2.5 kg, everything else 1 kg), cues, and
  `photo` (a Free Exercise DB id). New photos: `npm run photos` downloads and joins them into
  `public/img/`. Commit the images so building never needs the network.
- `warmup`, `backRules`: text shown in the app.

Run `npm test` after editing. The tests check the rules against this block's dates, so update
the dates in `src/logic.test.ts` too.

## Rules, as built

1. Phase from the date (table in `program.ts`). Dates before or after the block count as phase 1 or phase 4.
2. Block week = whole weeks since the block start, plus 1. Weeks 5, 10, 15, 20, 25 and any extra
   week marked in Settings are deloads.
3. Deload (A and B only): 2 sets for every exercise, load about 10 percent under the reference.
4. Reference = latest saved, non-deload session of the same type with that exercise.
5. Main lifts: every set at the top of the range gives +2.5 kg and "Add weight today", otherwise
   repeat the load. Reps prefill at the top of the range.
6. First session in phase 4: reference x 0.85.
7. Accessories: last load, never increased automatically.
8. Back "clearly worse": same loads, no increases, banner shown.
9. Rounding: barbell lifts 2.5 kg, dumbbells, plates and cables 1 kg. Pull-up added weight steps in
   2.5 kg like the barbell lifts.

When rules overlap: deload, then the phase 4 drop, then the bad back rule, then normal progression.
A red flag hides A and B until you clear it in Settings.

Photos: Free Exercise DB (github.com/yuhonas/free-exercise-db), public domain.
