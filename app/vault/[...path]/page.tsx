import { VaultShell } from '@/components/vault/vault-shell'

interface Props {
  params: Promise<{ path: string[] }>
}

export default async function VaultNotePage({ params }: Props) {
  const { path } = await params
  const joined = path.map((seg) => decodeURIComponent(seg)).join('/')
  return <VaultShell initialPath={joined} />
}
