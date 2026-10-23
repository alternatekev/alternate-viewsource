---
name: "ambient-field-motion"
description: "Use when designing or building the alternate.org ambient shatter field, or any slow, data-driven background motion that shifts between moods."
---

# Ambient field motion

Kevin's direction for the alternate.org background. This is atmosphere, not an interface. It must be fully immersive and cinematic. Read it before touching timing, easing, layout or interaction.

## What the field is
- The shattered source art fills the entire background. Shards are spread across the full viewport and through depth; nothing is parked in the middle as an object.
- The source art is the thing being shattered (placeholder: a rectangle) until Kevin supplies a thematic shape. Never invent a word, logo or motif for it.
- It is pre-shattered. The art is never seen whole and never shown breaking. On the first frame it is already in pieces, scattered and turned, and the motion keeps it indecipherable what the source was.
- Every page load shatters it differently: new seed, new pattern, new shatter point.
- It is never interacted with directly. No hover response on the field, no click ripples, no cursor push, no drag. Pointer events pass through it.
- It never sits waiting. It is always already in motion and never needs input to look alive, but its motion is slow and deliberate, not busy.

## Cinematic
The field should feel like a shot in a film, not a screensaver or a UI effect.
- Camera language: slow, motivated camera moves (push-ins, drifts, gentle dollies and tilts) tied to the story and the inputs, never arbitrary orbiting. Long takes; no cuts.
- Focus: a real sense of a lens. Depth of field and rack focus pull attention between near and far shards as the mood shifts.
- Light: lighting is part of the mood. Key light direction, highlights catching on glass edges, contrast and falloff change with the scene the way a cinematographer would light it.
- Grade: color is graded per moment, with the time of day as the base look, so each section reads like its own scene.
- Scale and depth: shards pass near the lens and recede far away, giving foreground, midground and background layers.
- Pacing: build and release. Moments of stillness make the movement land; intensity rises and settles like a score.

## How it moves
- Shards travel slowly outward from a shatter point, an explosion that never ends. Shards that leave the view re-enter near the shatter point, so the background stays full.
- It is a continuous simulation. Inputs change velocities and rates, never positions directly, so nothing can jump.
- The numbers change constantly while the reader is on the page: speed, spin, shatter point, how many shards are in play, depth, opacity, color, light and camera are recomputed every frame from the inputs, and the field glides after them.

## Continuous and reactive
The field is both. It runs continuously on its own, and it reacts to the reader's ambient interactions and the data that comes from them.
- Ambient interactions are the reader's interactions with the page and its content, never with the field itself: scrolling, reading, opening or clicking content, lingering, pausing, where attention rests.
- An interaction is data. What was interacted with, its emotional point, how long, how fast and how often all feed the simulation as a nudge or impulse that changes targets and rates, which then ease in and decay over seconds.
- The reaction is expressed through the same continuous motion (speed, shatter point, count, depth, color, light, camera), never a separate canned effect layered on top. Nothing restarts, snaps or plays a one-off animation.
- Repeated or sustained interaction accumulates; absence lets the field drift back toward its continuous state.

## Inputs (all at once, in a feedback loop)
- The content: where the reader is. Each content block carries an emotional point (valence, arousal) and a shatter point; blocks are weighted by how close they sit to the middle of the screen, so the mood blends continuously as the reader moves through the story.
- Interactions with content: their data nudges the field as described above.
- Scroll speed: scrolling speeds the field up; stopping lets it settle back. Scroll also carries the shards with the reader as parallax, nearer shards farther.
- Scroll position: moves the shatter point and shifts depth and camera over the course of the page.
- Time of day: background, base grade and light.
- Music: instrument location and energy steer the shatter point and speed, and the music in turn reads the field's state. The field, the music, the content, the interactions and the reader form one feedback loop. Damping on every value is what keeps the loop from running away.

## Motion character
- Slow, deliberate, data-informed movement toward a mood. Think tides and weather, not fidgeting.
- No wiggling, jitter, bobbing or anything that reads as asking to be touched. If a motion would look at home on a loading spinner or a hover state, cut it.
- Mood transitions take seconds. Use critically damped springs so a target that changes mid-flight bends the motion smoothly; never restart from zero, never snap.
- Rates are integrated over time (position += velocity * dt, angle += rate * dt) so a change in speed never jumps.
- Changes in shard count fade shards in and out over seconds, never a cut.
- At most about a third of the field should be visibly changing at once. Most shards are near-still at any moment.
- Material: glass. Opacity and depth between shards matter: depth-sorted transparency, per-shard opacity, haze for shards off the focal plane.

## Not used
- Pre-authored animation formats such as Lottie. The field is generated live from data; nothing is keyframed in advance.

## Before building or changing motion
1. State the mood each input or interaction should produce in plain words, as you would describe a shot.
2. State how quickly each value follows its target and how long an interaction's influence lasts.
3. Check every proposed motion against: does it read as slow, intentional and cinematic from across the room? Is the reaction carried by the continuous motion rather than a separate effect? Would it still be good if nobody ever touched the page? If not, remove it.
4. Respect prefers-reduced-motion: keep mood changes, drop most continuous drift, parallax and camera movement.

## Working model
Kevin art-directs every step. Propose and sketch; don't add features he didn't ask for. When a request is ambiguous, ask one question instead of guessing in code.