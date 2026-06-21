import { NextRequest, NextResponse } from 'next/server'
import { listAccessibleRepos } from '@/lib/server/github-app-repositories'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { accessToken?: string } | null
  if (!body?.accessToken) {
    return NextResponse.json({ error: 'Missing GitHub access token.' }, { status: 400 })
  }

  try {
    const repos = await listAccessibleRepos(body.accessToken)
    return NextResponse.json({
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not list GitHub repositories.' },
      { status: 400 }
    )
  }
}
