import { getPhases } from "@/lib/content";

// The field, and nothing else yet. Words arrive when Kevin dictates them.
// Each phase is an empty, full-height beat carrying only its mood, so scrolling moves the field
// through the five phases the way the story will. The timeline dock reads its blocks from them.
// Newest first (Kevin, Oct 15): the page opens on agents and scrolling goes back to dial-up.
export default async function Home() {
  const phases = await getPhases();
  return (
    <div className="beats" data-order="newest-first">
      <h1 className="visually-hidden">viewsource</h1>
      {[...phases].reverse().map((p) => (
        <section
          key={p.key}
          className="beat"
          aria-hidden="true"
          data-valence={p.mood.valence}
          data-arousal={p.mood.arousal}
          data-x={p.mood.x}
          data-y={p.mood.y}
          data-key={p.key}
          data-name={p.name}
          data-start={p.start}
          data-end={p.end}
        />
      ))}
    </div>
  );
}
