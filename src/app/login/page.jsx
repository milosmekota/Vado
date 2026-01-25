import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginPage from "@/app/components/LoginPage";

export default async function Login() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <LoginPage />;
}
