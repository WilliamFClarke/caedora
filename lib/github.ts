const GITHUB_API = 'https://api.github.com'

function apiHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export type GitHubUser = {
  login: string
  name: string | null
  avatar_url: string
}

export type GitHubRepo = {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  updated_at: string
  default_branch: string
  language: string | null
}

export type GitHubContent = {
  name: string
  path: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  sha: string
  size: number
  download_url: string | null
}

export async function getUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: apiHeaders(token),
  })
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: failed to fetch user`)
  return res.json() as Promise<GitHubUser>
}

export async function listRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?sort=updated&per_page=100&affiliation=owner`,
    { headers: apiHeaders(token) }
  )
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: failed to list repos`)
  return res.json() as Promise<GitHubRepo[]>
}

export async function getContents(
  token: string,
  repo: string,
  path = ''
): Promise<GitHubContent[]> {
  const url = path
    ? `${GITHUB_API}/repos/${repo}/contents/${path}`
    : `${GITHUB_API}/repos/${repo}/contents`
  const res = await fetch(url, { headers: apiHeaders(token) })
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: failed to fetch contents`)
  const data = (await res.json()) as GitHubContent | GitHubContent[]
  return Array.isArray(data) ? data : [data]
}
