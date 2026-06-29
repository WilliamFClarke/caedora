import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { isClerkServerConfigured } from '@/lib/accounts'

const isProtectedRoute = createRouteMatcher([
  '/billing(.*)',
  '/api/account(.*)',
  '/api/billing(.*)',
])

const clerk = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect()
  }
})

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkServerConfigured()) {
    return NextResponse.next()
  }

  return clerk(request, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
}
