import mongoose from "mongoose";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/mongodb";

export const CUSTOMER_FIELD_LABELS = {
  firstName: "Jméno",
  lastName: "Příjmení",
  municipality: "Obec",
  email: "E-mail",
  phone: "Telefon",
  address: "Adresa",
  manufacturer: "Výrobce",
  serialNumber: "Výrobní číslo",
  type: "Typ zařízení",
  installYear: "Rok instalace",
  online: "Online",
  lastService: "Poslední servis",
  nextService: "Příští servis",
};

function toObjectId(value) {
  const id = String(value ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function valueToText(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ano" : "Ne";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function customerDisplayName(customer) {
  const firstName = String(customer?.firstName ?? "").trim();
  const lastName = String(customer?.lastName ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (customer?.serialNumber) return `SN: ${customer.serialNumber}`;
  if (customer?.email) return String(customer.email);
  return "(bez jména)";
}

export function buildChanges(before, after, fields, labels = {}) {
  return fields.flatMap((field) => {
    const from = valueToText(before?.[field]);
    const to = valueToText(after?.[field]);
    if (from === to) return [];
    return [{ field, label: labels[field] || field, from, to }];
  });
}

export async function recordAuditEvent({
  ownerId,
  actor,
  action,
  entityType,
  entityId,
  customerId,
  customerName,
  summary,
  changes = [],
}) {
  await connectDB();

  const ownerObjectId = toObjectId(ownerId);
  if (!ownerObjectId) throw new Error("Invalid audit owner id");

  return AuditLog.create({
    ownerId: ownerObjectId,
    actor: {
      userId: String(actor?.id ?? ""),
      email: String(actor?.email ?? ""),
      role: String(actor?.role ?? "user"),
    },
    action,
    entityType,
    entityId: String(entityId ?? ""),
    customerId: String(customerId ?? ""),
    customerName: String(customerName ?? "(bez jména)"),
    summary,
    changes: changes.map((change) => ({
      field: String(change?.field ?? ""),
      label: String(change?.label ?? change?.field ?? "Údaj"),
      from: valueToText(change?.from),
      to: valueToText(change?.to),
    })),
  });
}

function normalizeAuditLog(log) {
  return {
    ...log,
    _id: log?._id?.toString?.() ?? String(log?._id ?? ""),
    ownerId: log?.ownerId?.toString?.() ?? String(log?.ownerId ?? ""),
    createdAt: log?.createdAt
      ? new Date(log.createdAt).toISOString()
      : "",
    updatedAt: log?.updatedAt
      ? new Date(log.updatedAt).toISOString()
      : "",
  };
}

export async function getAuditHistory({ user, page = 1, limit = 100 }) {
  await connectDB();

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 100));
  const filter = {};

  if (user?.role !== "admin") {
    const ownerId = toObjectId(user?.id);
    if (!ownerId) return { entries: [], total: 0, page: safePage, pages: 0 };
    filter.ownerId = ownerId;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    entries: logs.map(normalizeAuditLog),
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit),
  };
}
