# The plan, in brief

The public working plan for alternate.org. The longer version, with research and open questions, is a private document; this is kept in step with it by hand and stays about the site.

## The idea

One abstract space, not a set of pages. Kevin's spoken story is the content, the five phases of the web are its structure, and the whole thing scales by device in both visual fidelity and depth of detail. It should feel like the web experiences that drew you in: something that looks like one thing and becomes another, invites exploration, and has its own weather. Kevin art-directs every step; agents explore against his direction.

## Principles

Kevin's goals for the system the site is built from: it must not look like an AI designed it; it is built for an experience, not an application; WebGL-first, with accessible alternatives for everything; modular components for the fastest possible rendering; TypeScript throughout; speed is the experience, in the racing-engineer's sense of weight taken out everywhere; a very light touch on design, with the content and the voice carried by an ambience of motion and sound made for the experience.

## The parts

Eight primitives, each buildable alone:

- **Surface** — one continuous space with depth as the main axis; type at a distance is composition, up close it is content.
- **Spine** — the five phases of the web as the one axis everything hangs on, with the documented designs inside them, and the scrubber for the voice.
- **Objects** — evidence you pick up: a screenshot, a repo, a chart, a clipping. Far, near, inside.
- **Voice** — Kevin's narration as the canonical content; the text is its transcript, aligned word by word.
- **Presence** — a line over the site's own data that answers with sourced lines and cannot invent.
- **Air** — the field (doooomgaze) and the instrument (dooombient): motion and sound generated from the content, the clock and the visit, never touched directly. See `docs/air.md`.
- **Turn** — the opening that looks like one thing and becomes a place when touched.
- **Trace** — the space remembers where you went.

Two docks, and nothing else docks: the main nav and the timeline, dockable anywhere along any edge, placed fresh each visit by the composition's seed, built in DOM and Pointer Events rather than React. The nav's doors are Now, Built, Writing, About, and influences on the colophon, an old-school blogroll with a line on each; their contents are Kevin's to dictate. See `docs/dock.md`.

Three tiers, from capability rather than screen width: **glance** (small screen, no GPU: the spine, the summaries, the transcript), **read** (pointer, laptop: the surface, objects, presence), **inhabit** (desktop GPU, sound on: everything). One content model, three renderings.

## The story

Five chapters of the web, with Kevin early in each: Dial-up (1991–2000), Broadband (2001–2007), Apps (2007–2013), Components (2013–2022), Agents (2022–now). The phase edges are the web's hinge events, not his. Chapters are told in his voice; drafts start from what he has already written, and everything else is dictated. Every claim is sourced or labeled as his account.

## How it is built

- **Content is files**, versioned with the code: the spine as JSON, chapters as MDX, objects and voice timings beside them. No database, no CMS. See `content/README.md`.
- **Static at the edge.** Pages prerender to HTML. In production the loader reads content from the repo and caches it under one tag; a signed webhook revalidates on push, so a content commit goes live in seconds without a rebuild.
- **Next.js, kept on purpose** for that no-rebuild property. Its runtime (about 180 KB of gzipped JavaScript on every page) is the accepted cost; the glance tier never depends on it, and nothing waits for it to read a word.
- **Fast first.** The first paint is the glance tier, under 14 KB, with no JavaScript needed to read a word. The field and the instrument arrive after idle, on devices that qualify.
- **Plain WebGL and Web Audio**, no frameworks, as the prototypes in `prototypes/`.
- **Rules as tests.** No preloader; everything reachable by URL; sound off until asked; reduced motion respected; nothing jumps; nothing in the field is clickable; Lighthouse budgets on every preview.

## What is open

Kevin's calls: the type, the palette (one dark world or a light tier), the field's source shape, the pedal anchors per phase, what the turn opens from, and the presence's character. Decided Oct 16: phones run the field and read the site as a column, with no zoom.

## Sequence

Alpha replaces the whole domain: spine, surface and one object on all three tiers, with the first chapter in Kevin's words. Everything after lands chapter by chapter as he dictates, and work chapters only after the employer's review clears them.
