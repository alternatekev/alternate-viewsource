# prototypes/

Single-file sketches, each one page of plain WebGL or Web Audio with no library. They are the first code of the site, not throwaways: the air primitive (`docs/air.md`) is built by porting them into modules. Each folder is a dated snapshot of a prototype that is still being worked on elsewhere; the snapshot here is the reference the port is measured against, and git history is the record of how it changed.

| Folder | What it is | Snapshot |
| --- | --- | --- |
| `doooom-shatter-gl/` | ShatterBox rebuilt for the GPU: Voronoi cells whose flight is computed in the vertex shader, so a shatter scrubs live and never destroys the source. The authoring instrument: source shape, fracture pattern, seed, physics, surface, settings as JSON. | 2026-10-14 |
| `doooomgaze/` | The ambient background: the source art pre-shattered across the whole viewport, always moving, never touched, steered only by reader signals, the clock and the music. Exposes `doooomgaze.subscribe`, `setMusic`, `setTimeOfDay`. The six content cards are placeholders; their `data-v`, `data-a`, `data-x`, `data-y` attributes are the mood each chapter will carry in its frontmatter. | 2026-10-14 (v4) |
| `dooombient/` | The instrument: ambient chords, a new composition each visit, with four pedals modeled per-sample in an AudioWorklet (`pedals.js`): a flanger, a bucket-brigade delay, a multi-mode reverb and a two-channel resynthesizer. Three boards run at once in locked ratios; scrubbing the timeline drives the pedals. Still in progress. | 2026-10-14 |

Open any `index.html` directly in a browser. `dooombient/` needs to be served over HTTP for the worklet (`npx serve prototypes/dooombient`).
