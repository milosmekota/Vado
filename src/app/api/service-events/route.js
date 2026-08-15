import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import {
  listServiceEventsForUser,
  addPlannedServiceEvent,
  deleteServiceEvent,
  updateServiceEventDate,
} from "@/services/customer.service";
import {
  customerDisplayName,
  recordAuditEvent,
} from "@/services/audit.service";

function toObjectIdOrNull(value) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  if (!mongoose.Types.ObjectId.isValid(str)) return null;
  return new mongoose.Types.ObjectId(str);
}

function buildCustomerFilter(user, customerId) {
  if (user?.role === "admin") return { _id: customerId };
  const userId = toObjectIdOrNull(user?.id);
  return userId ? { _id: customerId, userId } : null;
}

async function getAccessibleCustomer(user, customerId) {
  const objectId = toObjectIdOrNull(customerId);
  if (!objectId) return null;
  const filter = buildCustomerFilter(user, objectId);
  if (!filter) return null;
  return Customer.findOne(filter).lean();
}

function dateOnlyToStartIso(dateOnly) {
  const str = String(dateOnly ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const isAdmin = user.role === "admin";
    const events = await listServiceEventsForUser(user.id, isAdmin);

    const calendarEvents = events.map((e) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      title: e.title,
      note: e.note,
      source: e.source,
      date: e.date,

      start: e.date,
      end: null,
      allDay: true,

      customerId: e?.customer?.id ?? "",
      customerName: e?.customer?.name ?? "",
      customerPhone: e?.customer?.phone ?? "",
      customerAddress: e?.customer?.address ?? "",

      customer: e.customer,
    }));
    return NextResponse.json({ events: calendarEvents }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to load service events" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const body = await req.json().catch(() => ({}));

    const customerId = String(body?.customerId ?? "").trim();
    const date = String(body?.date ?? body?.start ?? "").trim();
    const title = String(body?.title ?? "Servis").trim() || "Servis";
    const note = typeof body?.note === "string" ? body.note : body?.notes;
    const noteNorm = typeof note === "string" ? note.trim() : "";
    const normalizedDate = date.includes("T") ? date.slice(0, 10) : date;

    const existingCustomer = await getAccessibleCustomer(user, customerId);
    if (!existingCustomer) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    const previousEventIds = new Set(
      (existingCustomer.serviceEvents || []).map((event) => String(event?.id)),
    );

    const updatedCustomer = await addPlannedServiceEvent({
      customerId,
      date: normalizedDate,
      title,
      note: noteNorm,
      source: "calendar",
    });

    const createdEvent = updatedCustomer.serviceEvents?.find(
      (event) => !previousEventIds.has(String(event?.id)),
    );

    await recordAuditEvent({
      ownerId: existingCustomer.userId,
      actor: user,
      action: "service_created",
      entityType: "serviceEvent",
      entityId: createdEvent?.id || customerId,
      customerId,
      customerName: customerDisplayName(existingCustomer),
      summary: `Naplánován servis zákazníka ${customerDisplayName(existingCustomer)}`,
      changes: [
        { field: "date", label: "Termín servisu", from: "—", to: normalizedDate },
        { field: "title", label: "Název servisu", from: "—", to: title },
      ],
    });

    return NextResponse.json({ customer: updatedCustomer }, { status: 201 });
  } catch (err) {
    console.error(err);
    const status = err?.status || 500;
    return NextResponse.json(
      { message: err?.message || "Failed to create service event" },
      { status },
    );
  }
}

export async function DELETE(req) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const url = new URL(req.url);
    const customerIdRaw = url.searchParams.get("customerId");
    const eventId = String(url.searchParams.get("eventId") ?? "").trim();

    const customerId = toObjectIdOrNull(customerIdRaw);
    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }
    if (!eventId) {
      return NextResponse.json(
        { message: "Invalid event id" },
        { status: 400 },
      );
    }

    const cust = await getAccessibleCustomer(user, customerId);
    if (!cust) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    const deletedEvent = cust.serviceEvents?.find(
      (event) => String(event?.id ?? "") === eventId,
    );
    if (!deletedEvent) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 },
      );
    }

    const updatedCustomer = await deleteServiceEvent({
      customerId: customerId.toString(),
      eventId,
    });

    await recordAuditEvent({
      ownerId: cust.userId,
      actor: user,
      action: "service_deleted",
      entityType: "serviceEvent",
      entityId: eventId,
      customerId,
      customerName: customerDisplayName(cust),
      summary: `Smazán servis zákazníka ${customerDisplayName(cust)}`,
      changes: [
        {
          field: "date",
          label: "Termín servisu",
          from: deletedEvent.date,
          to: "—",
        },
      ],
    });

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 });
  } catch (err) {
    console.error(err);
    const status = err?.status || 500;
    return NextResponse.json(
      { message: err?.message || "Failed to delete service event" },
      { status },
    );
  }
}
export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const body = await req.json().catch(() => ({}));

    const customerId = String(body?.customerId ?? "").trim();
    const eventId = String(body?.eventId ?? "").trim();

    const dateRaw = String(body?.date ?? body?.start ?? "").trim();
    const date = dateRaw.includes("T") ? dateRaw.slice(0, 10) : dateRaw;

    if (!customerId) {
      return NextResponse.json(
        { message: "Invalid customer id" },
        { status: 400 },
      );
    }
    if (!eventId) {
      return NextResponse.json(
        { message: "Invalid event id" },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: "Invalid date (expected YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const existingCustomer = await getAccessibleCustomer(user, customerId);
    if (!existingCustomer) {
      return NextResponse.json(
        { message: "Customer not found or forbidden" },
        { status: 404 },
      );
    }

    const existingEvent = existingCustomer.serviceEvents?.find(
      (event) => String(event?.id ?? "") === eventId,
    );
    if (!existingEvent) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 },
      );
    }

    const updatedCustomer = await updateServiceEventDate({
      customerId,
      eventId,
      date,
    });

    if (existingEvent.date !== date) {
      await recordAuditEvent({
        ownerId: existingCustomer.userId,
        actor: user,
        action: "service_moved",
        entityType: "serviceEvent",
        entityId: eventId,
        customerId,
        customerName: customerDisplayName(existingCustomer),
        summary: `Přesunut servis zákazníka ${customerDisplayName(existingCustomer)}`,
        changes: [
          {
            field: "date",
            label: "Termín servisu",
            from: existingEvent.date,
            to: date,
          },
        ],
      });
    }

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 });
  } catch (err) {
    console.error(err);
    const status = err?.status || 500;
    return NextResponse.json(
      { message: err?.message || "Failed to update service event" },
      { status },
    );
  }
}
