import { type NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return new NextResponse('GitHub OAuth is not configured on this server.', { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo',
    redirect_uri: `${req.nextUrl.origin}/api/auth/github/callback`,
  })

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  )
}
