export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[4.5rem] rounded-card bg-slate-200 sm:h-20" />
        ))}
      </div>
      <div className="h-64 rounded-card bg-slate-200" />
    </div>
  );
}
