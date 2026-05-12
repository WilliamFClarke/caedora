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
  title: 'Caedora - Your life, documented',
  description:
    'A private, AI-ready personal wiki. Track everything about your life in markdown notes that live on your own device.',
  alternates: {
    canonical: 'https://caedora.app',
  },
  openGraph: {
    title: 'Caedora',
    description: 'Your life, fully documented. Private by design.',
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
