export default function NotFound() {
  return (
    <main>
      <p className="kicker">404</p>
      <h1>Nothing here yet.</h1>
      <p>
        {/* a plain link on purpose: next/link here put its runtime in the chunk every page loads */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Back to the spine</a>
      </p>
    </main>
  );
}
