require("dotenv").config();
const express = require("express");
const { authenticateToken } = require("./middleware/auth");
const cors = require("cors");
const mysql = require("mysql2");
const db = require("./config/db");
const app = express();
const logRouter = require("./routes/log");
const userRouter = require("./routes/user");
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    credentials: true,
  })
);
async function someFunction() {
  const pool = await db;
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query("SELECT * FROM users");
    console.log(rows);
  } finally {
    connection.release();
  }
}

app.use("/log", logRouter);
app.use("/user", authenticateToken, userRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
