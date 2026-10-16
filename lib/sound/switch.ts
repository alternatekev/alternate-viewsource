// The sound switch, in the ambience popover. Sound is off by default for now (Kevin, Oct 16); the
// switch turns it on. The audio context is still created and resumed inside begin (browsers let a
// page make sound only after a click, tap or key press, and begin is that press), so turning sound
// on later needs no second press. Turning it off fades it out; on again fades it back in. The
// instrument and its pedal models load only when sound first starts.

import { onReset } from "@/lib/ambience";
import { toggle } from "@/lib/dock/toggle";
import type { Instrument } from "./instrument";

const WORKLET = "/sound/pedals.js";

type Field = { setMusic(x: number, y: number, energy: number): void };

export function soundSwitch() {
  let wanted = false, ac: AudioContext | null = null, inst: Instrument | null = null, failed = false;
  const sw = toggle({ name: "sound", on: false, onChange: (on) => { wanted = on; if (on) start(); inst?.setOn(on); } });
  const button = sw.el;
  const fail = () => { failed = true; sw.unavailable("unavailable here"); };

  // iOS routes Web Audio through the ringer switch; a playback session moves it to the media channel
  function unlockIOS() {
    try { (navigator as Navigator & { audioSession?: { type: string } }).audioSession!.type = "playback"; } catch {}
  }
  // must run inside the gesture: the context is created and resumed before anything awaits
  function start() {
    if (failed) return;
    if (!ac) {
      unlockIOS();
      ac = new AudioContext();
      const b = ac.createBufferSource(); b.buffer = ac.createBuffer(1, 1, 22050); b.connect(ac.destination); b.start(0);
      const ctx = ac;
      import("./instrument")
        .then(({ createInstrument }) => createInstrument(ctx, WORKLET))
        .then((i) => { inst = i; i.setOn(wanted); })
        .catch(fail);
    }
    void ac.resume();
  }

  const offReset = onReset(() => inst?.reset());

  // the field listens to the music once there is some
  const feed = window.setInterval(() => {
    const field = (window as unknown as { doooomgaze?: Field }).doooomgaze;
    if (inst && field) field.setMusic(inst.music.x, inst.music.y, inst.music.energy);
  }, 100);

  return {
    el: button,
    /** call inside the visitor's press (begin): the context is made now; the instrument plays only when wanted */
    start,
    get analyser() { return inst?.analyser ?? null; },
    get on() { return wanted && !!inst && ac?.state === "running"; },
    destroy() {
      clearInterval(feed); offReset();
      inst?.destroy(); button.remove();
    },
  };
}
