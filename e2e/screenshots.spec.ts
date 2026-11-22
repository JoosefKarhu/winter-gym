import { test, type Page } from '@playwright/test'
import { setup } from './helpers'

const heading = (page: Page, name: RegExp) => page.getByRole('heading', { name }).first().waitFor()

for (const theme of ['dark', 'light'] as const) {
  test(`screens ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await setup(page, { theme })
    const shot = (name: string, fullPage = false) =>
      page.screenshot({ path: `.impeccable/review/${theme}-${name}.png`, fullPage })

    await page.goto('/#/')
    await heading(page, /Week 8/)
    await shot('home')
    await page.goto('/#/history')
    await page.getByText('Best set load').waitFor()
    await shot('history', true)
    await page.goto('/#/guide')
    await heading(page, /Movement guide/)
    await shot('guide')
    await page.getByRole('searchbox').fill('open book')
    await shot('guide-search')
    await page.goto('/#/settings')
    await heading(page, /Settings/)
    await shot('settings', true)

    // Session B: pre-check, warm-up, first lift, rest timer.
    await page.goto('/#/')
    await page.getByRole('button', { name: /Hinge, press, carry/ }).click()
    await heading(page, /Warm-up/)
    await page.getByRole('switch', { name: /Back clearly worse/ }).click()
    await page.getByRole('button', { name: /Pain down a leg/ }).click()
    await shot('backcheck', true)
    await page.getByRole('button', { name: /Pain down a leg/ }).click()
    await page.getByRole('checkbox').first().click()
    await page.getByRole('checkbox').nth(1).click()
    await shot('warmup')
    await page.getByRole('button', { name: /Start lifting/ }).click()
    await heading(page, /Deadlift/)
    await shot('exercise')
    await page.getByRole('button', { name: /Done set 1/ }).click()
    await page.clock.runFor(20_000)
    await shot('rest')
    await page.getByRole('button', { name: 'Back to today' }).click()
    await shot('leave')
    await page.getByRole('button', { name: 'Keep it for later' }).click()
    await heading(page, /Week 8/)
    await page.getByRole('button', { name: /Mon 23 Nov: \d logged/ }).click()
    await shot('home-active')

    // Jump to the finish screen.
    await page.goto('/#/session/B')
    for (let i = 0; i < 6; i++)
      await page.getByRole('button', { name: 'Next', exact: true }).click()
    await heading(page, /Session done/)
    await shot('finish')
    await page.getByRole('button', { name: /Save session/ }).click()
    await heading(page, /History/)

    // Session C: hold timer on a mobility stretch.
    await page.goto('/#/session/C')
    await heading(page, /Warm-up/)
    await page.getByRole('button', { name: /Start part 1/ }).click()
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Next', exact: true }).click()
    await heading(page, /hip flexor/i)
    await page.getByRole('button', { name: /Start hold/ }).click()
    await page.clock.runFor(12_000)
    await shot('hold')
  })
}
