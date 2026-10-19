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
