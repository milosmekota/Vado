import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";
import {
  customerDisplayName,
  recordAuditEvent,
} from "@/services/audit.service";

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

function normalizeCustomer(doc) {
  if (!doc) return null;

  return {
    ...doc,
    _id: doc._id?.toString?.() ?? String(doc._id ?? ""),
    comments: Array.isArray(doc.comments)
      ? doc.comments.map((c) => ({
          id: c.id ?? "",
          text: c.text ?? "",
          user: c.user ?? "",
          date:
            typeof c.date === "string"
              ? c.date
              : c.date
                ? new Date(c.date).toISOString()
                : "",
        }))
      : [],
  };
}

function buildCustomerFilter(user, customerId) {
  if (user?.role === "admin") return { _id: customerId };
  const userId = toObjectId(user?.id);
  return userId ? { _id: customerId, userId } : null;
}

export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const customerId = toObjectId(id);
    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { message: "Text komentáře je povinný" },
        { status: 400 },
      );
    }

    const commentObj = {
      id: crypto.randomUUID(),
      text,
      user: user.email,
      date: new Date().toISOString(),
    };

    const filter = buildCustomerFilter(user, customerId);
    if (!filter) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingCustomer = await Customer.findOne(filter)
      .select("_id userId firstName lastName email serialNumber")
      .lean();
    if (!existingCustomer) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      filter,
      {
        $push: {
          comments: {
            $each: [commentObj],
            $position: 0,
          },
        },
      },
      { new: true, runValidators: true },
    )
      .select("-userId -__v -createdAt -updatedAt")
      .lean();

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 },
      );
    }

    await recordAuditEvent({
      ownerId: existingCustomer.userId,
      actor: user,
      action: "comment_added",
      entityType: "comment",
      entityId: commentObj.id,
      customerId,
      customerName: customerDisplayName(existingCustomer),
      summary: `Přidán komentář zákazníkovi ${customerDisplayName(existingCustomer)}`,
      changes: [
        { field: "comment", label: "Komentář", from: "—", to: text },
      ],
    });

    return NextResponse.json(
      { customer: normalizeCustomer(updatedCustomer) },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to add comment" },
      { status: 500 },
    );
  }
}
