// The mood bus: one small shared state the content writes and the air reads.
// The field (doooomgaze) and the instrument (dooombient) subscribe to it; nothing else talks
// to them, and nothing in them is clickable. Implementation lands with the air primitive;
// the shape is fixed here so content, field and instrument are built against the same thing.

import type { Mood } from "./content/schema";

export type MoodBus = {
  // the chapter in view, blended continuously by how near it is to the middle of the screen
  mood: Mood;
  scroll: { fraction: number; speed: number };
  // local hour, 0..24
  hour: number;
  // the year under the scrubber, and the rush of the last jump (0..1, decays over seconds)
  year: number;
  rush: number;
  // what the instrument is doing, written back for the field
  music: { x: number; y: number; energy: number; chord?: string; pedals?: Record<string, number> };
};
