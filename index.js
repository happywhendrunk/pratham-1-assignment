const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const cookieParser = require("cookie-parser"); // Added this

const app = express();
const port = 3000;

// Middleware
app.use(cookieParser()); // Essential for reading cookies
app.use(bodyParser.json());
//allow all cors origin
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Added for safety
  next();
});
// app.use(express.static("public")); // Highly recommended: serve your HTML/CSS from a 'public' folder

// Use a Pool instead of individual connections
const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "root123456",
  database: "harmonie_db",
  waitForConnections: true,
  connectionLimit: 10,
});

// Improved Middleware
async function isLoggedIn(req, res, next) {
  console.log(req);
  if (!req.cookies || !req.cookies.sessionId) {
    return res.status(401).json({
      message: "You need to login to book an appointment",
    });
  }
  const sessionId = req.cookies.sessionId; // Access the specific cookie

  if (!sessionId) {
    return res
      .status(401)
      .json({ message: "You need to login to book an appointment" });
  }

  try {
    // Query the pool directly
    const [users] = await pool.execute(
      "SELECT * FROM users WHERE session_id = ?", // Ensure column name matches your DB
      [sessionId]
    );

    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid session. Please login again." });
    }

    req.user = users[0]; // Store user data for use in the next route
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error during authentication" });
  }
}

function generateSessionId() {
  // Generate a random string of characters

  console.log("here");

  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let sessionId = "";

  for (let i = 0; i < 32; i++) {
    sessionId += characters[Math.floor(Math.random() * characters.length)];
  }

  return sessionId;
}

app.get("/api/auth-status", isLoggedIn, (req, res) => {
  // If isLoggedIn passes, this code runs
  res.status(200).json({ loggedIn: true, user: req.user });
});
// Cleaned up Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.execute(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const sessionId = generateSessionId();

    // Save session ID to the existing user record
    await pool.execute("UPDATE users SET session_id = ? WHERE email = ?", [
      sessionId,
      email,
    ]);

    // Send cookie to browser
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      maxAge: 3600000,
      sameSite: "lax",
      secure: false,
    }); // 1 hour
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Appointment route using the middleware
app.post("/api/appointments", isLoggedIn, async (req, res) => {
  const { name, phone, email, date, time, reason, department, timestamp } =
    req.body;

  try {
    const sql = `INSERT INTO appointments (name, phone, email, date, time, reason, department, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [
      name,
      phone,
      email,
      date,
      time,
      reason,
      department,
      timestamp,
    ]);

    res.status(201).json({
      message: "Appointment successfully saved.",
      id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ message: "Database Error", error: error.message });
  }
});

// --- API Route: POST /api/signup ---
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists first
    const [existing] = await pool.execute(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Insert the user into the database
    await pool.execute(
      "INSERT INTO users (username,email, password) VALUES (?, ?,?)",
      [username, email, password]
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "An error occurred during signup" });
  }
});

// --- API Route: GET /api/dashboard ---
// Added isLoggedIn middleware to protect the dashboard
app.get("/api/dashboard", isLoggedIn, async (req, res) => {
  // Since we use isLoggedIn, we can get the email from req.user (set in the middleware)
  const email = req.user.email;
  const username = req.user.username || email.split("@")[0];

  try {
    const [appointments] = await pool.execute(
      "SELECT * FROM appointments WHERE email = ?",
      [email]
    );

    // Send data as JSON
    res.status(200).json({
      username: username,
      appointments: appointments,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ error: "An error occurred loading dashboard data" });
  }
});

app.listen(port, () => console.log(`Server at http://127.0.0.1:${port}`));
