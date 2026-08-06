export default function Loading(): React.JSX.Element {
  return (
    <main className="container min-h-screen py-8">
      <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-32 h-16 max-w-3xl animate-pulse rounded bg-muted" />
      <div className="mt-5 h-6 max-w-xl animate-pulse rounded bg-muted" />
    </main>
  );
}
