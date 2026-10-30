
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} = require("@aws-sdk/client-s3");

const store = require("./s3Store");

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1"
});

const bucket = process.env.S3_BUCKET;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required.");
}

const USERS_KEY = "notes-manager/users.json";

async function getUsers() {
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: USERS_KEY
    }));

    return JSON.parse(await result.Body.transformToString());

  } catch (error) {
    if (
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return [];
    }

    throw error;
  }
}

async function saveUsers(users) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: USERS_KEY,
    Body: JSON.stringify(users, null, 2),
    ContentType: "application/json"
  }));
}

// Register
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || password.length < 6) {
      return res.status(400).json({
        message: "Enter your name, email and a password of at least 6 characters."
      });
    }

    const users = await getUsers();

    if (users.some(user => user.email === email)) {
      return res.status(409).json({
        message: "This email is already registered."
      });
    }

    const isFirstUser = users.length === 0;

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      password: await bcrypt.hash(password, 10)
    };

    users.push(user);
    await saveUsers(users);

    // Transfer old notes and tasks to the first registered user
    if (isFirstUser) {
      for (const type of ["notes", "tasks"]) {
        const oldRecords = await store.listOld(type);

        for (const record of oldRecords) {
          await store.save(type, record, user.id);
        }
      }
    }

    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    next(error);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const users = await getUsers();

    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
