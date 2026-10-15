# Tokens

Everything that colors, moves, shatters or sounds reads from `tokens/`, so the field, the instrument, the docks and the text cannot drift apart. Four families, each built the same way:

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

**Authoring.** Colors are written in OKLCH, which blends evenly to the eye, so a halfway mix between two moods or two hours looks halfway. The build converts them to whatever each reader needs. Token files are plain typed objects, so nothing ships a validator to the browser.

**Checks.** `npm run validate` parses every family against `tokens/schema.ts` and runs the cross-checks a schema can't: text contrast through the reading column's scrim over the worst the field can do (a highlight clipped to white), the time-of-day loop, the delay ceiling on the longest board, board ratios that keep the three in tune, mode weights. A token change that breaks any of these fails the build.

**Open, Kevin's calls.** The phase accents (two sampled from the archive, three placeholders); one dark world or a light tier; the field's source shape; the five phases' pedal anchors, which re-map the prototype's four eras and are a proposal until tuned by ear; the type, which arrives as tokens too.
