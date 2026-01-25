import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/mongodb";

function normalizeUser(u) {
  if (!u) return null;

  const rawId = u._id?.toString?.() ?? String(u._id ?? u.id ?? "");

  return {
    id: rawId,
    email: u.email,
    role: u.role || "user",
  };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await connectDB();

    const user = await User.findById(decoded.userId)
      .select("_id email role")
      .lean();

    return normalizeUser(user);
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}
