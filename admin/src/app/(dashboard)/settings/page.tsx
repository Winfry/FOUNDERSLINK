import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Platform configuration (mock — changes are not persisted)." />
      <SettingsForm />
    </div>
  );
}
