export type DownloadPlatform = 'macos' | 'windows' | 'linux'

export const REPOSITORY_URL = 'https://github.com/WilliamFClarke/caedora'
export const RELEASES_URL = 'https://github.com/WilliamFClarke/caedora/releases'

export const DESKTOP_DOWNLOADS = {
  macos: {
    appleSilicon: {
      label: 'Apple Silicon (.dmg)',
      note: 'M1, M2, M3 and newer',
      href: `${RELEASES_URL}/latest/download/Caedora-macOS-arm64.dmg`,
    },
  },
  windows: {
    installer: {
      label: 'Windows installer (.exe)',
      note: 'Windows 10 / 11, 64-bit',
      href: `${RELEASES_URL}/latest/download/Caedora-Windows-x64-Setup.exe`,
    },
  },
  linux: {
    appImage: {
      label: 'AppImage',
      note: 'Most modern x64 Linux distros',
      href: `${RELEASES_URL}/latest/download/Caedora-Linux-x64.AppImage`,
    },
  },
} as const
