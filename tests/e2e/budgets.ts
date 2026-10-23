// Every number the end-to-end suite holds the site to, in one place. Each says who set it and when.
// To change one, change it here, in a commit of its own that says why (docs/testing.md, "Changing a
// budget"). KB here is 1000 bytes, as the probe and the plan report sizes.

const KB = 1000;

export const budgets = {
  html: {
    // the home document, brotli at its best setting. Kevin, Oct 18 2026: every word stays in the home
    // document; was 14 KB. With every word inline the floor is about 130 KB (the words alone are 68 KB,
    // and Next inlines a second copy as its RSC payload)
    home: 130 * KB,
    // /work and /colophon, brotli at its best setting. The lead, Oct 18 2026
    page: 30 * KB,
  },
  // this site's own JavaScript loaded before begin, brotli, not counting React and Next.js. CLAUDE.md,
  // Kevin: "under 50 KB compressed"; the framework's bytes are reported, not failed (the lead, Oct 18 2026)
  appJs: 50 * KB,
  // pictures requested on / before begin, with no scroll: none. The field's own portrait is the
  // field's, loaded after idle, and doesn't count. The lead, Oct 18 2026, from P's measurement (0 on
  // the laptop and the phone); CLAUDE.md: "no picture fetched before it's near"
  imagesBeforeBegin: 0,
  // cumulative layout shift, from load through begin to the first view settled. The plan, Oct 18 2026
  // (Web Vitals' "good")
  cls: 0.1,
  // largest contentful paint on phone-throttled (4x CPU, Fast 3G). Kevin, Oct 19 2026: the page stays
  // hidden until the docks have set it up, on every device, so the plain document never flashes; that moves
  // the first real paint to the logotype after hydration (6.2 s measured locally, Oct 18). Was 2.5 s (the plan)
  lcpMs: 7000,
};

// How bytes are counted: brotli at quality 11 (its best) of the bytes the server sent, decoded,
// whatever the server's own encoding (next start sends gzip; Vercel's edge sends brotli at a lighter
// setting, about quality 3, so the home page is about 200 KB on the wire there). Kevin, Oct 18 2026:
// the budget is the document's weight at its best compression, not one host's setting.
export const BROTLI_QUALITY = 11;
