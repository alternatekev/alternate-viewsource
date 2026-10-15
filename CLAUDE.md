# Working in this repository

This repo is public and is itself part of the evidence the site presents. Every change, by a person or an agent, keeps it that way.

## What never goes in

- Credentials of any kind: tokens, secrets, keys, `.env` values, connection strings. Not in code, not in content, not in commit messages, not in history. `.env.example` lists names only.
- Anything private: material that is under an external review, drafts of chapters marked `clearance: review`, photos or documents that were shared in confidence. Those live outside this repository until they are cleared.
- Anything about people other than the author's own public history. No employer internals: no internal product or project code names, hostnames, ticket or merge-request ids, coworker or customer names, metrics, targets or numbers that were not published. Describe tools by function, not by internal name.
- Research notes and planning about anything other than the site itself. `docs/plan.md` is the public plan for the site and is derived from a longer private document; keep it to the site.

If you are unsure whether something is public, it is not. Leave it out and say so in the pull request.

## Content

- Every claim is sourced or labeled as Kevin's account. A chapter with words needs `sources`; a milestone always does.
- Chapters are in Kevin's words. Draft from existing material he wrote; do not invent his voice or his opinions. New material comes from his dictation.
- `status` is honest: `stub` until there are words, `draft` until he has read or heard them, `told` after.
- `npm run validate` must pass. It runs before every build.

## Building

- The glance tier comes first on every device: the HTML and its stylesheet carry the whole story. Nothing needs JavaScript to read a word.
- Budgets: first round trip under 14 KB compressed, no WebGL before first paint, the read tier under 50 KB of JavaScript, the field and the instrument after idle.
- Motion follows `.claude/skills/ambient-field-motion/SKILL.md`: atmosphere, not interface; slow, deliberate, data-informed; nothing jumps; nothing in the field is clickable; `prefers-reduced-motion` keeps mood changes and drops drift.
- Sound is off until the visitor asks.
- WebGL-first with an accessible alternative for everything; the docks and the air are DOM, Pointer Events, WebGL and Web Audio, not React. React is the shell. TypeScript throughout; small modules, so rendering stays fast.
- It must not look like an AI designed it. Light touch: the content and the voice carry the site; the ambience supports them.
- Leave it alone by default. Selecting, clicking, pressing, hovering or focusing content or controls never makes them animate or change in a way Kevin didn't ask for. Nothing moves, reseats, recenters, restyles or animates unless that change is the action itself or he asked for it. The one exception is the ambient layer, the field and the instrument: it is the only thing that responds to how the page is read, and it may do so in unpredictable ways. Keeping things still never needs explaining; changing them does.
- Kevin art-directs every step. Propose and sketch; do not add features he did not ask for. When a request is ambiguous, ask one question instead of guessing in code.
- Next.js here is newer than most training data. Read `node_modules/next/dist/docs/` before using an API you are not sure of; `AGENTS.md` says the same.

## Commits

Small, in plain language, saying what changed and why. Agents add `Co-Authored-By` for themselves. Never rewrite published history.
