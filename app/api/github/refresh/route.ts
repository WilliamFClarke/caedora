import { NextRequest, NextResponse } from 'next/server'

interface GithubRefreshResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

export async function POST(request: NextRequest) {
  const clientId = process.env.GITHUB_APP_CLIENT_ID
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub App OAuth credentials are not configured.' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null) as { refreshToken?: string } | null
  if (!body?.refreshToken) {
    return NextResponse.json({ error: 'Missing refresh token.' }, { status: 400 })
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: body.refreshToken,
    }),
  })

  const data = await response.json().catch(() => ({})) as GithubRefreshResponse
  if (!response.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.error_description || data.error || 'Could not refresh GitHub token.' },
      { status: response.ok ? 400 : response.status }
    )
  }

  return NextResponse.json({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  })
}
