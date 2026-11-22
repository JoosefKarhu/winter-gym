# Design

Gym signage on a dark rubber floor. Session colour comes from bumper plates. Numbers are the main
content, so they are big, condensed and tabular.

## Tokens (src/index.css)

| Role                | Dark                        | Light                       |
| ------------------- | --------------------------- | --------------------------- |
| bg                  | #111111                     | #f3f2ee                     |
| surface / surface-2 | #1a1a1a / #262626           | #ffffff / #e8e7e2           |
| line                | #333332                     | #d4d2cb                     |
| ink / muted         | #f2f1ec / #a6a59e           | #141414 / #5a5953           |
| plate A (red)       | #d7262e, white text         | #c81e26                     |
| plate B (blue)      | #2160d9, white text         | #1a55c9                     |
| plate C (yellow)    | #f5c400, near-black text    | #f2c200                     |
| go / warn / danger  | #3ccf7e / #f5c400 / #ff5a52 | #13804a / #8a6a00 / #c4261e |

Dark is the default (bright gym, phone held low). Light and system are in Settings.

## Type

- Display: Barlow Condensed 600 to 800, uppercase (`.display`). Screen titles 40 to 64 px.
- Numbers: Barlow Condensed with tabular figures (`.num`). Stepper values 34 px, timers 56 to 72 px.
- Body: Barlow 400 to 600, 17 px; secondary 15 px. Inputs at least 18 px.
- Fonts are self-hosted via @fontsource so they work offline.

## Components and rules

- Session plate: a full-width block in the session colour with the letter at 84 px (home), or a
  small letter tag in headers, history and the guide.
- Stepper: 64 px minus/plus buttons each side of a 64 px number field. Labels sit inside the field.
- One exercise per screen. The selected set is a bordered card in the session colour. Other sets are
  one-line rows you can tap to edit.
- Bottom bar (thumb zone): back arrow, primary action in the session colour, next arrow, all 64 px.
- Signature: rest and hold timers dock above the bottom bar. The session colour drains from left
  to right as time runs out.
- Radius: 12 px controls, 16 px cards. No shadows except the toast.
- Icons: authored 24 px SVG, 2.2 px stroke (src/ui.tsx).
- Minimum tap target 48 px. Lighthouse accessibility 100 on every screen.
