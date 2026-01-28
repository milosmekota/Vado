import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllCustomers, createCustomer } from "@/services/customer.service";

function toIntOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const customers = await getAllCustomers();
    return NextResponse.json({ customers }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to load customers" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const allowed = {
      firstName: typeof body?.firstName === "string" ? body.firstName : "",
      lastName: typeof body?.lastName === "string" ? body.lastName : "",

      email: typeof body?.email === "string" ? body.email : "",
      phone: typeof body?.phone === "string" ? body.phone : "",
      address: typeof body?.address === "string" ? body.address : "",

      manufacturer:
        typeof body?.manufacturer === "string" ? body.manufacturer : "",
      serialNumber:
        typeof body?.serialNumber === "string" ? body.serialNumber : "",
      type: typeof body?.type === "string" ? body.type : "",

      installYear:
        body?.installYear === "" || body?.installYear == null
          ? null
          : toIntOrNull(body.installYear),

      online: Boolean(body?.online),

      lastService:
        typeof body?.lastService === "string" ? body.lastService : "",
    };

    if (typeof allowed.email === "string") {
      allowed.email = allowed.email.trim().toLowerCase();
    }
    if (typeof allowed.firstName === "string") {
      allowed.firstName = allowed.firstName.trim();
    }
    if (typeof allowed.lastName === "string") {
      allowed.lastName = allowed.lastName.trim();
    }

    const customer = await createCustomer(user.id, allowed);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to create customer" },
      { status: 500 }
    );
  }
}
