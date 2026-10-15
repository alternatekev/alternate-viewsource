import { getPhases } from "@/lib/content";

// The field, and nothing else yet. Words arrive when Kevin dictates them.
// Each phase is an empty, full-height beat carrying only its mood, so scrolling moves the field
// through the five phases the way the story will.
export default async function Home() {
  const phases = await getPhases();
  return (
    <div className="beats">
      <h1 className="visually-hidden">viewsource</h1>
      {phases.map((p) => (
        <section
          key={p.key}
          className="beat"
          aria-hidden="true"
          data-valence={p.mood.valence}
          data-arousal={p.mood.arousal}
          data-x={p.mood.x}
          data-y={p.mood.y}
        />
      ))}
    </div>
  );
}
