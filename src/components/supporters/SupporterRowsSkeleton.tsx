export function SupporterRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--divider)]/60" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 px-2 py-3">
          <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--chip-bg)]" />
          <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--chip-bg)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-[var(--chip-bg)]" />
            <div className="h-2.5 w-1/2 rounded bg-[var(--chip-bg)]" />
          </div>
          <div className="h-3 w-12 shrink-0 rounded bg-[var(--chip-bg)]" />
        </div>
      ))}
    </div>
  );
}
