import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { ChamasView } from "./chamas-view";
import { fetchChamas } from "@/services/chamas.service";

export default async function ChamasPage() {
  try {
    const chamas = await fetchChamas();
    return <ChamasView chamas={chamas} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Chamas" />
        <ListError what="the chamas" />
      </div>
    );
  }
}
