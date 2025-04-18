require("dotenv").config();
const express = require("express");
const { authenticateToken } = require("./middleware/auth");
const cors = require("cors");
const mysql = require("mysql2");
const db = require("./config/db");
const app = express();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const logRouter = require("./routes/log");
const userRouter = require("./routes/user");
const projectRouter = require("./routes/project");
const taskRouter = require("./routes/program");
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    methods: ["GET", "POST"],
  },
});
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    credentials: true,
  })
);
app.use(express.static(path.join(__dirname, "../public")));
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

// Socket.io 连接处理
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`用户 ${userId} 已连接`);
  }

  socket.on("disconnect", () => {
    console.log(`用户 ${userId} 已断开`);
  });
});

// 全局保存 io 实例给路由使用
global.io = io;

app.use("/log", logRouter);
app.use("/user", authenticateToken, userRouter);
app.use("/project", authenticateToken, projectRouter);
app.use("/tasks", authenticateToken, taskRouter);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
