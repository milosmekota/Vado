import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCurrentUser } from "@/lib/auth";

function toObjectId(value) {
  try {
    const str = String(value ?? "").trim();
    if (!str) return null;
    return new mongoose.Types.ObjectId(str);
  } catch {
    return null;
  }
}

function pickAllowedCustomerFields(body) {
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

    const userId = toObjectId(user.id);
    if (!userId) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const customer = await Customer.findOne({ _id: customerId, userId })
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

    const userId = toObjectId(user.id);
    if (!userId) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json();
    const allowed = pickAllowedCustomerFields(body);

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, userId },
      { $set: allowed },
      { new: true, runValidators: true }
    )
      .select("-userId -__v -createdAt -updatedAt")
      .lean();

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
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

    const userId = toObjectId(user.id);
    if (!userId) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const deleted = await Customer.findOneAndDelete({ _id: customerId, userId })
      .select("_id")
      .lean();

    if (!deleted) {
      return NextResponse.json(
        { message: "Customer not found" },
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
