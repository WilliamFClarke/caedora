# Open Knowledge Format support

Caedora treats OKF v0.2 as its native knowledge model. New knowledge collections
are called **bundles**, and non-reserved Markdown files are **concepts**.

## Standards contract

Every concept:

- is a UTF-8 Markdown file;
- has a path-based concept ID;
- begins with parseable YAML frontmatter;
- has a non-empty `type`;
- may use `title`, `description`, `resource`, and `tags`;
- may carry the v0.2 provenance, trust and lifecycle families: `sources` (with
  `usage_window`), `generated`, `verified`, `status`, and `stale_after`;
- preserves unknown producer-defined YAML fields;
- uses standard Markdown links for graph relationships.

`index.md` and `log.md` are reserved at every directory level. Root `index.md`
declares `okf_version: "0.2"`. Broken links remain consumable but appear as
conformance warnings.

## Provenance, trust and lifecycle

- Every timestamp is an ISO 8601 datetime with an explicit offset, for example
  `2026-06-30T14:00:00Z`. Anything else is a conformance warning.
- `generated: { by, at }` records who wrote the current content and when.
  Edits in the editor record `human:owner`, starter concepts and templates
  record `caedora/app`, and `caedora-mcp` records `caedora-mcp/0.2.0` unless the
  calling agent passes `generatedBy`. Argus records `argus/<model>`.
- `verified` is a list of `{ by, at }` confirmations. A bare mapping is read as a
  single entry. The trust tier (unverified, machine confirmed, human reviewed)
  is derived from it, never stored. "Mark as reviewed" in the Details panel
  appends a `human:owner` entry without touching `generated`.
- `status` is `draft`, `stable` or `deprecated`; absent means stable. Draft and
  deprecated concepts show a badge under the description, as do concepts past
  `stale_after`.
- `sources` entries need a `resource`; Caedora lists them in the Details panel
  and `ingest_source` records the source URL there. Claims cite a source with a
  Markdown footnote whose label is the source `id`.
- `type: Attested Computation` concepts are accepted and warn when `runtime` is
  missing. Caedora does not run executors or attesters.

### Migrating from v0.1

Existing v0.1 vaults open unchanged. A legacy `timestamp` is still read as the
last change time, and it is replaced by `generated` the next time the concept is
saved in Caedora or through `caedora-mcp`. Legacy `# Citations` sections remain
ordinary Markdown.

A new bundle starts with exactly one `welcome.md` concept and one generated
root `index.md`. `log.md` is created only when Caedora records a meaningful
operation.

## LLM Wiki operating model

Caedora implements the pattern as three logical layers:

1. Source concepts under `sources/` preserve evidence and provenance.
2. Maintained concept pages compile durable synthesis and cross-references.
3. An optional `AGENTS.md` can define bundle-specific ingest, query, and lint workflows.

The root log records creation, update, move, deletion, ingest, query, and lint
operations. Hierarchical indexes let agents progressively
disclose the bundle instead of loading every file.

## Product surfaces

- The editor exposes all standard OKF metadata as first-class fields.
- The bottom-right OKF indicator explains document conformance and blocks
  in-app saves while format errors remain.
- Navigation and search use titles, descriptions, types, and tags.
- Concept details expose outgoing links and backlinks.
- The sidebar reports live bundle conformance.
- New concepts require a type and description.
- Templates are normalized into conformant concepts during import.
- `type: Dataset` concepts hold structured records in a Markdown table and are
  checked against their column schema. See [Datasets](datasets.md).
- `type: Dashboard` concepts render cards and charts from Datasets. See
  [Dashboards](dashboards.md).
- Argus validates approved file mutations and maintains provenance, indexes,
  and logs.
- `caedora-mcp` exposes concept CRUD, search, graph, validation, ingest, index,
  and log operations.

## Sources

- [Open Knowledge Format v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [Google Cloud introduction to OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
- [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
