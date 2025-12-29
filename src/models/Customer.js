import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  pump: String,
  install: Date,
  lastService: Date,
  comments: [String],
});

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
