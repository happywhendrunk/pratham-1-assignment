const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise"); // Correct: Using promise-based version for async/await

const app = express();
const port = 3000;

// Middleware
// Allows the front-end (index.html) to make requests from a different origin (browser)
app.use((req, res, next) => {
  // IMPORTANT: In a real application, replace '*' with the specific origin of your frontend (e.g., 'http://localhost:8080')
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Added for safety
  next();
});
app.use(bodyParser.json()); // To parse JSON bodies from the POST request

// --- MySQL Database Configuration ---
const dbConfig = {
  host: "localhost",
  user: "root", // Replace with your MySQL user
  password: "root123456", // Replace with your MySQL password
  database: "harmonie_db", // Replace with your database name
};

// --- API Route: POST /api/appointments ---
app.post("/api/appointments", async (req, res) => {
  // Correctly destructure all required fields from the request body
  const { name, phone, email, date, time, reason, department, timestamp } =
    req.body;

  // Basic validation
  if (!name || !email || !date || !time) {
    return res.status(400).json({
      message: "Missing required fields: name, email, date, or time.",
    });
  }

  // Initialize connection outside try/catch
  let connection;

  try {
    // Establish connection inside the route handler
    connection = await mysql.createConnection(dbConfig);

    // SQL query to insert the new appointment (using '?' placeholders is the correct method for mysql2)
    const sql = `
            INSERT INTO appointments (name, phone, email, date, time, reason, department, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      name,
      phone,
      email,
      date,
      time,
      reason,
      department,
      timestamp,
    ];

    // Execute the query. The result array contains [results, fields]
    const [result] = await connection.execute(sql, values);

    // Send back a success response with the ID of the new record
    res.status(201).json({
      message: "Appointment successfully saved.",
      id: result.insertId,
    });
  } catch (error) {
    // Log the error for server-side debugging
    console.error("Database Error during appointment submission:", error);

    // Send a detailed error response to the client
    res.status(500).json({
      message: "Failed to save appointment due to a server or database error.",
      details: error.message,
    });
  } finally {
    // Close the connection in the finally block to ensure it happens even on error
    if (connection) {
      await connection.end();
    }
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log("API Endpoint: POST http://localhost:3000/api/appointments");
  console.log(
    "Remember to start your MySQL service and ensure the table exists!"
  );
});
