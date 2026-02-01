import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PlaceholderClient from "@/app/components/PlaceholderClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PlaceholderClient
      title="Nastavení"
      subtitle="Rezervní stránka (role, preference, další moduly)."
    />
  );
}
