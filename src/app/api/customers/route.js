import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCustomersByUser,
  createCustomer,
} from "@/services/customer.service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const customers = await getCustomersByUser(user.id);

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
      name: body?.name,
      phone: body?.phone,
      address: body?.address,
      pump: body?.pump,
      install: body?.install,
      lastService: body?.lastService,
    };

    Object.keys(allowed).forEach((k) => {
      if (allowed[k] === undefined) delete allowed[k];
    });

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
