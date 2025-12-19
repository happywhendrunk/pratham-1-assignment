const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");

const app = express();
const port = 3000;

// Middleware
app.use((req, res, next) => {
  // IMPORTANT: In a real application, replace '*' with the specific origin of your frontend (e.g., 'http://127.0.0.1:8080')
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Added for safety
  next();
});
app.use(bodyParser.json());

// MySQL Database Configuration
const dbConfig = {
  host: "127.0.0.1",
  user: "root", // Replace with your MySQL user
  password: "root123456", // Replace with your MySQL password
  database: "harmonie_db", // Replace with your database name
};

// API Route: GET /api/dashboard
app.get("/api/dashboard", async (req, res) => {
  const { email } = req.query; // Assuming the email is passed as a query parameter

  try {
    // Connect to the database
    const connection = await mysql.createConnection(dbConfig);

    // Fetch the user's appointments from the database
    const [appointments] = await connection.execute(
      "SELECT * FROM appointments WHERE email = $1",
      [email]
    );

    // Display the user's appointments on the dashboard page
    const appointmentsHtml = appointments
      .map(
        (appointment) =>
          `<li>${appointment.date} - ${appointment.description}</li>`
      )
      .join("");

    res.status(200).send(`
      <h2>Welcome, ${appointments[0].username}</h2>
      <h3>Your Appointments:</h3>
      <ul>${appointments}</ul>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
