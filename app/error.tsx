"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-screen">
      <section className="error-screen-inner">
        <p className="eyebrow">Explanation interrupted</p>
        <h1>The evidence trail broke.</h1>
        <p>
          PRism could not finish this explanation. Retry the request or paste the prepared fallback
          URL, https://github.com/acme/ledger/pull/42, while a live source recovers.
        </p>
        <button className="retry-button" type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
