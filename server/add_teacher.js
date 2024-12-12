const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "10.0.20.10",
  user: "canvas_user", // Use the MySQL user created earlier
  password: "password", // Use the password you set for the MySQL user
  database: "canvas",
});

async function addTeacher(username, plainPassword) {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    await pool.query("INSERT INTO teachers (username, password) VALUES (?, ?)", [username, hashedPassword]);
    console.log(`Teacher ${username} added with hashed password.`);
  } catch (error) {
    console.error("Error adding teacher:", error);
  }
}

// Add a teacher with hashed password
addTeacher("prof", "pass");
