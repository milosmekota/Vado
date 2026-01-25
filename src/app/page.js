import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCustomersByUser } from "@/services/customer.service";
import MainLayoutClient from "@/app/components/MainLayoutClient";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customers = await getCustomersByUser(user.id);

  return <MainLayoutClient initialUser={user} initialCustomers={customers} />;
}
