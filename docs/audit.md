# Component and token audit

Run 2026-10-16, against `main` at 3fac817 (the merge of the phone column work). Read-only: nothing
here has been changed. Re-run with `.claude/skills/component-token-audit`.
Typography added the same day.

## Summary

- **18 components** (16 in `lib/`, 2 built inline in `app/docks.tsx`) and 3 React shells, **5 token families**, **29 CSS
  custom properties** emitted, **196 lines** of stylesheet, **2 typefaces** (plus system fallbacks) and **14 type sizes**.
- The token system is sound: every color the page and the field show comes from `tokens/`, every
  family is schema'd, and the validator guards contrast in the reading column, the time-of-day loop,
  the delay ceiling and the board ratios. The drift is at the edges of it.
- The three findings that matter most:
  1. **Two copies of "where is the reader".** `lib/time.ts` and `lib/dock/timeline.ts` each work
     out which beat is mid-view, and they already disagree on phones (finding 1). The field's color
     and the timeline marker can point at different places in time.
  2. **Text outside the reading column is unchecked.** The docks and the popover set words directly
     over the field with no scrim, and the contrast check only covers the column (finding 6).
  3. **Type is not in the token system yet.** Nine rules repeat `13px/1 var(--face-pixel)`, most with
     `.02em` tracking, and the body and headings still use system stacks instead of the Adobe Fonts
     faces (see Typography; the face choices are open, the plumbing is not).

## Typography

Type is the one family the site leans on hardest (David Small's zoom: type stays type at every
scale) and the only one with no tokens. Everything below is what the stylesheet does today.

**Faces.** One Adobe Fonts kit (`xml4asp`), loaded by a `<link>` in `app/layout.tsx`.

| Variable | Face | Fallback | Used by |
| --- | --- | --- | --- |
| `--face-pixel` | Argent Pixel CF | system sans | docks, popover, intro, begin, back, every year label, and everything in `.near`, including the body of each piece when dived in |
| `--face-display` | Le Monde Livre Classic | system serif | phase names (`.far h2`), piece titles |
| `--face-text` | Le Monde Livre Classic | system serif | phase intros, the Hello subhead |
| — | system serif (`ui-serif, Georgia`) | — | `body`: anything not set otherwise (`main`, 404) |
| — | system sans (`ui-sans-serif`) | — | `h1–h3` defaults, `.kicker`, and the unused glance-tier rules |

Trade Gothic Next is in the kit and unused (`layout.tsx` l.19).

**Roles as they stand.** Fourteen distinct sizes in four units, no scale:

| Role | Face | Size | Leading | Tracking | Where |
| --- | --- | --- | --- | --- | --- |
| Phase name | display | clamp(56px, 11vw, 160px) | 0.9 | −.01em | `.far h2` |
| Subhead | text | clamp(22px, 3vw, 40px) | 1.25 | — | `.subhead` |
| Piece title | display | 1.6rem | 1.15 | 0 | `.piece h3` |
| Phase intro | text | 1.12rem | 1.55 | — | `.phase-intro` |
| Body | system serif | 17px | 1.55 | — | `body` |
| Near / piece body | pixel | inherits 17px | 1.55 | .02em | `.near` |
| Label | pixel | 13px | 1 | .02em (0 on year labels) | nine rules: docks, popover, intro, begin, back, year labels |
| Small note | inherits | .85em | — | — | org, sources, captions |
| h1 / h2 / h3 defaults | system sans | clamp 28–40 / 20–26 / 1.05rem | 1.15 | −.01em | 404, unused rules |
| Kicker | system sans, 500, caps | 13px | 1.3 | .08em | 404 only |

**Good, and should stay true:** headings and short lines `balance`, paragraphs and list items
`pretty` (the no-orphans rule in `CLAUDE.md` holds everywhere it applies); every year label is
`tabular-nums`; buttons take `font: inherit`; words type in without moving because the untyped
letters are only painted out (`lib/type.ts`), so kerning and line breaks never shift.

**Typography findings**

- **T1. No type tokens** — gap. Faces live in `app/globals.css` `:root`, sizes and leading in each
  rule. `docs/tokens.md` says type will arrive as tokens; nothing in `tokens/` or the validator
  covers it. A sixth family (faces, the roles above, tracking) emitted through `cssVariables()`
  would let the label, the field size the surface zooms to, and the logotype share one source.
- **T2. The label is written nine times** — tidy. `13px/1 var(--face-pixel)`, six of them with
  `.02em` and three without, so year labels track differently from dock labels (`.welcome-source`, `.far-years`/`.near-year`, `.near-row-year`, `.surface-back`, `.dock-content`,
  `.dock-popover .dock-links`, `.dock-option`, `.intro`, `.begin`). `.begin` restates what `.intro`
  already gives it.
- **T3. Two faces the site doesn't use set most fallbacks** — drift. `body` and the `h1–h3`
  defaults are system stacks, so anything new that forgets a `--face-*` falls to Georgia or
  system sans instead of the site's type. The 404 page is set entirely that way.
- **T4. The surface depends on a font size it guesses** — gap. `lib/surface.ts` l.67 reads the
  near field's computed size to frame `zoom.fieldPx`, falling back to a literal 16. It's tied to
  `body`'s 17px through inheritance, so changing body size silently changes the dive.
- **T5. The font is a render-blocking stylesheet from another host** — gap. The kit's CSS is a
  `<link rel=stylesheet>` to use.typekit.net in `<head>`. It sits outside the 14 KB first-trip
  budget and blocks first paint on a third-party round trip; font-display is whatever the kit is
  set to. Nothing measures it.
- **T6. Faux italic, maybe** — check. The logotype's "View Source" is italic in the pixel face.
  If the kit has no Argent Pixel italic, the browser slants it synthetically.
- **T7. Low-level feature switches** — tidy. `body` turns on `onum` with `font-feature-settings`,
  which overrides the higher-level `font-variant-numeric` rules in the cascade's own way; the
  year labels get both `onum` and `tnum`. `font-variant-numeric: oldstyle-nums` says the same
  thing and composes with `tabular-nums`.
- **T8. Measures in three units** — tidy. `62ch` (`main`), `46ch`, `36ch`, then `34rem` and `40rem`
  for the intro, near column and pieces.
- **T9. Side-edge vertical type is unreachable** — dead. `writing-mode: vertical-rl` for docks on
  the left or right; since Oct 15 the nav docks top or bottom only and the timeline spans the
  opposite edge, so no dock reaches a side.

## Components

| Component | File | Owns | Tokens read | Classes | Notes |
| --- | --- | --- | --- | --- | --- |
| Bar | `lib/dock/bar.ts` | the dock shell: nav landmark, edge, thickness, placement | dock.thickness(Coarse), inset | `dock`, `dock-content` | behaviors attach to it; no behavior of its own |
| Draggable | `lib/dock/draggable.ts` | grip, ghost, live region, drag and keyboard moves | dock.*, motion.dockSnapMs | `dock-grip`, `dock-ghost` | `D.stub - 10` grab offset is a literal (l.111) |
| Span opposite | `lib/dock/span.ts` | the timeline bar's place opposite the nav | — | — | |
| Popover | `lib/dock/popover.ts` | top-layer panel from a bar button | dock.typing.popoverPace | `dock-popover` | own `gap = 8` (l.20) and its own vw/vh (l.23) |
| Toggle / Action | `lib/dock/toggle.ts` | the one control look | — | `dock-option` | |
| Nav links | `lib/dock/nav.ts` | page list | — | `dock-links` | |
| Ambience controls | `lib/dock/nav.ts` | animation, fullscreen, reset | — | via toggle | |
| Timeline | `lib/dock/timeline.ts` | blocks, marker, phone short years | dock.helloSpan | `dock-timeline`, `dock-block*`, `dock-marker` | marker thresholds and label pad are literals (l.73, l.75) |
| Logotype | `lib/dock/typing.ts` | the typing name loop | dock.typing | `dock-type*` | |
| Visualizer | `lib/dock/visualizer.ts` | waveform strips beside the nav | dock.inset, gap, visualizerReach | `dock-visualizer` | envelope and gain constants are literals (l.45–50) |
| Sound switch | `lib/sound/switch.ts` | the sound toggle, the audio context | — | via toggle | feeds the field by polling a window global (finding 4) |
| Instrument | `lib/sound/instrument.ts` | dooombient | sound.* (all read) | — | |
| Field | `lib/air/field.ts` | doooomgaze | color, shatter, motion, dock.refraction | `air` | grain texture constants are literals (l.213–214) |
| Surface | `lib/surface.ts` | zoom, pan, pinch, journeys | motion.zoom | `surface-back`, data attrs | framing, pinch, fling and wait values are literals (finding 3); listeners leak (finding 5) |
| Type in, type out | `lib/type.ts` | the one transition | dock.typing | `[data-set]`, `::highlight(untyped)`, `type-ghost` | reference implementation; reused well |
| Travel | `lib/travel.ts` | the eased trip down the page | dock.timelineScrollMs | — | easing is a function literal (finding 3) |
| Begin + intro | `app/docks.tsx` (inline) | the opening button and logo drop | motion.beginDropMs | `intro`, `begin` | built inline, not a `lib/` factory like its neighbors |
| Home button | `app/docks.tsx` (inline) | logotype as the way to Hello | — | `dock-home` | built inline |
| Air (shell) | `app/air.tsx` | tiering, idle load, reset crossfade | motion.crossfadeMs, fieldFadeInMs, shatter.tiers | `air` | |
| Docks / Surface (shells) | `app/docks.tsx`, `app/surface.tsx` | mount points | — | — | |

## Tokens

| Family | Read by the page | Emitted as CSS | Unread |
| --- | --- | --- | --- |
| Color | field (via `fieldPalette`, `maskOutside`), page | `--paper --ink --quiet --rule --accent --scrim` + five phase vars | **`field.mood.warmHue`, `coolHue`** (superseded by the schemes); **phase accents** (`--dialup` … `--agents` are emitted but no rule reads them; only the validator does) |
| Motion | field, surface, docks, air | `--zoom-near`, `--zoom-close` | **`changingShareMax`** (schema'd and documented, enforced nowhere); **`--zoom-close`** emitted, never read |
| Shatter | field | — | all read |
| Sound | instrument | — | all read |
| Dock | docks, field (refraction), type, travel | `--dock-*`, `--type-*` | all read |

Schema and docs:
- `tokens/index.ts` l.1 says four families; there are five (dock was added).
- `docs/tokens.md` still maps all four edges to schemes; the nav docks top and bottom only since
  Oct 15 and the corners pick Archive and Warm/cool (`schemeEdgeFor`, `tokens/color.ts` l.111).
- `schemes` and `matrix.schemeIntoHour` have no zod schema; the validator checks the stops by hand
  and `schemeIntoHour` not at all (it should be bounded 0–1).
- `shatter.source.shape` is `z.literal("rectangle")`; the Work page's circle won't validate until
  the schema allows it.
- `docs/tokens.md` lists type as arriving "as tokens too"; there is no type family yet.

## Findings

1. **Two "where is the reader" calculations disagree on phones** — drift. `lib/time.ts` l.12–16
   always takes a beat's middle as its place (`- 0.5`); `lib/dock/timeline.ts` l.65 drops that on
   a phone's column. The field (via `timePlace`) and the marker can read different years. Four more
   places find "the beat at mid-view" their own way (`surface.ts` l.255, l.293). One shared helper
   in `lib/time.ts` would keep them agreeing. `newestFirst()` in `time.ts` is a branch nothing can
   reach now that the order is fixed oldest-first.
2. **Glance-tier and chapter styles with no markup** — dead. `.spine`, `.phase-head`, `.years`,
   `.phase-web`, `.marks`, `.year`, `.chapters`, `.summary`, `.status`, `.lede`, `.quiet`,
   `.welcome-source`, `article header`, `article .meta`, `article [data-tier]`, `.sources` — about
   20 of 196 lines, all inside the 14 KB first round trip. They belong to the old spine list and
   to chapter pages that have no route yet.
3. **Tuning written into code** — gap. Two easings live inline (`app/docks.tsx` l.32,
   `lib/surface.ts` l.84) and a third as a function (`lib/travel.ts` l.17), so the three trips can't
   be tuned side by side. Also inline: the surface's framing margins (0.14, 0.08, 0.16; l.60, l.68),
   pinch thresholds (1.25 / 0.8, l.198), fling decay and smoothing (0.95, 0.6/0.4; l.176, l.214),
   wheel quiet time and journey waits (×0.6, ×0.8, ×0.9 of zoom.ms), the column trip's 24 px
   clearance (l.294); the timeline marker's open thresholds (0.03 / 0.12) and label pad (6); the
   visualizer's envelope (0.05, 0.2, 0.01) and gain cap (400); the popover gap (8).
4. **The field and the music talk through window globals** — drift. `lib/sound/switch.ts` l.42–46
   polls `window.doooomgaze` every 100 ms; `app/air.tsx` and `app/docks.tsx` publish
   `window.doooomgaze` / `window.dooombient`. `lib/mood.ts` defines the bus they were meant to use,
   and nothing imports it. Either implement the bus or delete the type.
5. **The surface's `destroy()` leaves listeners behind** — gap. Per beat it adds a `resize`
   listener on window (l.246) and a back button (l.39) that `destroy()` never removes; a remount
   (HMR, client navigation) stacks them.
6. **Words over the field outside the column are unchecked** — gap. `.dock-popover`, the dock bars
   and `.begin` have no background (popover: `background: transparent`), so their text sits on the
   live field. `validate-tokens.ts` checks ink, quiet and accent only through the column's scrim.
   `--dock-line` (ink at 0.45) is the only visible edge of every dock control and has no 3:1
   non-text check either. The check can model the worst field behind a dock the same way it models
   the column.
7. **Repeated declarations** — tidy. The caret `::after` block is written twice
   (`.dock-type-text`, `.dock-block-name`); eight `:focus-visible` rules repeat the same outline with
   four different offsets (6, 4, −4, −4 px); eight places build a `type="button"` by hand; eight
   places test `prefers-reduced-motion` themselves (one `reduced()` beside `isColumn()` would do).
   `year()` is written twice with different meanings (`app/page.tsx` whole years, `timeline.ts`
   fractional).
8. **Type outside the token system** — gap. See Typography, T1–T9. Spacing has no scale either:
   16, 12, 8, 4 px recur by hand.
9. **Inline-built components** — tidy. The intro, begin button, logo drop and home button are
   built inside `app/docks.tsx` rather than as `lib/` factories with `destroy()` like the rest.
10. **Visualizer fallback color** — tidy. `rgba(255,255,255,.45)` (`visualizer.ts` l.18) is a
    second definition of `--dock-line`; with the token always emitted it's never used, and if it were
    it would be the wrong color.

## Open, Kevin's calls

- **Phase accents.** Five colors are emitted and validated but not shown anywhere. Keep them for a
  use you have in mind, or retire them? (Two are sampled from the 2001 and 2005 sites, three are
  placeholders.)
- **Type tokens.** Should the body and the `h1–h3` defaults move to Le Monde Livre, so a forgotten
  face falls back to yours instead of Georgia? Is 13 px pixel the one label size?
- **Reading a piece in the pixel face.** Dived into a piece, its whole body is set in Argent Pixel,
  on phones too, where the column is read at full size. Intended, or should piece bodies switch to
  the text face once they're being read?
- **A type scale.** Fourteen sizes in four units today. Do you want a scale, or roles with
  hand-set sizes (the way the color matrix is hand-set)?
- **Trade Gothic Next** is in the kit and unused. Keep it for something, or drop it from the kit?
- **Font loading.** Keep the Typekit `<link>` as is (the 2010 history), or have it load without
  blocking first paint?
- **Spacing.** Do you want a spacing scale, or are 4/8/12/16 px meant to stay hand-set?
- **The three easings** (begin drop, surface camera, page travel). Tokenizing them changes nothing
  you see; whether they should be one curve or three is yours.
- **Dock and popover legibility.** If a check shows text over a bright field failing, the fix is a
  look (a scrim, a pane, a stronger line): your call, not the audit's.
- **`warmHue`/`coolHue` and `changingShareMax`.** Remove, or are they waiting for something?
- **The Work page's circle** needs the shatter schema to allow a second shape.

## Not covered

- `npm run validate`, the type check and the build were not run for this audit; findings are from
  reading the source.
- `lib/air/field.ts` and `lib/sound/instrument.ts` were checked for token use (every key they read
  exists; every shatter and sound key is read) and for color literals, not read line by line for
  other tuning constants.
- `lib/content/`, `prototypes/` and `public/sound/pedals.js` are out of scope.
- No visual or in-browser check: nothing here was looked at rendered, and the Adobe Fonts kit
  itself (which weights and italics it serves, its font-display) was not opened.
- Read from the GitHub copy; the local working tree is a little ahead (it has `app/opengraph-image.tsx`).
