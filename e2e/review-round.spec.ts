import { expect, test } from '@playwright/test'
import { setup } from './helpers'

test('set controls come before the photo, with last time shown', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await page.getByRole('button', { name: /Squat, pull, rotate/ }).click()
  await page.getByRole('button', { name: /Start lifting/ }).click()
  await expect(page.getByText('Last full session')).toBeVisible()
  await expect(page.getByText('90 kg x 8, 8, 8, 8 on Mon 23 Nov')).toBeVisible()
  const kg = await page.getByRole('spinbutton', { name: 'kg', exact: true }).boundingBox()
  const photo = await page.getByAltText(/Back squat/).boundingBox()
  expect(kg!.y).toBeLessThan(photo!.y)
  // The whole first set card fits above the bottom bar on an iPhone 13.
  const reps = await page.getByRole('spinbutton', { name: 'Reps' }).boundingBox()
  expect(reps!.y + reps!.height).toBeLessThan(844 - 100)

  // Editing a done set: the button takes you back to the open one.
  await page.getByRole('button', { name: 'Done set 1' }).click()
  await page.getByRole('button', { name: 'Edit set 1' }).click()
  await page.getByRole('button', { name: 'Back to set 2' }).click()
  await expect(page.getByRole('button', { name: 'Done set 2' })).toBeVisible()
})

test('rest timer survives closing the app', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await page.getByRole('button', { name: /Hinge, press, carry/ }).click()
  await page.getByRole('button', { name: /Start lifting/ }).click()
  await page.getByRole('button', { name: 'Done set 1' }).click()
  await page.clock.runFor(30_000)
  await page.waitForTimeout(300)
  await page.reload()
  await expect(page.getByRole('timer', { name: 'Rest timer' })).toContainText('2:30')
})

test('Session C part 2 runs the flow as 2 rounds', async ({ page }) => {
  await setup(page, { seed: false })
  await page.goto('/#/session/C')
  await page.getByRole('button', { name: /Start part 1/ }).click()
  const next = page.getByRole('button', { name: 'Next', exact: true })
  for (let i = 0; i < 4; i++) await next.click()
  await expect(page.getByText('Part 2.')).toBeVisible()
  const order: string[] = []
  for (let i = 0; i < 10; i++) {
    const h = await page.getByRole('heading', { level: 1 }).textContent()
    const round = await page.getByText(/^Round \d of 2/).textContent()
    order.push(`${h} ${round!.slice(0, 7)}`)
    await next.click()
  }
  expect(order).toEqual([
    'Kneeling hip flexor stretch Round 1',
    'Figure four glute stretch Round 1',
    '90/90 hamstring stretch Round 1',
    'Open book Round 1',
    "Child's pose Round 1",
    'Kneeling hip flexor stretch Round 2',
    'Figure four glute stretch Round 2',
    '90/90 hamstring stretch Round 2',
    'Open book Round 2',
    "Child's pose Round 2",
  ])
  await expect(page.getByRole('heading', { name: 'Session done' })).toBeVisible()
})

test('a quick log can be deleted from its day', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await page.getByRole('button', { name: /Tue 24 Nov, 1 logged/ }).click()
  await expect(
    page.getByRole('region', { name: 'This week' }).getByText('Squash match'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Nothing logged this day.')).toBeVisible()
})

test('quick logs go to the day picked in the week strip', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await page.getByRole('button', { name: /Fri 27 Nov, 0 logged/ }).click()
  await page.getByRole('button', { name: /Simulator/ }).click()
  await expect(page.getByRole('button', { name: /Fri 27 Nov, 1 logged/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Thu 26 Nov, 0 logged/ })).toBeVisible()
})

test('a session can be kept for later or cancelled', async ({ page }) => {
  await setup(page, { seed: false })
  await page.goto('/#/session/C')
  await page.getByRole('button', { name: 'Back to today' }).click()
  await page.getByRole('button', { name: 'Keep it for later' }).click()
  await expect(page.getByText('Continue session C')).toBeVisible()
  await page.getByText('Continue session C').click()
  await page.getByRole('button', { name: 'Back to today' }).click()
  await page.getByRole('button', { name: 'Stay here' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to today' }).click()
  await page.getByRole('button', { name: 'Cancel session' }).click()
  await expect(page.getByRole('heading', { name: /Week/ })).toBeVisible()
  await expect(page.getByText('Continue session C')).toHaveCount(0)
})

test('history counts squash and simulator, in date order', async ({ page }) => {
  await setup(page)
  await page.goto('/#/history')
  const stat = (label: string) => page.locator('dt', { hasText: label }).locator('xpath=../dd')
  await expect(stat('Squash this week')).toHaveText('1')
  await expect(stat('Simulator this week')).toHaveText('2')
  await expect(
    page.getByRole('listitem', { name: /Week 8: 1 gym, 1 squash, 2 simulator/ }),
  ).toBeVisible()
  // Newest first: Wed sim, Tue squash, then Monday's session A before Monday's sim.
  const rows = page
    .getByRole('heading', { name: 'Activity' })
    .locator('xpath=following-sibling::ul[1]/li')
  await expect(rows.nth(0)).toContainText('Simulator')
  await expect(rows.nth(0)).toContainText('Wed 25 Nov')
  await expect(rows.nth(1)).toContainText('Squash match')
  await expect(rows.nth(2)).toContainText('Mon 23 Nov')
  await expect(rows.nth(3)).toContainText('Simulator')
})

test('a second squash match offers an extra deload week', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await expect(page.getByText(/squash matches this week/)).toHaveCount(0)
  await page.getByRole('button', { name: /Wed 25 Nov, \d logged/ }).click()
  await page.getByRole('button', { name: /Squash/ }).click()
  await expect(page.getByText('2 squash matches this week')).toBeVisible()
  await page.getByRole('button', { name: 'Make week 8 a deload week' }).click()
  await expect(page.getByText('Deload', { exact: true })).toBeVisible()
  await expect(page.getByText(/squash matches this week/)).toHaveCount(0)
})

test('backup nudge saves a file and goes away', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await expect(page.getByText('Last backup: never')).toBeVisible()
  const file = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save a backup' }).click()
  expect((await file).suggestedFilename()).toBe('winter-gym-2026-11-26.json')
  await expect(page.getByText('Back up your log')).toHaveCount(0)
  await page.goto('/#/settings')
  await expect(page.getByText(/Last backup:\s*today/)).toBeVisible()
})

test('after week 26 Today shows the block as complete', async ({ page }) => {
  await setup(page, { time: '2027-04-06T10:00:00' })
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: 'Block complete' })).toBeVisible()
  await expect(page.getByText('72.5 to 90 kg')).toBeVisible()
})

test('a javascript: video link is refused', async ({ page }) => {
  await setup(page, { seed: false })
  await page.goto('/#/settings')
  const field = page.getByLabel('Bird dog')
  await expect(field).toHaveCount(0) // bird dog has a photo now
  const open = page.getByLabel('Open book')
  await open.fill('javascript:alert(1)')
  await open.blur()
  await expect(page.getByText('Use a link that starts with https://')).toBeVisible()
  await page.goto('/#/guide')
  await page.getByRole('searchbox').fill('open book')
  await expect(page.getByRole('link', { name: /Watch your video/ })).toHaveCount(0)
})
