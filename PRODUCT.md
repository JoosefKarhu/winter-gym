# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript (strict), Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, Vitest, Playwright, ESLint + Prettier. Static build for GitHub Pages or Vercel. Chosen by the owner in the master prompt.

## Users

One person: the owner. Uses it on a phone in the gym between sets, with sweaty hands, phone held at arm's length or lying on a bench. Also used at home for the mobility routine and for reviewing progress.

## Product Purpose

Runs a fixed winter strength block (Oct 2026 to Mar 2027): 3 gym sessions a week (A, B, C) plus squash and golf simulator logs. It works out today's prescription (sets, reps, load, rest) from the date, the phase, deload weeks, the back check and past logs, so nothing needs deciding mid-session. Success: every session logged with no typing, loads progress correctly, the back stays fine.

## Positioning

Not a general workout logger. It encodes one program and its rules (phases, deloads, progression, back-safety rules) so the app tells you what to lift instead of asking.

## Operating Context

Gym floor (bright, noisy, basement with no signal), home floor for mobility. Week starts Monday (Finland). Units kg, metres, seconds. Language English.

## Capabilities and Constraints

- Works fully offline; data lives on the device; JSON export/import to move phones.
- Program data editable in one file (`src/program.ts`) for the next block.
- Never use the long dash character (U+2014) anywhere.
- In-session screens have priority: biggest type and targets there; home, history, guide and settings may be calmer and denser.

## Brand Commitments

Binding from the owner's brief: gym signage feel, Barlow Condensed headings, Barlow body, tabular numbers; session colours like bumper plates (A red, B blue, C yellow); dark by default, light supported; 48 px minimum targets, inputs at least 18 px; done button and timer within thumb reach; one exercise on screen at a time during a session.

## Evidence on Hand

Exercise photos from the public domain Free Exercise DB (credit required). No photos for landmine rotational press, 90/90 hip switches, open book, bird dog, figure four glute stretch: placeholder card plus owner-supplied video URL.

## Product Principles

1. The app decides, the lifter lifts: prefill everything, keyboard is the exception.
2. Back safety beats progression whenever they conflict.
3. Nothing lost: every tap is saved immediately and survives closing the app.
4. Readable at arm's length, mid-set, under bad light.

## Accessibility & Inclusion

Large targets and high contrast for wet hands and glance reading. Pass Lighthouse accessibility.
