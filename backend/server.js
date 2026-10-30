require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./src/routes");

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map(v => v.trim())
    : "http://localhost:5173"
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "notes-task-manager-api" });
});

app.use("/api", routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Server error. Check backend logs." });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Notes & Tasks API listening on port ${port}`);
});
