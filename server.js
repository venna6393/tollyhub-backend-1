const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise"); // Updated import
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const port = 5001;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(bodyParser.json({ limit: "50mb" })); // Increase limit to handle large files

app.use(cors());

// Create MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "9701386393",
  database: "tollyhub",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Secret key for JWT
const jwtSecretKey = "your_jwt_secret_key";

// Helper function to generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, jwtSecretKey, { expiresIn: "1h" });
}

// Helper function to verify JWT token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// API endpoints

// Signup
app.post("/signup", async (req, res) => {
  const { username, email, password, phoneNumber } = req.body;
  try {
    const connection = await pool.getConnection();
    try {
      const [existingUser] = await connection.execute(
        "SELECT * FROM Users WHERE email = ?",
        [email]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        "INSERT INTO Users (username, email, password,phone_number) VALUES (?, ?, ?,?)",
        [username, email, hashedPassword, phoneNumber]
      );
      res.json({ message: "User created successfully" });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const connection = await pool.getConnection();
    try {
      const [user] = await connection.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (user.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const passwordMatch = await bcrypt.compare(password, user[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateToken(user[0].user_id);
      res.json({ token });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//submit-story

app.post("/submit-story", async (req, res) => {
  const { storyName, storyPDF, storyData } = req.body;
  if (!storyName || !storyData) {
    return res.status(400).send("No file data provided.");
  }

  const binaryData = Buffer.from(storyData, "base64");
  console.log(binaryData);
  const writerId = 1;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        "INSERT INTO stories (story_name, story_pdf, writer_id,data) VALUES (?, ?, ?,?)",
        [storyName, storyPDF, writerId, binaryData]
      );
      res.json({ msg: "Story submitted for initial review" });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// submit-music
app.post("/submit-music", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }
  const composerId = 1;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        "INSERT INTO music (song_name, data, composer_id) VALUES (?, ?, ?)",
        [file.originalname, file.buffer, composerId]
      );
      res.json({ msg: "Music submitted for initial review" });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
