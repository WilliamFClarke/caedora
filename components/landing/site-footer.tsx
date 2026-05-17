import Link from 'next/link'
import Image from 'next/image'
import { REPOSITORY_URL } from '@/lib/downloads'

export function SiteFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/caedora-logo.png" alt="" width={18} height={18} />
          <span className="text-foreground font-medium">Caedora</span>
          <span className="text-xs">— your notes, your storage.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-foreground transition">
            Home
          </Link>
          <Link href="/download" className="hover:text-foreground transition">
            Download
          </Link>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
