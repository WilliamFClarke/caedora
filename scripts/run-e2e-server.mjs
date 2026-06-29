import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const build = spawnSync(npmCommand, ['run', 'web:standalone'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
})

if (build.error) {
  console.error(build.error)
  process.exit(1)
}

if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

const server = spawn(process.execPath, ['.next/standalone/server.js'], {
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
})

const stop = (signal) => {
  if (!server.killed) {
    server.kill(signal)
  }

  setTimeout(() => process.exit(0), 1000).unref()
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
process.on('exit', () => stop('SIGTERM'))

server.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0)
    return
  }

  process.exit(code ?? 0)
})
