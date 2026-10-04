import { RechecksView } from "./rechecks-view";
import { fetchRechecks } from "@/services/rechecks.service";

export default async function RechecksPage() {
  try {
    const items = await fetchRechecks();
    return <RechecksView items={items} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load re-checks.
      </div>
    );
  }
}
