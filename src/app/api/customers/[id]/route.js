import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCurrentUser } from "@/lib/auth";
import { upsertPlannedServiceEventFromCustomerField } from "@/services/customer.service";

function toObjectId(value) {
  try {
    const str = String(value ?? "").trim();
    if (!str) return null;
    if (!mongoose.Types.ObjectId.isValid(str)) return null;
    return new mongoose.Types.ObjectId(str);
  } catch {
    return null;
  }
}

function toIntOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function pickAllowedCustomerFields(body) {
  const allowed = {
    firstName: body?.firstName,
    lastName: body?.lastName,
    municipality: body?.municipality,
    email: body?.email,
    phone: body?.phone,
    address: body?.address,

    manufacturer: body?.manufacturer,
    serialNumber: body?.serialNumber,
    type: body?.type,

    installYear:
      body?.installYear === "" || body?.installYear == null
        ? null
        : toIntOrNull(body.installYear),

    online: typeof body?.online === "boolean" ? body.online : undefined,

    lastService: body?.lastService,
    nextService: body?.nextService,
  };

  Object.keys(allowed).forEach((k) => {
    if (allowed[k] === undefined) delete allowed[k];
  });

  const stringKeys = [
    "firstName",
    "lastName",
    "municipality",
    "email",
    "phone",
    "address",
    "manufacturer",
    "serialNumber",
    "type",
    "lastService",
    "nextService",
  ];

  for (const k of stringKeys) {
    if (typeof allowed[k] === "string") allowed[k] = allowed[k].trim();
  }

  if (typeof allowed.email === "string") {
    allowed.email = allowed.email.toLowerCase();
  }

  return allowed;
}

async function getParamId(params) {
  const p = await params;
  return p?.id;
}

function buildCustomerFilter({ user, customerId }) {
  if (user?.role === "admin") return { _id: customerId };

  const userId = toObjectId(user?.id);
  if (!userId) return null;
  return { _id: customerId, userId };
}

export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const id = await getParamId(params);
    const customerId = toObjectId(id);
    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }

    const filter = buildCustomerFilter({ user, customerId });
    if (!filter) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const customer = await Customer.findOne(filter)
      .select("-userId -__v")
      .lean();

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    return NextResponse.json({ customer }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to load customer" },
      { status: 500 },
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const id = await getParamId(params);
    const customerId = toObjectId(id);
    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }

    const filter = buildCustomerFilter({ user, customerId });
    if (!filter) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const allowed = pickAllowedCustomerFields(body);

    const updatedCustomer = await Customer.findOneAndUpdate(
      filter,
      { $set: allowed },
      { new: true, runValidators: true },
    )
      .select("-userId -__v -createdAt -updatedAt")
      .lean();

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    if (Object.prototype.hasOwnProperty.call(allowed, "nextService")) {
      const finalCustomer = await upsertPlannedServiceEventFromCustomerField(
        updatedCustomer._id?.toString?.() ?? String(updatedCustomer._id ?? ""),
        allowed.nextService ?? "",
      );

      return NextResponse.json({ customer: finalCustomer }, { status: 200 });
    }

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to update customer" },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const id = await getParamId(params);
    const customerId = toObjectId(id);
    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }

    const filter = buildCustomerFilter({ user, customerId });
    if (!filter) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const deleted = await Customer.findOneAndDelete(filter)
      .select("_id")
      .lean();

    if (!deleted) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: true, id: deleted._id.toString() },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to delete customer" },
      { status: 500 },
    );
  }
}
