export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-56 rounded-full bg-primary-light" />
      <div className="h-28 rounded-card border border-border bg-white" />
      <div className="h-64 rounded-card border border-border bg-white" />
    </div>
  );
}
