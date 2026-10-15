# viewsource

The rebuild of [alternate.org](https://alternate.org), online since March 2000, under the working name viewsource and likely to launch at viewsource.alternate.org. One abstract space instead of a set of pages: Kevin Conboy's story of building for the web since 1998, told in his own voice, structured by the web's five phases, and scaled by device in both fidelity and depth.

This repository is public on purpose. It is part of the evidence the site presents: how the thing was planned, built and changed, with AI agents working in it alongside its author. So it holds the site and the plan for the site, and nothing else — no credentials, nothing private, nothing about anyone but the work. See `CLAUDE.md` for the rules every change follows.

## What's here

| Path | What it is |
| --- | --- |
| `app/` | The site: a Next.js app that prerenders to static HTML. The home page is the glance tier, the spine as a list a phone can scan; chapter pages render the story. |
| `content/` | Everything the site says, as files: the spine (`phases`, `milestones`, `designs`), the chapters in MDX, objects, voice timings. Validated by `lib/content/schema.ts`. See `content/README.md`. |
| `lib/content/` | The content model, the loader (files in development, the repo at a ref in production) and the MDX renderer. |
| `tokens/` | The token system: color, motion, shatter and sound, validated at build. See `docs/tokens.md`. |
| `lib/air/` | The air: `field.ts` is doooomgaze, loaded after idle on devices that qualify. |
| `lib/mood.ts` | The mood bus: the one shared state the content writes and the air reads. |
| `prototypes/` | Dated snapshots of the working sketches: Doooom Shatter GL, doooomgaze (the ambient field) and dooombient (the instrument). |
| `docs/` | The working plan, the air primitive, the dock model. |
| `.claude/skills/` | The rules agents follow when they build here, as skills. |

## Running it

```sh
npm install
npm run dev        # http://localhost:3000; edits under content/ show on the next reload
npm run check      # typecheck, lint, validate content
npm run build      # validates content, then prerenders the site
```

## How content moves

Content is files, versioned with the code. There is no database and no CMS; two headless backends died under earlier versions of this site, and files survive. Agents write files well, Git gives drafts (branches), review (a preview deploy per pull request), history and diffs, and the same files are the context the site's presence will answer from.

- In development, `lib/content` reads `content/` from disk on every request, so an edit is a reload away.
- In production, with `CONTENT_SOURCE=github`, the loader reads `content/` from this repository at `CONTENT_REF` and caches it under one tag. A GitHub webhook on push hits `POST /api/revalidate` (signed with `REVALIDATE_SECRET`); the next visit to each page regenerates it in the background. A content commit goes live within seconds and never rebuilds. Code commits deploy as usual.
- To keep content-only commits from triggering builds, set the host's ignored-build step to skip when nothing outside `content/` changed. A *new* chapter file still needs a build, because chapter URLs are fixed at build time.
- Anything that needs an external review before it is public is `clearance: review`; it does not ship, and its draft stays outside this repository until it is cleared.

Copy `.env.example` to `.env.local` for the variables; values never go in the repo.

## Speed

The first paint is the glance tier: the HTML and its inlined stylesheet, no client JavaScript needed to read a word. Targets, checked on every preview: first round trip under 14 KB compressed, LCP under a second on a mid phone over 4G, zero layout shift. The field and the instrument arrive after idle, on devices that qualify, enhancing a page that was already complete.

## Status

Scaffold. Five phases, fourteen sourced milestones and fifteen documented designs are in; the two first chapters are labeled stubs. Known gaps: a strict CSP (needs nonces, which would make pages dynamic); unknown chapter URLs render the not-found view under a 200 because the prerendered shell is sent first; the field is ported (on tokens, about 14 KB gzipped, loaded after idle, off on phones for now); the instrument is not yet.
