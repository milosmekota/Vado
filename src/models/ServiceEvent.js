import mongoose from "mongoose";

const { Schema } = mongoose;

const ServiceEventSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

export default mongoose.models.ServiceEvent ||
  mongoose.model("ServiceEvent", ServiceEventSchema);
