import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["freelancer", "employer"], required: true },
  },
  { timestamps: true }
);

export default model("User", userSchema);
