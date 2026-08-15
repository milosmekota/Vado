import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAuditHistory } from "@/services/audit.service";

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const result = await getAuditHistory({
      user,
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Nepodařilo se načíst historii" },
      { status: 500 },
    );
  }
}
