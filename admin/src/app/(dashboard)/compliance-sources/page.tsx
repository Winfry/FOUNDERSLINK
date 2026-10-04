import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { ComplianceSourcesView } from "./compliance-view";
import { fetchComplianceSources } from "@/services/compliance-sources.service";

export default async function ComplianceSourcesPage() {
  try {
    const sources = await fetchComplianceSources();
    return <ComplianceSourcesView sources={sources} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Compliance sources" />
        <ListError what="the compliance sources" />
      </div>
    );
  }
}
