import { ComplianceSourcesView } from "./compliance-view";
import { fetchComplianceSources } from "@/services/compliance-sources.service";

export default async function ComplianceSourcesPage() {
  try {
    const sources = await fetchComplianceSources();
    return <ComplianceSourcesView sources={sources} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load compliance sources.
      </div>
    );
  }
}
