import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllCustomers } from "@/services/customer.service";
import MainLayoutClient from "@/app/components/MainLayoutClient";

function normalizeServiceParam(v) {
  const s = String(v ?? "").trim();
  if (s === "ok" || s === "dueSoon" || s === "overdue" || s === "missing")
    return s;
  return "all";
}

export default async function CustomersPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customers = await getAllCustomers();

  const sp = await searchParams;
  const initialServiceFilter = normalizeServiceParam(sp?.service);

  return (
    <MainLayoutClient
      initialUser={user}
      initialCustomers={customers}
      initialServiceFilter={initialServiceFilter}
    />
  );
}
