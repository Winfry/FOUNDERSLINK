import { SettingsView } from "./settings-view";
import { fetchAdminSettings } from "@/services/settings.service";

export default async function SettingsPage() {
  try {
    const settings = await fetchAdminSettings();
    return <SettingsView settings={settings} />;
  } catch {
    return (
      <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
        Could not load settings.
      </div>
    );
  }
}
