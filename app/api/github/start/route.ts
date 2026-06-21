import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  GITHUB_STATE_COOKIE,
  encodeGithubOAuthState,
  type GithubOAuthState,
} from '@/lib/server/github-oauth-state'

export async function GET(request: NextRequest) {
  const appSlug = process.env.GITHUB_APP_SLUG
  const clientId = process.env.GITHUB_APP_CLIENT_ID

  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  if (mode !== 'open') {
    return NextResponse.json(
      { error: 'GitHub can only open an existing Caedora vault.' },
      { status: 400 }
    )
  }

  const state: GithubOAuthState = {
    nonce: crypto.randomUUID(),
    mode: 'open',
  }

  const cookieStore = await cookies()
  cookieStore.set(GITHUB_STATE_COOKIE, encodeGithubOAuthState(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    path: '/',
    maxAge: 10 * 60,
  })

  if (url.searchParams.get('oauth') === '1') {
    if (!clientId) {
      return NextResponse.json({ error: 'GitHub App client ID is not configured.' }, { status: 500 })
    }
    const authorize = new URL('https://github.com/login/oauth/authorize')
    authorize.searchParams.set('client_id', clientId)
    authorize.searchParams.set('redirect_uri', `${url.origin}/api/github/callback`)
    authorize.searchParams.set('state', state.nonce)
    return NextResponse.redirect(authorize)
  }

  if (!appSlug) {
    return NextResponse.json({ error: 'GitHub App slug is not configured.' }, { status: 500 })
  }
  return NextResponse.redirect(`https://github.com/apps/${appSlug}/installations/new`)
}
