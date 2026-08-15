import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import HistoryClient from "@/app/components/HistoryClient";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <HistoryClient />;
}
