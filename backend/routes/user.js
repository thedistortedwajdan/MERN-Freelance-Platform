// import { Router } from "express";
import { Router } from "express";
const router = Router();
import auth from "../middleware/auth.js";
import Task from "../models/Task.js";
import Rating from "../models/Rating.js";
import User from "../models/User.js";
// const bcrypt = require("bcrypt");
import bcrypt from "bcryptjs";
// const Task = require("../models/Task");
// import Task from "../models/Task.js";

// GET /api/users/me - profile + stats
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  const tasks =
    req.user.role === "freelancer"
      ? await User.find({ freelancer: req.user.id })
      : await User.find({ employer: req.user.id });

  const ratings = await Rating.find({ to: req.user.id });

  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    avgRating:
      ratings.length > 0
        ? (
            ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
          ).toFixed(1)
        : null,
    totalRatings: ratings.length,
  };

  res.json({ user, stats });
});

// PUT /api/users/me - update profile
router.put("/me", auth, async (req, res) => {
  const { name, password } = req.body;
  const updates = {};

  if (name) updates.name = name;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(password, salt);
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
  }).select("-password");
  res.json(updatedUser);
});

// GET /api/users/:id - public profile
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name role");
    if (!user) return res.status(404).json({ error: "User not found" });

    const ratings = await Rating.find({ to: user._id })
      .populate("from", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    const avgRating =
      ratings.length > 0
        ? (
            ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
          ).toFixed(1)
        : null;

    // 🆕 Task History (completed only)
    const taskFilter =
      user.role === "freelancer"
        ? { freelancer: user._id, status: "completed" }
        : { employer: user._id, status: "completed" };

    const completedTasks = await Task.find(taskFilter)
      .sort({ createdAt: -1 })
      .limit(5); // or more if needed

    res.json({
      user,
      avgRating,
      totalRatings: ratings.length,
      recentRatings: ratings.map((r) => ({
        score: r.score,
        comment: r.comment,
        from: r.from.name,
      })),
      completedTasks,
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid user ID" });
  }
});

export default router;
