import { Schema, model } from "mongoose";

const ratingSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  { timestamps: true }
);

ratingSchema.index({ from: 1, to: 1, task: 1 }, { unique: true });

export default model("Rating", ratingSchema);
