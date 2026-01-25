import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  if (process.env.ALLOW_REGISTRATION !== "true") {
    return NextResponse.json(
      { message: "Registrace je momentálně vypnutá" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const { email, password } = await req.json();

    const safeEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const safePassword = typeof password === "string" ? password : "";

    if (!safeEmail || !safePassword) {
      return NextResponse.json(
        { message: "Email a heslo jsou povinné" },
        { status: 400 }
      );
    }

    if (safePassword.length < 8) {
      return NextResponse.json(
        { message: "Heslo musí mít alespoň 8 znaků" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email: safeEmail });
    if (exists) {
      return NextResponse.json(
        { message: "Uživatel již existuje" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(safePassword, 12);

    const user = await User.create({
      email: safeEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        user: {
          id: user._id,
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
