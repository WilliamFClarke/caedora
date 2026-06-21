import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  GITHUB_STATE_COOKIE,
  decodeGithubOAuthState,
} from '@/lib/server/github-oauth-state'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const clientId = process.env.GITHUB_APP_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub App client ID is not configured.' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const state = decodeGithubOAuthState(cookieStore.get(GITHUB_STATE_COOKIE)?.value)
  if (!state) {
    return NextResponse.redirect(new URL('/?github=installed', url.origin))
  }

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/github/callback`)
  authorize.searchParams.set('state', state.nonce)
  authorize.searchParams.set('prompt', 'select_account')

  return NextResponse.redirect(authorize)
}
