import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { VaultProviderWrapper } from '@/components/vault-provider-wrapper'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://caedora.app'),
  title: 'Caedora - Open knowledge, entirely yours',
  description:
    'A private, AI-ready workspace for Open Knowledge Format vaults stored on your own device or GitHub repository.',
  alternates: {
    canonical: 'https://caedora.app',
  },
  openGraph: {
    title: 'Caedora',
    description: 'Open Knowledge Format vaults. Private by design.',
    type: 'website',
    url: 'https://caedora.app',
    siteName: 'Caedora',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <VaultProviderWrapper>{children}</VaultProviderWrapper>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
