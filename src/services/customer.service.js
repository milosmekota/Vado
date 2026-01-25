import mongoose from "mongoose";
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
    // createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    // updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    comments: Array.isArray(doc.comments)
      ? doc.comments.map((c) => ({
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

export async function getCustomersByUser(userId) {
  await connectDB();

  const oid = toObjectId(userId);
  if (!oid) return [];

  const docs = await Customer.find({ userId: oid })
    .select("-userId -__v -createdAt -updatedAt")
    .lean();

  return docs.map(normalizeCustomer);
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
