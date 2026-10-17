# content/

Everything the site says lives here as files, versioned with the code. No database, no CMS.

- `spine/` — the structure: `phases.json` (the five phases of the web), `milestones.json` (dated, sourced points in Kevin's history), `designs.json` (every documented design of alternate.org since 2000, with its archive capture).
- `story/<phase>/<chapter>.mdx` — the chapters, in Kevin's words. Frontmatter is validated by `lib/content/schema.ts`; `_template.mdx` shows the shape. Files starting with `_` are ignored. A chapter names the `milestones` it tells and the pieces it is `related` to; those, and any link in its words to a piece (`#piece-…`) or a year on the work page (`/work#year-…`), are journeys through the site (`docs/journeys.md`) and are checked to exist.
- `objects/<id>/` — the evidence a chapter picks up: a chart's rows and caption, a screenshot's manifest, a repo link. One folder per object.
- `colophon.json` — the colophon's "how this site is made", in Kevin's words: headed groups of short paragraphs about this version of the site. Every link into this repo must point at a file that exists.
- `voice/<chapter>.json` — word-level timings for a recorded chapter. The audio itself lives outside the repo; only the alignment is versioned.

Rules that hold for every file here:

1. Every claim is sourced or labeled as Kevin's account. A `sources` entry with a `note` and no `url` is a flag, not a citation.
2. Nothing private: no credentials, no internal names, hostnames or ticket ids from any employer, no material that is under review. A chapter that needs an external review before it is public is `clearance: review` and does not ship; its draft is kept outside this repository until it is cleared.
3. `status` is honest: `stub` until there are words, `draft` until Kevin has read or heard them, `told` after.
4. The glance line (`summary`) is a complete sentence a phone can show on its own.

`npm run validate` checks all of it.
