export interface GithubRepoResponse {
  name: string
  full_name: string
  owner: { login: string }
  private: boolean
  description: string | null
  updated_at: string
  default_branch: string
  permissions?: {
    admin?: boolean
    maintain?: boolean
    push?: boolean
    pull?: boolean
  }
}

interface GitHubInstallationResponse {
  installations: Array<{
    id: number
  }>
}

interface GitHubInstallationReposResponse {
  repositories: GithubRepoResponse[]
}

export async function listAccessibleRepos(token: string): Promise<GithubRepoResponse[]> {
  const installations = await listUserInstallations(token)
  const reposByFullName = new Map<string, GithubRepoResponse>()

  for (const installation of installations) {
    const repos = await listInstallationRepos(token, installation.id)
    for (const repo of repos) {
      if (!canWriteRepository(repo)) continue
      reposByFullName.set(repo.full_name, repo)
    }
  }

  return Array.from(reposByFullName.values()).sort((a, b) => {
    return Date.parse(b.updated_at) - Date.parse(a.updated_at)
  })
}

async function listUserInstallations(token: string): Promise<GitHubInstallationResponse['installations']> {
  const installations: GitHubInstallationResponse['installations'] = []
  let page = 1

  while (page <= 10) {
    const url = new URL('https://api.github.com/user/installations')
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))

    const response = await fetch(url, { headers: githubHeaders(token) })

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string }
      const details = body.message || `GitHub returned ${response.status}.`
      throw new Error(`Could not list GitHub App installations available to Caedora. ${details}`)
    }

    const result = (await response.json()) as GitHubInstallationResponse
    const pageInstallations = result.installations ?? []
    installations.push(...pageInstallations)
    if (pageInstallations.length < 100) break
    page += 1
  }

  return installations
}

async function listInstallationRepos(token: string, installationId: number): Promise<GithubRepoResponse[]> {
  const repos: GithubRepoResponse[] = []
  let page = 1

  while (page <= 10) {
    const url = new URL(`https://api.github.com/user/installations/${installationId}/repositories`)
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))

    const response = await fetch(url, { headers: githubHeaders(token) })

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string }
      const details = body.message || `GitHub returned ${response.status}.`
      throw new Error(`Could not list repositories selected for Caedora. ${details}`)
    }

    const result = (await response.json()) as GitHubInstallationReposResponse
    const pageRepos = result.repositories ?? []
    repos.push(...pageRepos)
    if (pageRepos.length < 100) break
    page += 1
  }

  return repos
}

function canWriteRepository(repo: GithubRepoResponse): boolean {
  return Boolean(repo.permissions?.admin || repo.permissions?.maintain || repo.permissions?.push)
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}
