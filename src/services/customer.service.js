import mongoose from "mongoose";
import crypto from "crypto";
import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function isValidDateOnly(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

function normalizeCustomer(doc) {
  if (!doc) return null;

  const plain = doc.toObject ? doc.toObject() : doc;

  return {
    ...plain,
    _id: plain._id?.toString?.() ?? String(plain._id ?? ""),
    comments: Array.isArray(plain.comments)
      ? plain.comments.map((c) => ({
          id: c.id ?? "",
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
    serviceEvents: Array.isArray(plain.serviceEvents)
      ? plain.serviceEvents.map((e) => ({
          id: e.id ?? "",
          type: e.type ?? "service",
          status: e.status ?? "planned",
          date: e.date ?? "",
          title: e.title ?? "Servis",
          note: e.note ?? "",
          source: e.source ?? "manual",
        }))
      : [],
  };
}

async function ensureCommentIdsForCustomers(customerDocs) {
  let changedAny = false;

  for (const cust of customerDocs) {
    let changed = false;

    if (Array.isArray(cust.comments)) {
      for (const c of cust.comments) {
        if (!c?.id) {
          c.id = crypto.randomUUID();
          changed = true;
        }
      }
    }

    if (changed) {
      changedAny = true;
      await cust.save();
    }
  }

  return changedAny;
}

function computeNextServiceFromEvents(serviceEvents) {
  const planned = (Array.isArray(serviceEvents) ? serviceEvents : [])
    .filter(
      (e) =>
        e?.type === "service" &&
        e?.status === "planned" &&
        isValidDateOnly(e?.date),
    )
    .map((e) => e.date)
    .sort();
  return planned[0] ?? "";
}

async function recomputeAndPersistNextService(customerId) {
  const doc = await Customer.findById(customerId);
  if (!doc) return null;

  const next = computeNextServiceFromEvents(doc.serviceEvents);
  doc.nextService = next;
  await doc.save();

  const lean = await Customer.findById(customerId)
    .select("-userId -__v -createdAt -updatedAt")
    .lean();
  return normalizeCustomer(lean);
}

export async function getAllCustomers() {
  await connectDB();

  const docs = await Customer.find({}).select(
    "-userId -__v -createdAt -updatedAt",
  );
  await ensureCommentIdsForCustomers(docs);

  const plain = docs.map((d) => (d.toObject ? d.toObject() : d));
  return plain.map(normalizeCustomer);
}

export async function getCustomersByUser(userId) {
  await connectDB();

  const oid = toObjectId(userId);
  if (!oid) return [];

  const docs = await Customer.find({ userId: oid }).select(
    "-userId -__v -createdAt -updatedAt",
  );
  await ensureCommentIdsForCustomers(docs);

  const plain = docs.map((d) => (d.toObject ? d.toObject() : d));
  return plain.map(normalizeCustomer);
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
    serviceEvents: Array.isArray(data?.serviceEvents) ? data.serviceEvents : [],
  });

  created.nextService = computeNextServiceFromEvents(created.serviceEvents);
  await created.save();

  const plain = created.toObject ? created.toObject() : created;
  return normalizeCustomer(plain);
}

export async function upsertPlannedServiceEventFromCustomerField(
  customerId,
  dateValue,
) {
  await connectDB();

  const cid = toObjectId(customerId);
  if (!cid) {
    const err = new Error("Invalid customer id");
    err.status = 400;
    throw err;
  }

  const doc = await Customer.findById(cid);
  if (!doc) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const date = typeof dateValue === "string" ? dateValue.trim() : "";
  if (!date) {
    doc.serviceEvents = (doc.serviceEvents || []).filter(
      (e) => e?.source !== "customer-field",
    );
    doc.nextService = computeNextServiceFromEvents(doc.serviceEvents);
    await doc.save();

    const lean = await Customer.findById(cid)
      .select("-userId -__v -createdAt -updatedAt")
      .lean();
    return normalizeCustomer(lean);
  }

  if (!isValidDateOnly(date)) {
    const err = new Error("Invalid date (expected YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }

  const events = Array.isArray(doc.serviceEvents) ? doc.serviceEvents : [];
  const idx = events.findIndex(
    (e) => e?.type === "service" && e?.source === "customer-field",
  );

  if (idx === -1) {
    events.push({
      id: crypto.randomUUID(),
      type: "service",
      status: "planned",
      date,
      title: "Servis",
      note: "",
      source: "customer-field",
    });
  } else {
    events[idx].date = date;
    events[idx].status = "planned";
    events[idx].type = "service";
  }

  doc.serviceEvents = events;
  doc.nextService = computeNextServiceFromEvents(doc.serviceEvents);
  await doc.save();

  const lean = await Customer.findById(cid)
    .select("-userId -__v -createdAt -updatedAt")
    .lean();
  return normalizeCustomer(lean);
}

export async function listServiceEventsForUser(userId, isAdmin = false) {
  await connectDB();

  const filter = isAdmin ? {} : { userId: toObjectId(userId) };
  if (!isAdmin && !filter.userId) return [];

  const docs = await Customer.find(filter)
    .select(
      "firstName lastName email phone address manufacturer serialNumber type nextService serviceEvents",
    )
    .lean();

  const out = [];
  for (const c of docs) {
    const customerId = c?._id?.toString?.() ?? String(c?._id ?? "");
    const customerName =
      `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "(bez jména)";

    const events = Array.isArray(c?.serviceEvents) ? c.serviceEvents : [];
    for (const e of events) {
      out.push({
        id: e?.id ?? "",
        type: e?.type ?? "service",
        status: e?.status ?? "planned",
        date: e?.date ?? "",
        title: e?.title ?? "Servis",
        note: e?.note ?? "",
        source: e?.source ?? "manual",
        customer: {
          id: customerId,
          name: customerName,
          phone: c?.phone ?? "",
          address: c?.address ?? "",
          serialNumber: c?.serialNumber ?? "",
          manufacturer: c?.manufacturer ?? "",
          type: c?.type ?? "",
        },
      });
    }
  }

  return out
    .filter((e) => isValidDateOnly(e?.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export async function addPlannedServiceEvent({
  customerId,
  date,
  title,
  note,
  source = "calendar",
}) {
  await connectDB();

  const cid = toObjectId(customerId);
  if (!cid) {
    const err = new Error("Invalid customer id");
    err.status = 400;
    throw err;
  }

  const d = typeof date === "string" ? date.trim() : "";
  if (!isValidDateOnly(d)) {
    const err = new Error("Invalid date (expected YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }

  const doc = await Customer.findById(cid);
  if (!doc) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  doc.serviceEvents = Array.isArray(doc.serviceEvents) ? doc.serviceEvents : [];
  doc.serviceEvents.push({
    id: crypto.randomUUID(),
    type: "service",
    status: "planned",
    date: d,
    title: typeof title === "string" && title.trim() ? title.trim() : "Servis",
    note: typeof note === "string" ? note.trim() : "",
    source: typeof source === "string" ? source : "calendar",
  });

  doc.nextService = computeNextServiceFromEvents(doc.serviceEvents);
  await doc.save();

  return recomputeAndPersistNextService(cid);
}

export async function deleteServiceEvent({ customerId, eventId }) {
  await connectDB();

  const cid = toObjectId(customerId);
  if (!cid) {
    const err = new Error("Invalid customer id");
    err.status = 400;
    throw err;
  }

  const eid = String(eventId ?? "").trim();
  if (!eid) {
    const err = new Error("Invalid event id");
    err.status = 400;
    throw err;
  }

  const doc = await Customer.findById(cid);
  if (!doc) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  doc.serviceEvents = (doc.serviceEvents || []).filter(
    (e) => String(e?.id ?? "") !== eid,
  );
  doc.nextService = computeNextServiceFromEvents(doc.serviceEvents);

  await doc.save();
  return recomputeAndPersistNextService(cid);
}

export async function updateServiceEventDate({ customerId, eventId, date }) {
  await connectDB();

  const cid = toObjectId(customerId);
  if (!cid) {
    const err = new Error("Invalid customer id");
    err.status = 400;
    throw err;
  }

  const eid = String(eventId ?? "").trim();
  if (!eid) {
    const err = new Error("Invalid event id");
    err.status = 400;
    throw err;
  }

  const d = typeof date === "string" ? date.trim() : "";
  if (!isValidDateOnly(d)) {
    const err = new Error("Invalid date (expected YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }

  const doc = await Customer.findById(cid);
  if (!doc) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const ev = (doc.serviceEvents || []).find((e) => String(e?.id ?? "") === eid);
  if (!ev) {
    const err = new Error("Event not found");
    err.status = 404;
    throw err;
  }

  ev.date = d;

  doc.nextService = computeNextServiceFromEvents(doc.serviceEvents);
  await doc.save();

  return recomputeAndPersistNextService(cid);
}
