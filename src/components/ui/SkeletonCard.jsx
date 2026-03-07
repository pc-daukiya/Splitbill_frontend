export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-theme-border bg-theme-surface p-6">
      <div className="mb-3 h-2.5 w-16 rounded-full bg-theme-border" />
      <div className="h-5 w-40 rounded-full bg-theme-border" />
      <div className="mt-3 h-3 w-full rounded-full bg-theme-border" />
      <div className="mt-2 h-3 w-4/5 rounded-full bg-theme-border" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-14 rounded-2xl bg-theme-border" />
        ))}
      </div>
      <div className="mt-6 h-9 w-28 rounded-xl bg-theme-border" />
    </div>
  );
}
