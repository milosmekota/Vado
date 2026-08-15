import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCurrentUser } from "@/lib/auth";
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

  const plain = doc.toObject ? doc.toObject() : doc;

  return {
    ...plain,
    _id: plain._id?.toString?.() ?? String(plain._id ?? ""),
    comments: Array.isArray(plain.comments)
      ? plain.comments.map((c) => ({
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

function normalizeEmail(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function isOwner(currentUser, comment) {
  const me = normalizeEmail(currentUser?.email);
  const author = normalizeEmail(comment?.user);
  return Boolean(me) && Boolean(author) && me === author;
}

function canManageComment(currentUser, comment) {
  if (currentUser?.role === "admin") return true;
  return isOwner(currentUser, comment);
}

function buildCustomerFilter(user, customerId) {
  if (user?.role === "admin") return { _id: customerId };
  const userId = toObjectId(user?.id);
  return userId ? { _id: customerId, userId } : null;
}

async function ensureCommentIds(filter) {
  const customer = await Customer.findOne(filter);
  if (!customer) return null;

  let changed = false;
  if (Array.isArray(customer.comments)) {
    for (const c of customer.comments) {
      if (!c?.id) {
        c.id = crypto.randomUUID();
        changed = true;
      }
    }
  }

  if (changed) await customer.save();
  return customer;
}

export async function PATCH(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const p = await params;
    const customerId = toObjectId(p?.id);
    const commentId = String(p?.commentId ?? "").trim();

    if (!customerId)
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    if (!commentId)
      return NextResponse.json(
        { message: "Invalid comment id" },
        { status: 400 },
      );

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text)
      return NextResponse.json({ message: "Text je povinný" }, { status: 400 });

    const filter = buildCustomerFilter(user, customerId);
    if (!filter)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const customer = await ensureCommentIds(filter);
    if (!customer)
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 },
      );

    const idx = customer.comments.findIndex(
      (c) => String(c?.id ?? "") === commentId,
    );
    if (idx === -1)
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 },
      );

    const comment = customer.comments[idx];

    if (!canManageComment(user, comment)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const previousText = comment.text;
    comment.text = text;
    comment.date = new Date().toISOString();

    await customer.save();

    const updatedCustomer = await Customer.findOne(filter)
      .select("-userId -__v -createdAt -updatedAt")
      .lean();

    await recordAuditEvent({
      ownerId: customer.userId,
      actor: user,
      action: "comment_updated",
      entityType: "comment",
      entityId: commentId,
      customerId,
      customerName: customerDisplayName(customer),
      summary: `Upraven komentář zákazníka ${customerDisplayName(customer)}`,
      changes: [
        {
          field: "comment",
          label: "Komentář",
          from: previousText,
          to: text,
        },
      ],
    });

    return NextResponse.json(
      { customer: normalizeCustomer(updatedCustomer) },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to update comment" },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const p = await params;
    const customerId = toObjectId(p?.id);
    const commentId = String(p?.commentId ?? "").trim();

    if (!customerId)
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    if (!commentId)
      return NextResponse.json(
        { message: "Invalid comment id" },
        { status: 400 },
      );

    const filter = buildCustomerFilter(user, customerId);
    if (!filter)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const customer = await ensureCommentIds(filter);
    if (!customer)
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 },
      );

    const idx = customer.comments.findIndex(
      (c) => String(c?.id ?? "") === commentId,
    );
    if (idx === -1)
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 },
      );

    const comment = customer.comments[idx];

    if (!canManageComment(user, comment)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    customer.comments.splice(idx, 1);
    await customer.save();

    const updatedCustomer = await Customer.findOne(filter)
      .select("-userId -__v -createdAt -updatedAt")
      .lean();

    await recordAuditEvent({
      ownerId: customer.userId,
      actor: user,
      action: "comment_deleted",
      entityType: "comment",
      entityId: commentId,
      customerId,
      customerName: customerDisplayName(customer),
      summary: `Smazán komentář zákazníka ${customerDisplayName(customer)}`,
      changes: [
        {
          field: "comment",
          label: "Komentář",
          from: comment.text,
          to: "—",
        },
      ],
    });

    return NextResponse.json(
      { customer: normalizeCustomer(updatedCustomer) },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to delete comment" },
      { status: 500 },
    );
  }
}
