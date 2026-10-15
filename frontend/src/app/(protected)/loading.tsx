/** Route-level placeholder inside the app shell while a page's code loads. */
export default function ProtectedLoading() {
  return (
    <div className="px-4 py-5 sm:px-6 space-y-5" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-5 rounded-md bg-surface-container animate-pulse" />
          <div className="h-5 w-40 rounded-full bg-surface-container animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-surface-container animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-container animate-pulse" />
        ))}
      </div>

      <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
        <div className="h-11 bg-surface-container-low" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-outline-variant/10">
            <div className="size-8 shrink-0 rounded-full bg-surface-container animate-pulse" />
            <div className="h-3 flex-1 max-w-[40%] rounded-full bg-surface-container animate-pulse" />
            <div className="hidden sm:block h-3 w-24 rounded-full bg-surface-container animate-pulse" />
            <div className="ml-auto h-3 w-16 rounded-full bg-surface-container animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
