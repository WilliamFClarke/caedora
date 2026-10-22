# GitHub vaults with several writers

A GitHub vault is often written by more than Caedora: a scheduled workflow that
refreshes Datasets, an assistant that commits through the GitHub API, or another
device. Caedora works on the basis that any file it has open may change on
GitHub at any time.

## Saving

Every save to a GitHub vault is a commit made with the Contents API. Caedora
sends the blob SHA of the text the edit started from, so GitHub refuses the
write if anyone else has committed to that file since it was opened.

When that happens Caedora reads the newest version and merges it with the edit,
line by line:

- If the two changes touch different lines, the merged text is committed
  straight away and the editor shows the other writer's change alongside yours.
  The `generated` stamp in the frontmatter never counts as an overlap, and the
  merged commit carries your stamp.
- If both changes touch the same lines, or lines next to each other, nothing is
  written and a "Changed on GitHub" banner appears above the note. Reload drops
  your unsaved edit and shows the version on GitHub. Keep mine commits your
  version over theirs.

Saving waits while the banner is showing, so an edit is never written over
someone else's change without you choosing it.

## Seeing other writers' changes

Caedora checks the vault every 30 seconds while the tab is visible, and again
when you return to the tab. GitHub may serve a listing from its cache for up to
a minute, so a new commit can take a little longer to appear.

- The open note is read again when its SHA changes, unless it has an unsaved
  edit, in which case the next save merges the two as described above.
- An open dashboard reads its Datasets again when any of them changes, so its
  numbers update after a sync workflow runs without clicking Sync.

## Staying connected

A GitHub App connection uses an access token that lasts eight hours and a
refresh token that works once. Each refresh returns a new pair, and the old
refresh token stops working straight away.

- Caedora renews the token shortly before it expires, and once more if GitHub
  answers a request with 401, then repeats the request.
- The new pair is saved to every stored vault that shared the old one, because
  vaults connected in the same GitHub sign in share a token chain.
- Refreshing runs under a Web Lock, so two tabs never spend the same refresh
  token. A tab that waited for the lock uses the pair the other tab saved.
- If GitHub refuses the refresh token, the vault shows "GitHub connection
  expired" with a Reconnect GitHub button instead of a bare 401.

Tokens stay in this browser's IndexedDB. The refresh route only forwards the
refresh token to GitHub along with the app secret and stores nothing.
