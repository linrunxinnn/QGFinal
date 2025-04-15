const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");

const codes = {};

async function getDb() {
  return await dbPromise;
}

//获取用户头像
// router.get("/getSelfImg", async (req, res) => {
//   const userId = req.query.id;
//   // console.log("User ID from query:", userId);

//   try {
//     const db = await getDb();
//     const [rows] = await db.query(`SELECT avatar_url FROM users WHERE id = ?`, [
//       userId,
//     ]);
//     if (rows.length > 0) {
//       res.json({ avatar_url: rows[0].avatar_url });
//     } else {
//       res.status(404).json({ error: "用户未找到" });
//     }
//   } catch (err) {
//     console.error("查询头像失败:", err);
//     res.status(500).json({ error: "服务器内部错误" });
//   }
// });
router.get("/getSelfImg", async (req, res) => {
  const userId = req.query.id;
  console.log("User ID:", userId);
  try {
    const db = await getDb();
    const [rows] = await db.query(`SELECT avatar_url FROM users WHERE id = ?`, [
      userId,
    ]);
    console.log("Rows:", rows);
    if (rows.length > 0) {
      res.json({ avatar_url: rows[0].avatar_url });
    } else {
      res.status(404).json({ error: "用户未找到" });
    }
  } catch (err) {
    console.error("查询头像失败:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 初始化信息列表
router.get("/initialize/messageList", async (req, res) => {
  const userId = req.query.id;

  try {
    // 获取数据库连接
    const db = await getDb();

    const [rows] = await db.query(
      `
      SELECT 
        f.friend_id, 
        u.name AS friend_name,
        u.avatar_url AS friend_src,
        MAX(m.content) AS last_message,
        MAX(m.timestamp) AS last_time
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      LEFT JOIN (
        SELECT 
          IF(sender_id = ?, receiver_id, sender_id) AS friend_id,
          content,
          timestamp
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
      ) m ON m.friend_id = f.friend_id
      WHERE f.user_id = ? AND f.status = 'accepted'
      GROUP BY f.friend_id
      ORDER BY MAX(m.timestamp) DESC
    `,
      [userId, userId, userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("查询好友失败:", err);
    res.status(500).json({ error: "获取好友列表失败" });
  }
});

router.get("/initialize/rightBox", async (req, res) => {
  const { userid, friendid } = req.query;

  try {
    const db = await getDb();

    // 查询双方的头像
    const [avatarResults] = await db.query(
      `SELECT id, avatar_url FROM users WHERE id IN (?, ?)`,
      [userid, friendid]
    );

    // 构建头像映射
    const avatarMap = {};
    avatarResults.forEach((user) => {
      avatarMap[user.id] = user.avatar_url;
    });

    // 查询聊天记录
    const [messages] = await db.query(
      `
      SELECT sender_id, content, timestamp 
      FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
      `,
      [userid, friendid, friendid, userid]
    );

    // 构建返回结构
    res.json({
      selfAvatar: avatarMap[userid] || null,
      friendAvatar: avatarMap[friendid] || null,
      messages,
    });
  } catch (err) {
    console.error("初始化聊天框失败:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

//发送信息
router.post("/send-message", async (req, res) => {
  const { userId, friendId, message } = req.body;
  console.log("发送消息", req.body);
  try {
    const db = await getDb();
    const [result] = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
      [userId, friendId, message]
    );

    // 获取刚插入的消息
    const [newMessage] = await db.query(`SELECT * FROM messages WHERE id = ?`, [
      result.insertId,
    ]);

    // 使用全局的 io 实例广播消息
    global.io.to(`user_${userId}`).emit("new_message", newMessage[0]);
    global.io.to(`user_${friendId}`).emit("new_message", newMessage[0]);

    res.json({ success: true, message: "消息发送成功" });
  } catch (err) {
    console.error("发送消息失败:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

module.exports = router;
