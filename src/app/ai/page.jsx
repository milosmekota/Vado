import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PlaceholderClient from "@/app/components/PlaceholderClient";

export default async function AiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PlaceholderClient
      title="AI asistent"
      subtitle="Tady později bude AI chat nad databází (návrhy, dotazy, akce)."
    />
  );
}
