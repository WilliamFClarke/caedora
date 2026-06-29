export const ACCOUNT_URL =
  process.env.NEXT_PUBLIC_CAEDORA_ACCOUNT_URL ?? 'https://caedora.app/account'

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
}

export function isClerkServerConfigured(): boolean {
  return isClerkConfigured() && Boolean(process.env.CLERK_SECRET_KEY)
}
