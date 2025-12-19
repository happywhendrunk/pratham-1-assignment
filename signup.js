const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise"); // Correct: Using promise-based version for async/await

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json()); // To parse JSON bodies from the POST request

// MySQL Database Configuration
const dbConfig = {
  host: "127.0.0.1",
  user: "root", // Replace with your MySQL user
  password: "root123456", // Replace with your MySQL password
  database: "harmonie_db", // Replace with your database name
};

// API Route: POST /api/signup
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Connect to the database
    const connection = await mysql.createConnection(dbConfig);

    // Insert the user into the database
    await connection.execute(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, password]
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
