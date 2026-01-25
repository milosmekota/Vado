import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const allowed = {
      name: body.name,
      phone: body.phone,
      address: body.address,
      pump: body.pump,
      install: body.install,
      lastService: body.lastService,
    };

    Object.keys(allowed).forEach((k) => {
      if (allowed[k] === undefined) delete allowed[k];
    });

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: id, userId: user._id },
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

    return NextResponse.json({ customer: updatedCustomer });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const customer = await Customer.findOne({ _id: id, userId: user._id })
      .select("-userId -__v")
      .lean();

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to load customer" },
      { status: 500 }
    );
  }
}
