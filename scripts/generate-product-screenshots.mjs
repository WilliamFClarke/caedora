import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = process.env.SCREENSHOT_PORT ?? '3200'
const baseURL = process.env.SCREENSHOT_BASE_URL ?? `http://127.0.0.1:${port}`
const reuseServer = process.argv.includes('--reuse-server') || Boolean(process.env.SCREENSHOT_BASE_URL)

const shots = [
  ['hero', 'public/landing/hero.png'],
  ['editor', 'public/landing/editor.png'],
  ['templates', 'public/landing/templates.png'],
  ['argus', 'public/landing/argus.png'],
  ['connected', 'public/landing/connected.png'],
]

let server = null

try {
  if (!reuseServer) {
    const command = `npm run dev -- --hostname 127.0.0.1 --port ${port}`
    server = spawn(command, {
      cwd: root,
      env: { ...process.env, BROWSER: 'none' },
      shell: true,
      stdio: 'inherit',
    })
  }

  await waitForServer(`${baseURL}/product-screenshots`)

  const launchOptions = process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {}
  const browser = await chromium.launch(launchOptions)
  const context = await browser.newContext({
    viewport: { width: 1520, height: 940 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(`${baseURL}/product-screenshots`, { waitUntil: 'networkidle' })

  for (const [name, output] of shots) {
    const target = page.locator(`[data-product-screenshot="${name}"]`)
    await target.scrollIntoViewIfNeeded()
    await mkdir(path.dirname(path.join(root, output)), { recursive: true })
    await target.screenshot({
      path: path.join(root, output),
      animations: 'disabled',
    })
    console.log(`Wrote ${output}`)
  }

  await browser.close()
} finally {
  if (server) {
    server.kill()
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 60_000
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`)
}
