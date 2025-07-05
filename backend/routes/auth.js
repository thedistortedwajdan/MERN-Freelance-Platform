import { Router } from "express";
import { hash, compare } from "bcryptjs";
// import { sign } from "jsonwebtoken";
import pkg from "jsonwebtoken";
const { sign } = pkg;
import User from "../models/User.js";

const router = Router();

// Register
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashed = await hash(password, 10);
    const newUser = new User({ name, email, password: hashed, role });
    await newUser.save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: "Email may already be in use" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });

  const isMatch = await compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  const token = sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
});

export default router;
