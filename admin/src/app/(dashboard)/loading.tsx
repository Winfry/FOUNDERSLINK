export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-btn bg-slate-100" />
      <div className="h-28 rounded-card bg-slate-100" />
      <div className="h-64 rounded-card bg-slate-100" />
    </div>
  );
}
