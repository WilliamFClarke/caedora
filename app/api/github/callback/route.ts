import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  GITHUB_STATE_COOKIE,
  decodeGithubOAuthState,
} from '@/lib/server/github-oauth-state'
import { listAccessibleRepos } from '@/lib/server/github-app-repositories'

interface GithubTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
  error?: string
  error_description?: string
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnedState = requestUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const storedState = decodeGithubOAuthState(cookieStore.get(GITHUB_STATE_COOKIE)?.value)
  cookieStore.delete(GITHUB_STATE_COOKIE)

  if (!code || !returnedState || !storedState || returnedState !== storedState.nonce) {
    return githubCompleteHtml(requestUrl.origin, {
      ok: false,
      error: 'GitHub authorization could not be verified. Please try again.',
    })
  }

  try {
    const token = await exchangeCodeForToken(code, requestUrl.origin)
    if (!token.access_token) {
      throw new Error(token.error_description || token.error || 'GitHub did not return an access token.')
    }

    const repos = await listAccessibleRepos(token.access_token)

    return githubCompleteHtml(requestUrl.origin, {
      ok: true,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      repos: repos.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        description: repo.description,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
      })),
    })
  } catch (error) {
    return githubCompleteHtml(requestUrl.origin, {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not connect GitHub.',
    })
  }
}

async function exchangeCodeForToken(code: string, origin: string): Promise<GithubTokenResponse> {
  const clientId = process.env.GITHUB_APP_CLIENT_ID
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GitHub App OAuth credentials are not configured.')
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
      code,
      redirect_uri: `${origin}/api/github/callback`,
    }),
  })

  if (!response.ok) throw new Error(`GitHub token exchange failed (${response.status}).`)
  return response.json() as Promise<GithubTokenResponse>
}

function githubCompleteHtml(
  origin: string,
  payload:
    | {
        ok: true
      accessToken: string
      refreshToken?: string
      expiresAt?: number
      repos: Array<{
        owner: string
        name: string
        fullName: string
        private: boolean
        description: string | null
        updatedAt: string
        defaultBranch: string
      }>
    }
    | { ok: false; error: string }
) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Connecting GitHub - Caedora</title>
  </head>
  <body>
    <script>
      const payload = ${JSON.stringify({ type: 'caedora:github-app', ...payload })};
      if (window.opener) {
        window.opener.postMessage(payload, ${JSON.stringify(origin)});
        window.close();
      } else {
        sessionStorage.setItem('caedora:github-app-result', JSON.stringify(payload));
        window.location.replace('/');
      }
    </script>
    <p>Returning to Caedora...</p>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
