import mongoose from "mongoose";

const AuditChangeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    from: { type: String, default: "" },
    to: { type: String, default: "" },
  },
  { _id: false },
);

const AuditLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      userId: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      role: { type: String, default: "user", trim: true },
    },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    customerId: { type: String, required: true, trim: true, index: true },
    customerName: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    changes: { type: [AuditChangeSchema], default: [] },
  },
  { timestamps: true },
);

AuditLogSchema.index({ ownerId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
