import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/connect?error=invalid_state', request.url))
  }

  // Clear the state cookie
  cookieStore.delete('oauth_state')

  // TODO: Exchange code for access token via GitHub API
  // TODO: Encrypt and store token in a secure httpOnly cookie (never server-side)
  // The token must only ever live client-side — this is our privacy guarantee

  return NextResponse.redirect(new URL('/vault', request.url))
}
