# Open Knowledge Format support

Caedora treats OKF v0.1 as its native knowledge model. New knowledge collections
are called **bundles**, and non-reserved Markdown files are **concepts**.

## Standards contract

Every concept:

- is a UTF-8 Markdown file;
- has a path-based concept ID;
- begins with parseable YAML frontmatter;
- has a non-empty `type`;
- may use `title`, `description`, `resource`, `tags`, and `timestamp`;
- preserves unknown producer-defined YAML fields;
- uses standard Markdown links for graph relationships.

`index.md` and `log.md` are reserved at every directory level. Root `index.md`
declares `okf_version: "0.1"`. Broken links remain consumable but appear as
conformance warnings.

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
- Argus validates approved file mutations and maintains timestamps, indexes,
  and logs.
- `caedora-mcp` exposes concept CRUD, search, graph, validation, ingest, index,
  and log operations.

## Sources

- [Open Knowledge Format v0.1 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [Google Cloud introduction to OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
- [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
