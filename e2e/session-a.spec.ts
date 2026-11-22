import { expect, test } from '@playwright/test'
import { setup } from './helpers'

test('full Session A, then the next Session A prefills progressed loads', async ({ page }) => {
  // Thursday of block week 7: phase 2 Build, not a deload week, empty database.
  await setup(page, { time: '2026-11-19T17:30:00', seed: false })
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: /Week 7/ })).toBeVisible()

  await page.getByRole('button', { name: /Squat, pull, rotate/ }).click()

  // Warm-up checklist.
  const boxes = page.getByRole('checkbox')
  await expect(boxes).toHaveCount(6)
  for (let i = 0; i < 6; i++) await boxes.nth(i).click()
  await expect(page.getByText('6/6')).toBeVisible()
  await expect(page.getByText(/lighter sets of/)).toContainText('back squat')
  await page.getByRole('button', { name: /Start lifting/ }).click()

  const done = (n: number) => page.getByRole('button', { name: `Done set ${n}` }).click()
  const next = () => page.getByRole('button', { name: /Next exercise|Finish/ }).click()

  // 1. Back squat: first time, no prefill. 4 x 8 at 100 kg.
  await expect(page.getByRole('heading', { name: 'Back squat' })).toBeVisible()
  await expect(page.getByText('4 x 6 to 8')).toBeVisible()
  await page.getByRole('spinbutton', { name: 'kg', exact: true }).fill('100')
  for (let n = 1; n <= 4; n++) await done(n)
  await expect(page.getByRole('timer', { name: 'Rest timer' })).toBeVisible()
  await expect(page.getByText('All sets done')).toBeVisible()
  await next()

  // 2. Pull-up: added weight starts at 0 kg in phase 2.
  await expect(page.getByRole('spinbutton', { name: 'Added kg' })).toHaveValue('0')
  for (let n = 1; n <= 4; n++) await done(n)
  await next()

  // 3. Back extension: hold a 5 kg plate, using the stepper.
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'kg plus 1' }).click()
  for (let n = 1; n <= 3; n++) await done(n)
  await next()

  // 4. Cable chop, 5. Pallof press.
  for (let n = 1; n <= 3; n++) await done(n)
  await next()
  for (let n = 1; n <= 3; n++) await done(n)
  await next()

  // 6. Side plank: one set with the hold timer (2 sides), one without.
  await page.getByRole('button', { name: /Start hold 30 s/ }).click()
  await expect(page.getByRole('timer', { name: 'Hold timer' })).toContainText('Side 1')
  await page.clock.runFor(31_000)
  await expect(page.getByRole('timer', { name: 'Hold timer' })).toContainText(/Switch sides|Side 2/)
  await page.clock.runFor(34_000)
  await expect(page.getByRole('button', { name: /Start hold/ })).toBeVisible()
  await page.getByRole('button', { name: 'Log without the timer' }).click()
  await next()

  // Finish and save.
  await expect(page.getByRole('heading', { name: 'Session done' })).toBeVisible()
  await expect(page.getByText('19/19')).toBeVisible()
  await page.getByRole('button', { name: /Save session/ }).click()

  // History shows it.
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
  await page.getByText('Thu 19 Nov').click()
  await expect(page.getByText('100x8  100x8  100x8  100x8')).toBeVisible()

  // Monday: next Session A progresses the main lifts, keeps accessories.
  await page.clock.setSystemTime(new Date('2026-11-23T17:30:00'))
  await page.goto('/#/')
  await page.getByRole('button', { name: /Squat, pull, rotate/ }).click()
  await page.getByRole('button', { name: /Start lifting/ }).click()
  await expect(page.getByRole('spinbutton', { name: 'kg', exact: true })).toHaveValue('102.5')
  await expect(page.getByText(/Add weight today/)).toBeVisible()
  const arrow = () => page.getByRole('button', { name: 'Next', exact: true }).click()
  await arrow()
  await expect(page.getByRole('spinbutton', { name: 'Added kg' })).toHaveValue('2.5')
  await arrow()
  await expect(page.getByRole('spinbutton', { name: 'kg', exact: true })).toHaveValue('5')
  await expect(page.getByText('Go heavier only when every rep is clean')).toBeVisible()
})

test('back clearly worse switch blocks the increase', async ({ page }) => {
  await setup(page, { time: '2026-11-26T17:30:00' })
  await page.goto('/#/')
  await page.getByRole('button', { name: /Squat, pull, rotate/ }).click()
  const sw = page.getByRole('switch', { name: /Back clearly worse today/ })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: /Start lifting/ }).click()
  await expect(page.getByRole('status')).toHaveText('Repeat last loads today, no adding')
  // Fixture week 8 squat was 90 kg x 8 on all sets: would be +2.5, blocked here.
  await expect(page.getByRole('spinbutton', { name: 'kg', exact: true })).toHaveValue('90')
})

test('red flag hides Sessions A and B until cleared', async ({ page }) => {
  await setup(page, { seed: false })
  await page.goto('/#/')
  await page.getByRole('button', { name: /Hinge, press, carry/ }).click()
  await page.getByRole('button', { name: /Pain down a leg/ }).click()
  await page.getByRole('button', { name: 'I have one of these' }).click()
  await expect(page.getByRole('button', { name: /Squat, pull, rotate/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Mobility and maintenance/ })).toBeEnabled()
  await expect(page.getByText('Continue session')).toHaveCount(0)
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Clear red flag' }).click()
  await page.goto('/#/')
  await expect(page.getByRole('button', { name: /Squat, pull, rotate/ })).toBeEnabled()
})

test('in-progress session survives a reload', async ({ page }) => {
  await setup(page, { seed: false })
  await page.goto('/#/session/C')
  await page.getByRole('checkbox').first().click()
  await expect(page.getByText('1/6')).toBeVisible()
  await page.waitForTimeout(300) // let IndexedDB commit before the hard reload
  await page.reload()
  await page.goto('/#/')
  await expect(page.getByText('Continue session C')).toBeVisible()
  await page.getByText('Continue session C').click()
  await expect(page.getByText('1/6')).toBeVisible()
})
