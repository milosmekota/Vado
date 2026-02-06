import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import MapClient from "@/app/components/MapClient";

export default async function MapPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <MapClient initialUser={user} />;
}
