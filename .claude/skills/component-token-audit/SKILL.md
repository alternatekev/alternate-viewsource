---
name: component-token-audit
description: Use when auditing viewsource's components, design tokens and typography, or whenever a new component, token, CSS custom property, stylesheet class, face or type style is added, renamed or removed.
---

# Component, token and typography audit

The site is built in components and tokens so that the field, the instrument, the docks and the
words cannot drift apart (`CLAUDE.md`, `docs/tokens.md`). This skill keeps that true. It has two
modes: a **full audit** that rewrites `docs/audit.md`, and a **new-item check** that runs whenever
something is added. Both are read-and-report. Neither changes a design.

Kevin art-directs. An audit finds drift and dead weight; it never picks a color, a size, a face, a
timing or a behavior. Anything that needs a design answer goes in the report as a question for him.
During exploration nothing is committed or pushed without his explicit go.

## Full audit

1. **Run the scan.** `bash .claude/skills/component-token-audit/scripts/scan.sh` from the repo root.
   It counts what can be counted: the component inventory, emitted custom properties nothing reads,
   token keys nothing reads, stylesheet classes nothing names, colors/easings/px written inline,
   type not on a `--face-*` variable, and repeated patterns. It is a starting list, not a verdict:
   check every hit by reading the code (a key can be read by destructuring, a class can be built
   from a string).
2. **Run the validator.** `npm run validate`. Note what it checks and, as important, what it does not.
3. **Read, don't grep, for the rest.** Open every file under `app/`, `lib/` and `tokens/` and look for:
   - **Components.** Every factory in `lib/**` and every React shell in `app/`. For each: what it
     owns, which tokens it reads, which CSS classes it writes, whether it uses the one transition
     (`lib/type.ts`), whether it handles reduced motion, focus, and `destroy()` (every listener it
     adds is removed).
   - **Duplication.** Two things that share a look or a behavior must share the code. Look for the
     same declaration block twice in CSS, the same DOM-building steps in several factories, and the
     same calculation done in two places (two copies of one rule will drift).
   - **Literals.** Numbers, colors, easings and durations in code or CSS that are tuning, not
     mechanism. Tuning belongs in `tokens/`; geometry and math stay in code.
   - **Tokens.** Every family: is each key read; is each schema'd; does each emitted custom property
     have a reader; do `docs/tokens.md` and the comments in `tokens/` still say what the code does.
   - **Typography.** Type is the site's main material, so it gets its own pass:
     - *Faces:* every `--face-*`, what loads it (the Adobe Fonts kit `<link>` in `app/layout.tsx`),
       what falls back when it fails, and any rule that names a family directly instead of a
       variable. Faces in the kit that nothing uses.
     - *Roles:* build the table of every type style in use: face, size, leading, tracking, weight,
       case, numerals, and where it's used. Count distinct sizes and units. The same role written
       in two rules is a finding; two near-identical sizes is a question, not a fix.
     - *The house rules in `CLAUDE.md`:* headings and short lines `text-wrap: balance`; paragraphs,
       list items and captions `pretty`; year and number labels `tabular-nums`; controls take
       `font: inherit`; words type and erase only through `lib/type.ts`, never by swapping text.
     - *Code that depends on type:* anything that measures text or reads a computed font size
       (the surface's dive, the logotype's sizers) and what happens if the size changes.
     - *Rendering:* synthetic italic or bold (a style the kit doesn't serve), `font-feature-settings`
       where a `font-variant-*` would do, the font request's place in the first-paint budget.
   - **Checks.** What `scripts/validate-tokens.ts` guards, and any surface the rules in `CLAUDE.md`
     care about that it leaves unchecked (text over the field outside the reading column, say).
4. **Write `docs/audit.md`** in the shape below, replacing the last one. Keep it public-safe: it is
   about this repository's code only (see "What never goes in" in `CLAUDE.md`).
5. **Report** to Kevin: the counts, the few findings that matter most, and the open questions.
   Fix nothing unless he asks. When he does, fix one finding per commit.

### Shape of `docs/audit.md`

```
# Component and token audit
Run <date>, against <commit or "working tree">. Re-run: .claude/skills/component-token-audit.

## Summary            — counts, and the three findings that matter most
## Typography         — faces table; roles table (face · size · leading · tracking · where);
                        what holds; findings T1…
## Components         — table: component · file · owns · tokens read · classes · notes
## Tokens             — table per family: emitted / read / unread; schema gaps; doc drift
## Findings           — numbered; each: what, where (file:line), why it matters, suggested fix
                        (mechanical only), severity (drift / dead / gap / tidy)
## Open, Kevin's calls — anything whose fix is a design decision, as a question
## Not covered        — what this run did not read or could not run
```

## New-item check

Run this when a component, token, custom property or class is added, renamed or removed, before
the work is called done.

**A new token**
- It goes in the family that owns it (`tokens/color|motion|shatter|sound|dock.ts`), authored the
  way that family is (OKLCH for color, seconds or ms named in the key, a comment saying who set it
  and when if Kevin tuned it).
- It has a schema entry in `tokens/schema.ts` with real bounds, not `z.number()` alone.
- If CSS needs it, `cssVariables()` in `tokens/index.ts` emits it, and the stylesheet reads it.
- If it can break a rule (contrast, a level ceiling, a loop, a ratio), `scripts/validate-tokens.ts`
  gets the cross-check in the same change.
- `docs/tokens.md` says it exists if it is a new kind of thing (a new family or role).
- Something reads it. A token nothing reads is a finding, not a placeholder.

**A new component**
- It lives in `lib/` as a factory returning `{ el?, destroy() }`; the React shell only mounts it.
- It reads every tuning value from `tokens/`; nothing it shows is a magic number.
- It arrives and leaves by the one transition (`arrive`/`leave`/`retype` in `lib/type.ts`) and
  invents no second one; it never animates on hover, focus or press unless Kevin asked.
- It reuses what exists before adding anything: the bar, the toggle and action, the popover, the
  focus ring, the pixel-face label, `travelTo`, `isColumn`.
- It respects reduced motion, has a visible `:focus-visible` matching the others, a label for
  assistive tech, and a 44 px target on coarse pointers.
- `destroy()` removes every listener and element it added.
- Add it to the Components table in `docs/audit.md`.

**New type: a face, a size, a type style**
- A face is added to the kit and given a `--face-*` variable with a fallback stack; no rule names a
  family directly. Kevin picks faces; the audit only wires them.
- A new type style reuses an existing role (label, body, intro, title, phase name) if it looks the
  same; a genuinely new role gets added to the Typography table in `docs/audit.md`, and to the type
  tokens once that family exists.
- It follows the house rules: `balance` for headings and short lines, `pretty` for paragraphs and
  items, `tabular-nums` for years and numbers, `font: inherit` on controls.
- It is set with variables, not a fresh `font:` shorthand of literals.
- If code measures it, the measurement reads the token, not a guessed number.
- The weight or style it asks for exists in the kit (no faux italic or bold).

**A new stylesheet class**
- It is named for what it is, prefixed by its component (`dock-…`, `piece-…`).
- Colors, borders, focus and timings come from custom properties, not literals.
- Run the scan's class check: nothing it styles is orphaned, and nothing it replaced is left behind.

**Removing or renaming anything**: grep for every reader, including strings that build class names
and `data-` attributes; remove the token, its schema entry, its emitted property and its doc line together.

Then run `npm run validate` and the scan, and tell Kevin in a line what was added and anything the
check turned up.
