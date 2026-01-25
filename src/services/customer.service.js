import mongoose from "mongoose";
import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export async function getCustomersByUser(userId) {
  await connectDB();

  const oid = toObjectId(userId);
  if (!oid) return [];

  return Customer.find({ userId: oid })
    .select("-userId -__v -createdAt -updatedAt")
    .lean();
}

export async function createCustomer(userId, data) {
  await connectDB();

  const oid = toObjectId(userId);
  if (!oid) {
    const err = new Error("Invalid user id");
    err.status = 400;
    throw err;
  }

  return Customer.create({
    ...data,
    userId: oid,
  });
}
