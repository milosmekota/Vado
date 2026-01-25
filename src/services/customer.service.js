import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";

export async function getCustomersByUser(userId) {
  await connectDB();
  return Customer.find({ userId })
    .select("-userId -__v -createdAt -updatedAt")
    .lean();
}

export async function createCustomer(userId, data) {
  await connectDB();

  return Customer.create({
    ...data,
    userId,
  });
}
