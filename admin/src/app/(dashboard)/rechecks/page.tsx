import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { RechecksView } from "./rechecks-view";
import { fetchRechecks } from "@/services/rechecks.service";

export default async function RechecksPage() {
  try {
    const items = await fetchRechecks();
    return <RechecksView items={items} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Re-checks" />
        <ListError what="the re-checks" />
      </div>
    );
  }
}
