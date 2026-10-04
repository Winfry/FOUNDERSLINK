import { ListError } from "@/components/list-state";
import { PageHeader } from "@/components/page-header";
import { SettingsView } from "./settings-view";
import { fetchAdminSettings } from "@/services/settings.service";

export default async function SettingsPage() {
  try {
    const settings = await fetchAdminSettings();
    return <SettingsView settings={settings} />;
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <ListError what="your settings" />
      </div>
    );
  }
}
