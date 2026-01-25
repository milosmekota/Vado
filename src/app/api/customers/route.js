import { getCurrentUser } from "@/lib/auth";
import {
  getCustomersByUser,
  createCustomer,
} from "@/services/customer.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const customers = await getCustomersByUser(user._id);

  return Response.json({ customers });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const customer = await createCustomer(user._id, body);

  return Response.json({ customer }, { status: 201 });
}
