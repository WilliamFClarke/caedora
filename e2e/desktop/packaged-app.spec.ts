import { _electron as electron, expect, test } from '@playwright/test'

test('packaged desktop app starts its offline shell', async ({}, testInfo) => {
  test.setTimeout(60_000)
  const executablePath = process.env.CAEDORA_DESKTOP_EXECUTABLE
  expect(executablePath, 'CAEDORA_DESKTOP_EXECUTABLE must point at a packaged app binary').toBeTruthy()

  const app = await electron.launch({
    executablePath,
    env: {
      ...process.env,
      CAEDORA_DISABLE_GPU: '1',
    },
    args: [
      `--user-data-dir=${testInfo.outputPath('user-data')}`,
    ],
  })

  try {
    const page = await app.firstWindow()
    await expect(page).toHaveTitle(/Caedora/i)

    const desktopApi = await page.evaluate(() => {
      return {
        isDesktop: window.caedoraDesktop?.isDesktop ?? false,
        platform: window.caedoraDesktop?.platform ?? null,
      }
    })

    expect(desktopApi.isDesktop).toBe(true)
    expect(desktopApi.platform).toBeTruthy()
  } finally {
    await app.close()
  }
})
