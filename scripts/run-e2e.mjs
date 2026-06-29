import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const port = process.env.PLAYWRIGHT_PORT ?? '3100'
const url = `http://127.0.0.1:${port}`

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
    ...options,
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const waitForServer = async () => {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const stopServer = (server) => {
  if (server.killed) {
    return
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  server.kill('SIGTERM')
}

run(npmCommand, ['run', 'web:standalone'])

const server = spawn(process.execPath, ['.next/standalone/server.js'], {
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: port,
  },
  stdio: 'inherit',
  windowsHide: true,
})
server.unref()

try {
  await waitForServer()

  const result = spawnSync(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', '--reporter=list', ...process.argv.slice(2)],
    {
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_WEBSERVER: '1',
      },
      stdio: 'inherit',
      windowsHide: true,
    }
  )

  if (result.error) {
    console.error(result.error)
    process.exitCode = 1
  } else {
    process.exitCode = result.status ?? 1
  }
} finally {
  stopServer(server)
}
