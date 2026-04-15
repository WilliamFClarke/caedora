import { type NextRequest, NextResponse } from 'next/server'

type TokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')

  if (oauthError || !code) {
    return NextResponse.redirect(`${origin}/connect?error=oauth_denied`)
  }

  let tokenData: TokenResponse
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    tokenData = (await res.json()) as TokenResponse
  } catch {
    return NextResponse.redirect(`${origin}/connect?error=token_exchange`)
  }

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${origin}/connect?error=token_exchange`)
  }

  // The token is stored client-side ONLY — it never touches our database or server storage.
  const safeToken = JSON.stringify(tokenData.access_token)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Connecting vault…</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#09090b;color:#fafafa}
    .wrap{text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px}
    p{color:#71717a;font-size:.875rem}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spinner{animation:spin 1s linear infinite;color:#52525b}
  </style>
</head>
<body>
  <div class="wrap">
    <svg class="spinner" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke-opacity=".25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    <p>Connecting your vault…</p>
  </div>
  <script>
    (function () {
      try {
        localStorage.setItem('pmd_github_token', ${safeToken});
        window.location.replace('/vault');
      } catch (e) {
        window.location.replace('/connect?error=storage');
      }
    })();
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
