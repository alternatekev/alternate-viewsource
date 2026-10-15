// The sound switch, in the ambience popover. Sound is on by default and starts with begin (browsers
// let a page make sound only after a click, tap or key press, and begin is that press). Turning it
// off here fades it out; on again fades it back in. The instrument and its pedal models load only
// when sound first starts.

import { onReset } from "@/lib/ambience";
import type { Instrument } from "./instrument";

const WORKLET = "/sound/pedals.js";

type Field = { setMusic(x: number, y: number, energy: number): void };

export function soundSwitch() {
  const button = document.createElement("button");
  button.type = "button"; button.className = "dock-option";
  let wanted = true, ac: AudioContext | null = null, inst: Instrument | null = null, failed = false;
  const label = () => {
    button.setAttribute("aria-pressed", String(wanted && !failed));
    button.textContent = failed ? "sound unavailable here" : wanted ? "sound on" : "sound off";
    button.disabled = failed;
  };
  label();

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
        .catch(() => { failed = true; label(); });
    }
    void ac.resume();
  }

  button.addEventListener("click", () => {
    wanted = !wanted; label();
    if (wanted) start();
    inst?.setOn(wanted);
  });

  const offReset = onReset(() => inst?.reset());

  // the field listens to the music once there is some
  const feed = window.setInterval(() => {
    const field = (window as unknown as { doooomgaze?: Field }).doooomgaze;
    if (inst && field) field.setMusic(inst.music.x, inst.music.y, inst.music.energy);
  }, 100);

  return {
    el: button,
    /** call inside the visitor's press (begin) */
    start() { if (wanted) start(); },
    get analyser() { return inst?.analyser ?? null; },
    get on() { return wanted && !!inst && ac?.state === "running"; },
    destroy() {
      clearInterval(feed); offReset();
      inst?.destroy(); button.remove();
    },
  };
}
