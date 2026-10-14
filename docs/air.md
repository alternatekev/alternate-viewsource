# Air: the field and the instrument

Air is the primitive that makes the space feel inhabited: motion and sound generated from the content, the clock and the visit, never touched directly. It has two halves, both prototyped as single pages in `prototypes/` and both to be ported into modules under `lib/air/`.

## doooomgaze — the field

The source art, Voronoi-fractured on every load with a new seed, pattern and shatter point, fills the whole background. It is pre-shattered (never seen whole), always already moving on the first frame, and moved only by data. Glass: depth-sorted transparency, per-shard opacity, haze off the focal plane.

Reader signals, measured as data: reading position (each section weighted by its distance from the middle of the screen, blending that section's mood and shatter point), scroll speed and position, linger, opening content, selecting text, pausing, a tension that builds with activity and releases in stillness, time of day, and the music's position and energy. A cinematic layer sits on top: a motivated camera, rack focus and depth of field, a key light that follows the sun, a grade per section tinted by the hour. Every target is chased by critically damped springs, so nothing jumps.

Hooks: `doooomgaze.subscribe(fn)` is called every frame with all signals and field values; `doooomgaze.setMusic(x, y, energy)` lets the instrument write back; `setTimeOfDay(h)`, `numbers`, `seed`, `pattern`.

Open: the thematic source shape (a rectangle until Kevin supplies one; Doooom Shatter GL takes any image's alpha); whether the field runs on phones or rests there as a still frame; the one-third rule as a measured budget.

## dooombient — the instrument

Ambient chords, a new composition each visit, seeded from the date, the hour and the visit count. Far less melody than music usually has: chords only, with interactions nudging the pedal and chord settings slightly, and bigger jumps on the timeline changing them faster and harder. That surge is kept on purpose.

Decisions, Oct 14: lower tones and much more reverb; three boards at once (low, mid, air) with settings in fixed ratios so they stay harmonious as time moves; tempo fixed at 48 bpm, so chords turn over about every ten seconds; key changes move one step around the circle of fifths, with a little dissonance allowed (about one change in seven skips the pivot chord); the mood is exploratory, optimistic without being cloying, contemplative without being scary; at rest the modulation is held to about half and comes all the way back only in a surge. References: the positive end of Sunn O))) and Nine Inch Nails' "A Warm Place".

As built: bright modes only (Lydian, Ionian, Mixolydian); add9, 6/9, maj7 and sus2 voicings with a frequent tonic pedal; chords bloom note by note; an amp drone, a sustained power chord through a cranked dark amp that breathes every 32 beats and roars up with a surge; warm analog-style pads with a slowly opening filter; rare feedback swells, a high chord tone blooming over four seconds every 16 to 36 seconds.

Four pedals are modeled per-sample in an AudioWorklet (`prototypes/dooombient/pedals.js`), each board a chain of flanger, delay, resynthesizer and reverb: a bucket-brigade analog delay (20–600 ms, companding, clock-dependent darkening, triangle modulation); a multi-mode feedback-delay-network reverb with hall, plate, lo-fi and an octave-shimmering sonar mode, decay, dampening, modulation and sustain, the mode following the era; a two-channel resynthesizer with poly and mono triggering, envelope shapes, and blur, synth, glitch and swell voices; and a flanger that stays generic until the real one is chosen.

Open: re-anchoring the prototype's four-era strip to the five phases of the spine and the pedal anchors per phase; letting the chapters drive the boards the way the timeline does now; seeding compositions from Kevin's own recordings as a later layer.

## The mood bus

What ties both to the story is one small shared state the content writes and the air reads (`lib/mood.ts`): valence, arousal and a point for the chapter in view, authored in that chapter's frontmatter; scroll position and speed; the hour; the year under the scrubber and the rush of the last jump; the docks' positions and events (`docs/dock.md`); the instrument's chord, pedal mix and energy. The field and the instrument subscribe to it. Nothing else talks to them, and nothing in them is clickable.

## Rules

From `.claude/skills/ambient-field-motion/SKILL.md`: atmosphere, not interface. Slow, deliberate, data-informed. Transitions take seconds and never restart from zero; rates integrate over time; structural changes cross-fade. At most about a third of the field changes at once. Pointer events pass through it. `prefers-reduced-motion` keeps mood transitions and drops continuous drift. Sound is off until asked for.

## Porting

Both halves arrive after first paint and after idle, only on devices that qualify, enhancing a page that was already complete. Neither uses a framework; the field is a few kilobytes of WebGL, the instrument a worklet file served from `public/`. The port keeps each prototype's public surface so the snapshot in `prototypes/` stays the reference it is measured against.
