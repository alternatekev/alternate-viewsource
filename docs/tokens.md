# Tokens

Everything that colors, moves, shatters or sounds reads from `tokens/`, so the field, the instrument, the docks and the text cannot drift apart. Six families, each built the same way:

| Layer | What it is |
| --- | --- |
| Primitives | Fixed values: OKLCH colors, spring times, shard counts, tempo, modes. |
| Semantic | Named roles: `ink`, `paper`, each phase's accent, the field's time-of-day stops, the glass, each phase's pedal anchors. |
| Dynamic | The rules that move the roles from the mood bus: `fieldPalette(hour, valence, arousal)`, the shatter dynamics, the surge. |

| Family | File | Read by |
| --- | --- | --- |
| Color | `tokens/color.ts` | the page (CSS custom properties inlined in `<head>`), the field (linear RGB for the shader) |
| Motion | `tokens/motion.ts` | the field's springs and signals, the docks, cross-fades, reduced motion |
| Shatter | `tokens/shatter.ts` | the field: fracture, camera, and every moving quantity as `base + Σ coefficient × signal` |
| Sound | `tokens/sound.ts` | dooombient: tempo, modes, voicings, the three boards' ratios, each phase's pedals and Fathom mode |
| Dock | `tokens/dock.ts` | the docks: geometry, the drag threshold and follow, the wireframe look (line, grip and ghost alphas over ink), all emitted as CSS custom properties |
| Chart | `tokens/chart.ts` | every chart on the site (`app/chart.tsx` and the `.chart*` styles): the panel, the mint series, the coral exception, better and worse, the headline, the labels — the racing rig's HUD, as tokens |

**The color matrix.** The nav's edge picks one of four schemes (top Compass, right Archive, bottom Hue wheel, left Warm/cool); the position on the timeline picks the color inside it, 1998 to now. Each scheme is a strip of OKLCH `bg` + `tint` stops in `tokens/color.ts`. The hour's light sits underneath and the scheme outweighs it by `matrix.schemeIntoHour`, the knob for toning it down. Until the timeline scrubs, scrolling stands in for the year.

**Authoring.** Colors are written in OKLCH, which blends evenly to the eye, so a halfway mix between two moods or two hours looks halfway. The build converts them to whatever each reader needs. Token files are plain typed objects, so nothing ships a validator to the browser.

**Checks.** `npm run validate` parses every family against `tokens/schema.ts` and runs the cross-checks a schema can't: text contrast through the reading column's scrim over the worst the field can do (a highlight clipped to white), the time-of-day loop, the delay ceiling on the longest board, board ratios that keep the three in tune, mode weights. A token change that breaks any of these fails the build.

**Open, Kevin's calls.** The phase accents (two sampled from the archive, three placeholders); one dark world or a light tier; the field's source shape; the five phases' pedal anchors, which re-map the prototype's four eras and are a proposal until tuned by ear; the type, which arrives as tokens too.
