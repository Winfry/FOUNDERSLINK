export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-card bg-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-card bg-slate-200" />
    </div>
  );
}
