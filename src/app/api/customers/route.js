import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  await connectDB();

  const token = req.cookies.get("token")?.value;
  if (!token)
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });

  try {
    const decoded = verifyToken(token);

    const customers = await Customer.find({}).sort({ name: 1 }).lean();

    return new Response(JSON.stringify({ customers }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }
}

export async function POST(req) {
  await connectDB();

  const token = req.cookies.get("token")?.value;
  if (!token)
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });

  try {
    verifyToken(token);

    const body = await req.json();
    const newCustomer = await Customer.create(body);

    return new Response(JSON.stringify({ customer: newCustomer }), {
      status: 201,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err.message || "Chyba serveru" }),
      { status: 500 }
    );
  }
}
