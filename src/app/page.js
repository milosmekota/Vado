import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardClient from "@/app/components/DashboardClient";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <DashboardClient initialUser={user} />;
}
