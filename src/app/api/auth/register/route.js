import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const isRegistrationEnabled = () => {
  return (
    process.env.ALLOW_REGISTRATION === "true" ||
    process.env.NEXT_PUBLIC_ALLOW_REGISTRATION === "true"
  );
};

export async function POST(req) {
  if (!isRegistrationEnabled()) {
    return NextResponse.json(
      { message: "Registrace je momentálně vypnutá" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const body = await req.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email a heslo jsou povinné" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Heslo musí mít alespoň 8 znaků" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email }).select("_id");
    if (exists) {
      return NextResponse.json(
        { message: "Uživatel již existuje" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password: hashedPassword,
    });

    const userId = user._id.toString();

    const token = jwt.sign(
      { userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        user: {
          id: userId,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Chyba serveru" }, { status: 500 });
  }
}
