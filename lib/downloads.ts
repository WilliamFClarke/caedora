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
      label: 'Installer (.exe)',
      note: 'Windows 10 / 11, 64-bit',
      href: `${RELEASES_URL}/latest/download/Caedora.Setup.0.1.0.exe`,
    },
  },
  linux: {
    appImage: {
      label: 'AppImage',
      note: 'Works on most modern distros',
      href: `${RELEASES_URL}/latest/download/Caedora-0.1.0.AppImage`,
    },
  },
} as const
