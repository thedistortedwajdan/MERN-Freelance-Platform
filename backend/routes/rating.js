// const router = require("express").Router();
import { Router } from "express";
import auth from "../middleware/auth.js";
import Rating from "../models/Rating.js";
import Task from "../models/Task.js";

const router = Router();

// POST /api/ratings
router.post("/", auth, async (req, res) => {
  const { to, task, score, comment } = req.body;

  // Ensure the user was part of the task
  const relatedTask = await Task.findById(task);
  if (!relatedTask) return res.status(404).json({ error: "Task not found" });

  const involved = [
    relatedTask.employer.toString(),
    relatedTask.freelancer?.toString(),
  ];
  if (!involved.includes(req.user.id))
    return res.status(403).json({ error: "Not allowed to rate for this task" });

  if (!involved.includes(to))
    return res.status(400).json({ error: "Invalid recipient" });

  try {
    const newRating = new Rating({
      from: req.user.id,
      to,
      task,
      score,
      comment,
    });
    await newRating.save();
    res.status(201).json(newRating);
  } catch (err) {
    res
      .status(400)
      .json({ error: "You have already rated this user for this task" });
  }
});

// GET /api/ratings/:userId
router.get("/:userId", async (req, res) => {
  const ratings = await Rating.find({ to: req.params.userId }).populate(
    "from",
    "name"
  );
  res.json(ratings);
});

export default router;
