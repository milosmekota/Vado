import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PlaceholderClient from "@/app/components/PlaceholderClient";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PlaceholderClient
      title="Kalendář"
      subtitle="Tady později bude kalendář servisů a plánování."
    />
  );
}
