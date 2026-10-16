# The docks

Two bars dock to the edges of the viewport: the main nav and the timeline. Nothing else docks. This is the answer to the "web OS" thought without the windows — panels snap to edges, content keeps the center — and the same bars work on a phone because top and bottom are the only docks there.

## As built (Oct 15)

Where the exploration in the browser has landed so far; the sections after this are the original plan and are kept for the reasoning.

- **Begin.** The page opens dark with one button, begin. Pressing it fades in the field, starts the audio context (the music only once the sound switch is on) and the visualizer, and brings in both docks. The page stays where it opened, at Hello, the top (Kevin, Oct 16: no opening trip); opened on a link to a phase or a piece it journeys there. The logotype is the way home: a press travels, eased, back to the top.
- **One bar component, two behaviors.** `lib/dock/bar.ts` is the shell (outline, orientation, placement); `draggable` and `spanOpposite` are added to it.
- **Main nav.** Top or bottom only, so its words stay upright; it locks to the corners or the center of the edge. Starts centered on the top. Contents: a typing cursor (Kevin Conboy, Alternate.org, *View Source*; it stops at the first interaction and steps on when the nav moves), then timeline, work, colophon, centered (influences live on the colophon), then ambience at the far end.
- **Ambience.** A popover with sound on/off (off by default for now; the context is ready from begin, so turning it on needs no second press), animation on/off, and reset composition (a new shatter crossfades in over the old one, and a new key).
- **Timeline.** Spans the whole edge opposite the nav. One block per beat in page order, newest first (Hello, then agents down to dial-up), each phase sized by its years and Hello given a short block of its own, with a marker for where in time the page is. Each block shows its year; the name types out on hover or focus and erases after. A press scrolls the page there, eased, never a jump, and steps the logotype on.
- **Color.** The nav's place picks the field's scheme: centered, its edge's own (Compass on top, Hue wheel on the bottom); in a left corner Warm/cool, in a right corner Archive.
- **Visualizer.** The music as one waveform in the gaps beside the nav, out to the window's edges; flat and still when the sound is off.
- **Panes.** Each dock refracts the field under it through its own small fixed shatter.

## Decisions (original plan)

- Two docks: the main nav and the timeline (the era strip).
- Dock anywhere along any edge. Positions are continuous along the whole perimeter, not fixed slots.
- Fresh each visit. No remembered position; the starting layout is one output of the visit's composition.
- Not React. DOM, Pointer Events and CSS; the WebGL layer reads the same tokens and events.
- The nav may carry a few one-press controls (a sound toggle, a regenerate button), never verbose ones. No pedal, chord or field parameters in the nav.

Carried over from a 2020 investigation of the same idea: always docked, never floating; content is never pushed; the target announces itself on approach; you drag a stub, not the bar; one value drives orientation, handle, tooltip side and border side; borders and radii only on the content side.

## The two bars

**Main nav.** The doors plus, at most, a sound toggle and a regenerate button. Each is one icon with its label on the content side; toggles carry `aria-pressed`. Nothing in the nav takes a value, opens a panel or needs a second press to finish. Regenerate draws a new seed; the field and the music glide to it over seconds, nothing cuts.

**Timeline.** The era strip: 26 years, one segment per design, the current site at the end. Two gestures, two affordances: drag the grip to move the bar, drag the strip to scrub time. Position (this doc) and depth (the zoom into the strip) are the strip's two axes.

## Position model

- A dock position is a point on the perimeter: `edge` (top, right, bottom, left) and `t` from 0 to 1 along it, clockwise. Internally one number, `p` from 0 to 4, so sliding around a corner is continuous and the position can be fed to the field and the music as a single value.
- Orientation follows the edge; tooltip side, grip rotation and the content-side border derive from it.
- Bars have their own lengths and do not span the edge. The timeline is `min(edge length − 2 × inset, its max length)`; on a short edge its segments compress.
- `t` is clamped so a bar never overhangs a corner. Crossing a corner's diagonal switches the edge; the end nearest the corner stays put and the bar re-orients in place, so turning the corner reads as the bar bending around it.
- Both bars may share an edge; spans may not overlap. Every position respects `env(safe-area-inset-*)` plus `--dock-inset`.
- Time reads in reading direction: left to right on horizontal edges, top to bottom on vertical ones (open).

## The drag

1. **Lift.** Pointer-down on the grip (long-press on touch): the bar collapses to a stub, hides its items, drops to half opacity, raises its shadow. `setPointerCapture` keeps the drag.
2. **Project.** Every frame the pointer is projected onto the nearest perimeter point; the clamped, collision-resolved result is drawn as a ghost of the full bar. The stub follows the pointer.
3. **Approach.** The ghost appears within `--dock-reach` of an edge, and the band under it lights with a gradient toward the edge.
4. **Release.** The bar travels from the stub into the ghost on a critically damped spring (about 250 ms; instant under `prefers-reduced-motion`). Released away from every edge, it returns to where it came from. Escape cancels.
5. **Keyboard.** The grip is a button. Arrows slide the bar along its edge in 5% steps; Shift + arrow moves it to the next edge; Home and End go to the corners; Enter or Space drops it. A live region announces the result.

## Phones

Top and bottom only; a side rail is an eighth of a 390 px screen. The nav takes the top and the timeline the bottom by default; sliding along the edge still works, and dragging one bar to the other edge swaps them. Thickness 56 px, targets 44 px, `100dvh`, safe-area insets.

As built, Oct 16 (Kevin's calls): the timeline shows hello, then the year each phase began (’22 … ’91), the full span kept in each block's label, and the phase you're in types its name, since a phone has no hover; a phase is current from its first line, because a phone's column runs many screens. The nav holds the logotype and ambience; the pages move into the ambience popover, above the effects. Nothing in a bar can widen the page.

## Fresh each visit

Nothing is stored. The composition seed places the bars within the rules: on desktop it may pick `t` for both and the edge for the nav; the timeline starts top or bottom; on phones only `t`. Regenerate re-seeds the field and the music; the bars stay.

## What the docks feed

The field is never touched directly, but interactions with the page are data, and the docks are page. A drag is an impulse: the field speeds up a little and its shatter point drifts toward the bar's new position, then decays; dooombient gets the same nudge. A docked position is a standing input that biases the shatter point and camera slightly toward its edge. The scrub is the big input: small moves nudge the chords, large jumps change them faster and harder. A toggle or regenerate press is a single event on the same bus. Every value is damped.

## Tokens

| Token | Value | Role |
| --- | --- | --- |
| `--dock-thickness` | 48; 56 on coarse pointers | Bar thickness and band size |
| `--dock-inset` | 8 | Distance from the edge, inside the safe area |
| `--dock-gap` | 16 | Minimum gap between the two bars on one edge |
| `--dock-reach` | 120 | Distance from an edge at which the ghost appears |
| `--dock-stub` | 150 × thickness | The lifted bar |
| `--dock-snap` | 250 ms, critically damped | Release travel |
| `--dock-radius` | the card radius token | Content-side corners only |
| edge gradient | current phase accent, 25% to 10% | Approach light |

## Build sketch

A `dock-bar` custom element with `edge`, `t`, `length` and an `aria-label`; both bars are `nav` landmarks. A `DockLayer` module owns the perimeter math, clamping, collision, the ghost and the keyboard, and emits `dock:lift`, `dock:move` (`p`, `edge`, `t`), `dock:drop` and, for the timeline, `dock:scrub`; nav controls emit `nav:toggle` and `nav:regenerate`. doooomgaze and dooombient subscribe to those events on the same bus as the chapters' moods and scroll.

Order: perimeter math, ghost and keyboard for one bar; two bars, collision and corners; the timeline's two gestures and segment compression; the events into the field and the instrument; the phone pass.

## Open

Nav contents (Kevin dictates them with the rest of the content); whether verbose instrument and field controls exist anywhere public or only in development; time direction on vertical edges; whether the seed may put the nav on a vertical edge on desktop.
