// Editorial markers: questions and placeholders left in the words for me. "[check: …]" is a question
// to answer; "[needs Kevin: …]" holds the place of words only I can give (and may carry a check of
// its own). They stay in the source until I resolve them. A production build leaves them out of the
// page entirely; in development they show, highlighted, so I see them while editing. Every reader in
// lib/content passes what it renders through here, and the MDX pipeline does too (lib/content/mdx.tsx),
// so none reaches a page. scripts/validate-content.ts counts the open ones on every build.

/** one marker, with the space before it on its line (so a sentence closes up when it goes) */
export const CHECK = /[ \t]?\[(?:check|needs Kevin):(?:[^[\]]|\[check:[^\]]*\])*\]/g;
const showing = process.env.NODE_ENV !== "production";

/** a piece of HTML: the marker gone, or marked */
export function checksInHtml(html: string) {
  return html.replace(CHECK, (m) => (showing ? ` <mark class="check">${m.trim()}</mark>` : ""));
}

/** a line of plain text (a title, a label): the marker gone, or left as it is to be seen */
export function checksInText(text: string) {
  return showing ? text : text.replace(CHECK, "");
}

/** a chapter's MDX: the marker gone, or marked (its words as a string, so nothing in them is read as MDX) */
export function checksInMdx(source: string) {
  return source.replace(CHECK, (m) => (showing ? ` <mark className="check">{${JSON.stringify(m.trim())}}</mark>` : ""));
}
