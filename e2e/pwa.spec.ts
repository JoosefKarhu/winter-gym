import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://localhost:5198', serviceWorkers: 'allow' })

test('installable manifest, service worker, and works offline', async ({ page, context }) => {
  await page.goto('/')
  const manifestHref = await page.locator('link[rel=manifest]').getAttribute('href')
  const manifest = await (await page.request.get(manifestHref!)).json()
  expect(manifest).toMatchObject({
    name: 'Winter Gym Block',
    display: 'standalone',
    start_url: '/',
  })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  )
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.goto('/#/guide')
  await expect(page.getByRole('heading', { name: 'Movement guide' })).toBeVisible()
  const img = page.locator('img').first()
  await img.scrollIntoViewIfNeeded()
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
    .toBeGreaterThan(0)
  await page.goto('/#/session/C')
  await expect(page.getByRole('heading', { name: 'Warm-up' })).toBeVisible()
})
