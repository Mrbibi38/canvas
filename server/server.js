const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid"); // UUID package to generate unique tokens
const bcrypt = require("bcryptjs"); // For password hashing and verification
const mysql = require("mysql2/promise"); // MySQL database library

const WS_PORT = 8080;
const API_PORT = 8888;

// WebSocket Server setup
const wss = new WebSocket.Server({ host: "0.0.0.0", port: WS_PORT });

// Express server setup
const cors = require("cors");
const express = require("express");
const app = express();

// Enable JSON parsing for the Express app
app.use(express.json());
app.use(cors()); // Allow all origins

// MySQL connection pool
const pool = mysql.createPool({
  host: "10.0.10.10", // Replace with your MySQL host
  user: "canvas_user", // Replace with your MySQL username
  password: "Masterrie2024!", // Replace with your MySQL password
  database: "CANVAS", // Replace with your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Map to store clients and their tokens
const clients = new Map();
const teachers = new Map();

// WebSocket connection handling
wss.on("connection", function connection(ws) {
  const clientToken = uuidv4(); // Generate a unique token for the client
  clients.set(ws, clientToken); // Store the token with the WebSocket connection

  console.log(`A client connected with token: ${clientToken}`);

  // Send the token back to the client
  ws.send(JSON.stringify({ token: clientToken }));

  // Handle incoming messages
  ws.on("message", async function incoming(message) {
    if (Buffer.isBuffer(message)) {
      message = message.toString(); // Convert Buffer to string
    }

    if (typeof message === "string") {
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.clearBoard) {
        console.log("Clear board message received. Broadcasting to all clients.");

        // Broadcast the clear board message to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ clearBoard: true })); // Broadcast the clear signal
          }
        });
      } else {
        const clientToken = clients.get(ws);
        if (teachers.has(clientToken)) {
          // Broadcast the drawing data to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log("Broadcasting: " + message);
              client.send(message); // Send the drawing message
            }
          });
        } else {
          console.log(`Client ${clientToken} attempted to draw without permission.`);
        }
      }
    } else {
      console.warn("Received non-string message");
    }
  });

  ws.on("close", function close() {
    const clientToken = clients.get(ws);
    console.log(`A client disconnected with token: ${clientToken}`);
    clients.delete(ws); // Remove the client from the map
  });
});

console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);

// Route for login
app.post("/login", async (req, res) => {
  const { username, password, clientToken } = req.body;

  try {
    // Query the database for the user's credentials
    const [rows] = await pool.query("SELECT * FROM teachers WHERE username = ?", [username]);

    if (rows.length > 0) {
      const teacher = rows[0];

      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(password, teacher.password);

      if (passwordMatch) {
        console.log(`Client ${clientToken} logged in successfully as teacher.`);
        teachers.set(clientToken, true); // Store the teacher token

        return res.json({
          message: "Login successful",
          newToken: clientToken, // Optionally send a new token
        });
      } else {
        console.log(`Client ${clientToken} provided an invalid password.`);
        return res.status(401).json({ message: "Invalid username or password" });
      }
    } else {
      console.log(`Client ${clientToken} tried to login with non-existent username: ${username}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route for logout
app.post("/logout", (req, res) => {
  const { clientToken } = req.body;

  if (!clientToken || !teachers.has(clientToken)) {
    return res.status(400).json({ message: "Invalid or non-existent token" });
  }

  teachers.delete(clientToken);
  console.log(`Teacher with token ${clientToken} has logged out`);

  res.json({ message: "Logout successful" });
});

// Start Express server
app.listen(API_PORT, () => {
  console.log(`Express server running on http://localhost:${API_PORT}`);
});
