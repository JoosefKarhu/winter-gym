import { expect, test } from '@playwright/test'
import { setup } from './helpers'

test('set controls come before the photo, with last time shown', async ({ page }) => {
  await setup(page)
  await page.goto('/#/')
  await page.getByRole('button', { name: /Squat, pull, rotate/ }).click()
  await page.getByRole('button', { name: /Same or better/ }).click()
  await page.getByRole('button', { name: /Start lifting/ }).click()
  await expect(page.getByText('Last time')).toBeVisible()
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
  await page.getByRole('button', { name: /Same or better/ }).click()
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
  await page.getByRole('button', { name: /Tue 24 Nov: 1 logged/ }).click()
  await expect(
    page.getByRole('region', { name: 'This week' }).getByText('Squash match'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Nothing logged this day.')).toBeVisible()
})
