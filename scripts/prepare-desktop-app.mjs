import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const copyDesktopApp = !process.argv.includes('--standalone-only')
const standaloneRoot = path.join(root, '.next', 'standalone')
const standaloneStatic = path.join(standaloneRoot, '.next', 'static')
const desktopAppRoot = path.join(root, '.desktop-app')

await rm(path.join(standaloneRoot, 'public'), { recursive: true, force: true })
await rm(standaloneStatic, { recursive: true, force: true })
await mkdir(path.join(standaloneRoot, '.next'), { recursive: true })

await cp(path.join(root, 'public'), path.join(standaloneRoot, 'public'), {
  recursive: true,
})
await cp(path.join(root, '.next', 'static'), standaloneStatic, {
  recursive: true,
})

if (copyDesktopApp) {
  await rm(desktopAppRoot, { recursive: true, force: true })
  await cp(standaloneRoot, desktopAppRoot, {
    recursive: true,
    dereference: true,
  })
}
