# Journeys

How a link moves you through the site (the cohesion branch, Oct 17). One rule: following a link is a journey, never a jump. Out of whatever you're reading, one level at a time; along the page to where the thing lives; in to it. Across pages the same, with the page you're leaving typing out first and the one you're arriving at typing in, so begin is never asked for twice.

## Addresses

Everything that can be reached has an address, and the address is the link.

| Address | What it is | Who takes it |
| --- | --- | --- |
| `/#welcome` | Hello, the top of the timeline | the surface (`lib/surface.ts`) |
| `/#phase-<key>` | a phase, by its name: `dialup`, `broadband`, `apps`, `components`, `agents` | the surface |
| `/#piece-<key>` | a piece of writing, by its key in `content/writing/` | the surface |
| `/#piece-chapter-<slug>` | a chapter, by its file name under `content/story/<phase>/` | the surface |
| `/work#year-<yyyy>` | a year on the work page | the corridor (`lib/work.ts`) |
| `/work#work-<key>` | a piece of work on the work page, opened on arrival | the corridor |
| `/colophon` | the colophon | the docks |

On the page the address lives on, the `#…` form is enough. From any other page, the full form. Both are plain links: without JavaScript they are anchors and pages, and the document reads in order.

## How a link travels

- **On the timeline**, a `#piece-…` or `#phase-…` link steps out of every open beat, travels down (or up) the page to the phase, then dives in through the phase's field to the piece. A link to a phase stops at its name. The beat is first brought square to the screen, so the way back out ("back", above the name) is where it belongs and never under a dock.
- **On the work page**, a `#year-…` or `#work-…` link travels down the corridor to the year, a year at a time (the field surges with the crossing), and a piece of work opens on arrival.
- **Between pages**, a link to `/work#…` or `/#…` goes through the docks (`app/docks.tsx`), which register `go()` with `lib/route.ts`: the page leaves by the one transition (into work, it is the dive), the thing the link named is left pending, and the page that comes in takes it on its first frame and journeys there. The browser's back and forward retrace the same trips.

## Where links come from

- **The phase intro** (`content/spine/phases.json`): prose in my words, each link to the piece it came from.
- **The contents line** under the intro (`app/contents.tsx`): what the phase holds, named at reading size, in the field's order; the old blog's posts counted, as one press into the field. This is how you choose a piece without knowing the field is there.
- **The field itself**: from the surface the whole field is one press. Pressing a piece's preview goes to that piece, through the field; pressing anywhere else goes into the field.
- **A chapter's leads** (`app/chapters.tsx`): a chapter ends with the pieces it goes with (`related` in its frontmatter) and its years on the work page (from the `milestones` it tells).
- **A milestone** (`app/marks.tsx`): on the timeline's notes and on the work page, a milestone a chapter tells links to that chapter, "told in …". From the work page that is the way back up.
- **The words of a chapter**: a Markdown link to any address above (`[the liveries](#piece-chapter-liveries)`, `[2008](/work#year-2008)`) travels the same way. `npm run validate` checks that every such link points at something that exists.

## Rules

- Nothing jumps. A trip that would be a jump is a bug.
- A link inside a piece is a journey of its own, never a dive: pressing it never re-dives the piece it sits in.
- A page taken down mid-journey (a navigation, or development's double mount) stops where it is; the next page takes over from the pending address.
- The surface and the corridor each take only the addresses that are theirs; anything else stays a plain anchor.
