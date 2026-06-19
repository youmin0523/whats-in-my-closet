/** Route-transition skeleton for the authenticated app shell. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10" aria-busy="true">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-16 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-square w-full animate-pulse bg-muted" />
            <div className="p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}
