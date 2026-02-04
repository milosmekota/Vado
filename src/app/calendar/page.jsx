import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CalendarClient from "@/app/components/CalendarClient";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <CalendarClient initialUser={user} />;
}
