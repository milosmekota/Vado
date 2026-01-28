import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCurrentUser } from "@/lib/auth";

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
  };

  Object.keys(allowed).forEach((k) => {
    if (allowed[k] === undefined) delete allowed[k];
  });

  const stringKeys = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "manufacturer",
    "serialNumber",
    "type",
    "lastService",
  ];

  for (const k of stringKeys) {
    if (typeof allowed[k] === "string") {
      allowed[k] = allowed[k].trim();
    }
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
        { status: 400 }
      );
    }

    const customer = await Customer.findById(customerId)
      .select("-userId -__v")
      .lean();

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to load customer" },
      { status: 500 }
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
        { status: 400 }
      );
    }

    const body = await req.json();
    const allowed = pickAllowedCustomerFields(body);

    const filter =
      user.role === "admin"
        ? { _id: customerId }
        : { _id: customerId, userId: toObjectId(user.id) };

    if (user.role !== "admin") {
      const userId = toObjectId(user.id);
      if (!userId) {
        return NextResponse.json(
          { message: "Invalid user id" },
          { status: 400 }
        );
      }
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      filter,
      { $set: allowed },
      { new: true, runValidators: true }
    )
      .select("-userId -__v -createdAt -updatedAt")
      .lean();

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to update customer" },
      { status: 500 }
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
        { status: 400 }
      );
    }

    const filter =
      user.role === "admin"
        ? { _id: customerId }
        : { _id: customerId, userId: toObjectId(user.id) };

    if (user.role !== "admin") {
      const userId = toObjectId(user.id);
      if (!userId) {
        return NextResponse.json(
          { message: "Invalid user id" },
          { status: 400 }
        );
      }
    }

    const deleted = await Customer.findOneAndDelete(filter)
      .select("_id")
      .lean();

    if (!deleted) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, id: deleted._id.toString() },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
