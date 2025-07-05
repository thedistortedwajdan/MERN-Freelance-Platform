import { Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    title: String,
    description: String,
    price: Number,
    location: String,
    status: {
      type: String,
      enum: ["open", "assigned", "completed"],
      default: "open",
    },
    employer: { type: Schema.Types.ObjectId, ref: "User" },
    freelancer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default model("Task", taskSchema);
