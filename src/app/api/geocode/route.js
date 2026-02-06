import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const address = String(body?.address ?? "").trim();

    if (!address) {
      return NextResponse.json({ message: "Missing address" }, { status: 400 });
    }

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: address,
        format: "json",
        addressdetails: "1",
        limit: "1",
      }).toString();

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Vado (contact: milos.mekota@post.cz)",
        "Accept-Language": "cs,en;q=0.8",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Geocoding failed" },
        { status: 502 },
      );
    }

    const data = await res.json().catch(() => []);
    const hit = Array.isArray(data) ? data[0] : null;

    if (!hit?.lat || !hit?.lon) {
      return NextResponse.json({ message: "No results" }, { status: 404 });
    }

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { message: "Invalid geocode result" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        lat,
        lng,
        formattedAddress: hit.display_name || "",
        placeId: "",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: err?.message || "Error" },
      { status: 500 },
    );
  }
}
