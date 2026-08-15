import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

async function getParamId(params) {
  const p = await params;
  return p?.id;
}

function buildCustomerFilter({ user, customerId }) {
  if (user?.role === "admin") return { _id: customerId };

  const userId = toObjectId(user?.id);
  if (!userId) return null;
  return { _id: customerId, userId };
}

export async function PATCH(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const id = await getParamId(params);
    const customerId = toObjectId(id);
    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }

    const filter = buildCustomerFilter({ user, customerId });
    if (!filter) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ message: "Invalid lat/lng" }, { status: 400 });
    }

    const formattedAddress =
      typeof body?.formattedAddress === "string"
        ? body.formattedAddress.trim()
        : "";
    const placeId =
      typeof body?.placeId === "string" ? body.placeId.trim() : "";

    const existingCustomer = await Customer.findOne(filter).lean();
    if (!existingCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 },
      );
    }

    const updated = await Customer.findOneAndUpdate(
      filter,
      {
        $set: {
          "location.lat": lat,
          "location.lng": lng,
          "location.formattedAddress": formattedAddress,
          "location.placeId": placeId,
          "location.geocodedAt": new Date().toISOString(),
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 },
      );
    }

    await recordAuditEvent({
      ownerId: existingCustomer.userId,
      actor: user,
      action: "location_updated",
      entityType: "customerLocation",
      entityId: customerId,
      customerId,
      customerName: customerDisplayName(updated),
      summary: `Aktualizována poloha zákazníka ${customerDisplayName(updated)}`,
      changes: [
        {
          field: "formattedAddress",
          label: "Nalezená adresa",
          from: existingCustomer.location?.formattedAddress,
          to: formattedAddress,
        },
        {
          field: "coordinates",
          label: "Souřadnice",
          from:
            existingCustomer.location?.lat == null ||
            existingCustomer.location?.lng == null
              ? "—"
              : `${existingCustomer.location.lat}, ${existingCustomer.location.lng}`,
          to: `${lat}, ${lng}`,
        },
      ],
    });

    return NextResponse.json({ customer: updated }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: err?.message || "Failed to update location" },
      { status: 500 },
    );
  }
}
