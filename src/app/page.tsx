export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-5 inline-flex items-center rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-white/15 dark:text-zinc-400">
        Pre-launch · Pune
      </span>
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Aikyam</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        The organizer&apos;s platform for small, hyperlocal cultural experiences —
        pottery classes, poetry evenings, heritage walks, folk-art workshops.
      </p>
      <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-500">
        Slice 0 — foundation is live. Building the tool next.
      </p>
    </main>
  );
}
