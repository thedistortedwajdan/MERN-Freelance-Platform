// const router = require("express").Router();
import { Router } from "express";
import Task from "../models/Task.js";
import auth from "../middleware/auth.js";

const router = Router();

// Create Task (Employer only)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "employer")
    return res.status(403).json({ error: "Only employers can post tasks" });

  const task = new Task({ ...req.body, employer: req.user.id });
  await task.save();
  res.status(201).json(task);
});


router.get("/", auth, async (req, res) => {
  const { location, minPrice, maxPrice, q } = req.query;
  const query = { status: "open" };

  if (location) query.location = new RegExp(location, "i");
  if (minPrice || maxPrice) query.price = {};
  if (minPrice) query.price.$gte = Number(minPrice);
  if (maxPrice) query.price.$lte = Number(maxPrice);
  if (q) query.title = new RegExp(q, "i");

  const tasks = await Task.find(query).populate("employer", "name");
  res.json(tasks);
});

// Accept Task
router.post("/:id/accept", auth, async (req, res) => {
  if (req.user.role !== "freelancer")
    return res.status(403).json({ error: "Only freelancers can accept tasks" });

  const task = await Task.findById(req.params.id);
  if (task.status !== "open")
    return res.status(400).json({ error: "Task already assigned" });

  task.status = "assigned";
  task.freelancer = req.user.id;
  await task.save();
  res.json({ message: "Task accepted", task });
});

// Complete Task
router.post("/:id/complete", auth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (task.freelancer.toString() !== req.user.id)
    return res
      .status(403)
      .json({ error: "Only assigned freelancer can complete task" });

  task.status = "completed";
  await task.save();
  res.json({ message: "Task completed" });
});

// GET /api/tasks/posted - Employer’s own tasks
router.get('/posted', auth, async (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ error: 'Access denied' });

  const tasks = await Task.find({ employer: req.user.id })
    .populate('freelancer', 'name')
    .sort({ createdAt: -1 });

  res.json(tasks);
});

// GET /api/tasks/:id - Single task details
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('employer', 'name')
      .populate('freelancer', 'name');
    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.json(task);
  } catch (err) {
    res.status(400).json({ error: 'Invalid Task ID' });
  }
});

// POST /api/tasks/:id/complete
router.post('/:id/complete', auth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (task.status !== 'assigned') return res.status(400).json({ error: 'Task is not assigned yet' });

  if (task.freelancer.toString() !== req.user.id)
    return res.status(403).json({ error: 'Only assigned freelancer can mark this task complete' });

  task.status = 'completed';
  await task.save();

  res.json({ message: 'Task marked as completed' });
});



export default router;
