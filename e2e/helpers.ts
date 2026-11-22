import type { Page } from '@playwright/test'
import { fixture } from './fixture'

/** Freezes the clock (Thursday of block week 8 unless given) and imports the fixture via Settings. */
export async function setup(
  page: Page,
  opts: { time?: string; theme?: 'dark' | 'light'; seed?: boolean } = {},
) {
  await page.clock.install({ time: new Date(opts.time ?? '2026-11-26T17:30:00') })
  await page.goto('/#/settings')
  page.on('dialog', (d) => d.accept())
  if (opts.seed !== false) {
    await page.locator('input[type=file]').setInputFiles({
      name: 'seed.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixture([], opts.theme ?? 'dark'))),
    })
    await page.getByText(/Imported \d+ sessions/).waitFor()
  } else if (opts.theme === 'light') {
    await page.getByRole('radio', { name: 'light' }).click()
  }
}
