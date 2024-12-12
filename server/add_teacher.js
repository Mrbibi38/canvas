const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "10.0.10.10", // Replace with your MySQL host
  user: "canvas_user", // Replace with your MySQL username
  password: "Masterrie2024!", // Replace with your MySQL password
  database: "CANVAS", // Replace with your database name
});

async function addTeacher(username, plainPassword) {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10); // Hash the password
    await pool.query("INSERT INTO teachers (username, password) VALUES (?, ?)", [username, hashedPassword]);
    console.log(`Teacher ${username} added with hashed password.`);
  } catch (error) {
    console.error("Error adding teacher:", error);
  }
}

// Add a teacher with hashed password
addTeacher("test_teacher", "test_password");

// Exit the script
process.exit(0);