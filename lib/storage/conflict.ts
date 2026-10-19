/**
 * Thrown by a provider's writeFile when the file changed underneath the
 * caller, for example when another writer committed to the same GitHub file
 * after it was read. Carries the current remote text so the caller can merge
 * or ask the person what to keep without another round trip.
 */
export class WriteConflictError extends Error {
  constructor(
    readonly path: string,
    /** Where the other change came from, shown to the person, e.g. "GitHub". */
    readonly source: string,
    readonly remoteContent: string
  ) {
    super(`${path} changed on ${source} since it was opened.`)
    this.name = 'WriteConflictError'
  }
}

export function isWriteConflict(error: unknown): error is WriteConflictError {
  return error instanceof WriteConflictError
}
