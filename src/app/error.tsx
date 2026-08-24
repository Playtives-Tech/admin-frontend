'use client';
export default function ErrorPage({ reset }: { reset: () => void }): React.JSX.Element {
  return (
    <main className="container grid min-h-screen place-items-center">
      <section className="text-center">
        <p className="text-sm font-semibold text-brand">Something went wrong</p>
        <h1 className="mt-2 font-sans text-3xl font-semibold">Please try again.</h1>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
