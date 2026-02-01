import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AiChatClient from "@/app/components/AiChatClient";

export default async function AiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AiChatClient />;
}
