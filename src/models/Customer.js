import mongoose from "mongoose";

const MODEL_NAME = "Customer";

const CommentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    user: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },

    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    manufacturer: { type: String, trim: true, default: "" },
    serialNumber: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "" },

    installYear: { type: Number, min: 1900, max: 3000, default: null },

    online: { type: Boolean, default: false },

    lastService: { type: String, trim: true, default: "" },

    comments: { type: [CommentSchema], default: [] },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  if (mongoose.models[MODEL_NAME]) {
    delete mongoose.models[MODEL_NAME];
  }
}

export default mongoose.models[MODEL_NAME] ||
  mongoose.model(MODEL_NAME, CustomerSchema);
