import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <p className="kicker">404</p>
      <h1>Nothing here yet.</h1>
      <p>
        <Link href="/">Back to the spine</Link>
      </p>
    </main>
  );
}
