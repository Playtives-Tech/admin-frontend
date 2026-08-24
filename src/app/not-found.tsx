import Link from 'next/link';
export default function NotFound(): React.JSX.Element {
  return (
    <main className="container grid min-h-screen place-items-center">
      <section className="text-center">
        <p className="text-sm font-semibold text-brand">404</p>
        <h1 className="mt-2 font-sans text-3xl font-semibold">Page not found</h1>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
