import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: String, required: true },
  date: { type: String, required: true },
});

const CustomerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  pump: String,
  install: String,
  lastService: String,
  comments: { type: [CommentSchema], default: [] },
});

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
