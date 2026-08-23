import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="error-screen">
      <section className="error-screen-inner">
        <p className="eyebrow">404 · No evidence here</p>
        <h1>This path is outside the change.</h1>
        <p>Return to the workspace and start with a complete GitHub pull request URL.</p>
        <Link className="retry-button" href="/">Open PRism</Link>
      </section>
    </main>
  );
}
