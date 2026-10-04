import { ChamasView } from "./chamas-view";
import { fetchChamas } from "@/services/chamas.service";

export default async function ChamasPage() {
  try {
    const chamas = await fetchChamas();
    return <ChamasView chamas={chamas} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load chamas.
      </div>
    );
  }
}
