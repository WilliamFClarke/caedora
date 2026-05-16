export type DownloadPlatform = 'macos' | 'windows' | 'linux'

export const RELEASES_URL = 'https://github.com/WilliamFClarke/caedora/releases'

export const DESKTOP_DOWNLOADS = {
  macos: {
    appleSilicon: {
      label: 'Apple Silicon (.dmg)',
      note: 'M1, M2, M3 and newer',
      href: `${RELEASES_URL}/latest/download/Caedora-macOS-arm64.dmg`,
    },
  },
} as const
