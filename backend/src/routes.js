const jwt = require("jsonwebtoken");
const authRoutes = require("./auth");
const express = require("express");
const crypto = require("crypto");
const store = require("./s3Store");

const router = express.Router();
// Login and registration routes
router.use("/auth", authRoutes);

// Protect all remaining routes
router.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Please log in."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session. Please log in again."
    });
  }
});
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Notes
router.get("/notes", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").toLowerCase();
    let notes = await store.list("notes", req.userId);
    if (search) {
      notes = notes.filter(n =>
        `${n.title} ${n.content}`.toLowerCase().includes(search)
      );
    }
    notes.sort((a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    res.json(notes);
  } catch (error) { next(error); }
});

router.post("/notes", async (req, res, next) => {
  try {
    const title = cleanText(req.body.title);
    const content = cleanText(req.body.content);
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required." });
    }
    const now = new Date().toISOString();
    const note = {
      id: crypto.randomUUID(), title, content, pinned: false,
      createdAt: now, updatedAt: now
    };
    await store.save("notes", note,req.userId);
    res.status(201).json(note);
  } catch (error) { next(error); }
});

router.put("/notes/:id", async (req, res, next) => {
  try {
    const existing = await store.get("notes", req.params.id,req.userId);
    if (!existing) return res.status(404).json({ message: "Note not found." });

    const title = cleanText(req.body.title);
    const content = cleanText(req.body.content);
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required." });
    }
    const updated = { ...existing, title, content, updatedAt: new Date().toISOString() };
    await store.save("notes", updated,req.userId);
    res.json(updated);
  } catch (error) { next(error); }
});

router.patch("/notes/:id/pin", async (req, res, next) => {
  try {
    const note = await store.get("notes", req.params.id,req.userId);
    if (!note) return res.status(404).json({ message: "Note not found." });
    const updated = { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() };
    await store.save("notes", updated,req.userId);
    res.json(updated);
  } catch (error) { next(error); }
});

router.delete("/notes/:id", async (req, res, next) => {
  try {
    const note = await store.get("notes", req.params.id,req.userId);
    if (!note) return res.status(404).json({ message: "Note not found." });
    await store.remove("notes", req.params.id,req.userId);
    res.json({ message: "Note deleted." });
  } catch (error) { next(error); }
});

// Tasks
router.get("/tasks", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").toLowerCase();
    let tasks = await store.list("tasks",req.userId);
    if (search) {
      tasks = tasks.filter(t =>
        `${t.title} ${t.description || ""}`.toLowerCase().includes(search)
      );
    }
    tasks.sort((a, b) =>
      Number(a.completed) - Number(b.completed) ||
      new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31")
    );
    res.json(tasks);
  } catch (error) { next(error); }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const title = cleanText(req.body.title);
    if (!title) return res.status(400).json({ message: "Task title is required." });
    const now = new Date().toISOString();
    const task = {
      id: crypto.randomUUID(),
      title,
      description: cleanText(req.body.description),
      priority: ["low", "medium", "high"].includes(req.body.priority) ? req.body.priority : "medium",
      dueDate: req.body.dueDate || "",
      completed: false,
      createdAt: now,
      updatedAt: now
    };
    await store.save("tasks", task,req.userId);
    res.status(201).json(task);
  } catch (error) { next(error); }
});

router.put("/tasks/:id", async (req, res, next) => {
  try {
    const existing = await store.get("tasks", req.params.id,req.userId);
    if (!existing) return res.status(404).json({ message: "Task not found." });
    const title = cleanText(req.body.title);
    if (!title) return res.status(400).json({ message: "Task title is required." });
    const updated = {
      ...existing,
      title,
      description: cleanText(req.body.description),
      priority: ["low", "medium", "high"].includes(req.body.priority) ? req.body.priority : "medium",
      dueDate: req.body.dueDate || "",
      updatedAt: new Date().toISOString()
    };
    await store.save("tasks", updated,req.userId);
    res.json(updated);
  } catch (error) { next(error); }
});

router.patch("/tasks/:id/toggle", async (req, res, next) => {
  try {
    const task = await store.get("tasks", req.params.id,req.userId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    const updated = { ...task, completed: !task.completed, updatedAt: new Date().toISOString() };
    await store.save("tasks", updated,req.userId);
    res.json(updated);
  } catch (error) { next(error); }
});

router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const task = await store.get("tasks", req.params.id,req.userId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    await store.remove("tasks", req.params.id,req.userId);
    res.json({ message: "Task deleted." });
  } catch (error) { next(error); }
});

module.exports = router;
