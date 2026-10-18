export function RepositoryStatus({ status }: { status?: string }) {
  if (!status || status.toLowerCase() === 'active') return null;
  const normalized = status.toLowerCase().replace(/[_-]/g, ' ');
  const label = normalized === 'onhold' ? 'On Hold' : normalized.replace(/\b\w/g, c => c.toUpperCase());
  return <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">{label}</span>;
}
