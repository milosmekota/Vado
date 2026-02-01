import mongoose from "mongoose";
import crypto from "crypto";
import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
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

async function ensureCommentIdsForCustomers(customerDocs) {
  let changedAny = false;

  for (const cust of customerDocs) {
    let changed = false;

    if (Array.isArray(cust.comments)) {
      for (const c of cust.comments) {
        if (!c?.id) {
          c.id = crypto.randomUUID();
          changed = true;
        }
      }
    }

    if (changed) {
      changedAny = true;
      await cust.save();
    }
  }

  return changedAny;
}

export async function getAllCustomers() {
  await connectDB();

  const docs = await Customer.find({}).select(
    "-userId -__v -createdAt -updatedAt",
  );

  await ensureCommentIdsForCustomers(docs);

  const plain = docs.map((d) => (d.toObject ? d.toObject() : d));
  return plain.map(normalizeCustomer);
}

export async function getCustomersByUser(userId) {
  await connectDB();

  const oid = toObjectId(userId);
  if (!oid) return [];

  const docs = await Customer.find({ userId: oid }).select(
    "-userId -__v -createdAt -updatedAt",
  );

  await ensureCommentIdsForCustomers(docs);

  const plain = docs.map((d) => (d.toObject ? d.toObject() : d));
  return plain.map(normalizeCustomer);
}

export async function createCustomer(userId, data) {
  await connectDB();

  const oid = toObjectId(userId);
  if (!oid) {
    const err = new Error("Invalid user id");
    err.status = 400;
    throw err;
  }

  const created = await Customer.create({
    ...data,
    userId: oid,
  });

  const plain = created.toObject ? created.toObject() : created;
  return normalizeCustomer(plain);
}
