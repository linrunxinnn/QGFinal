const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");
const db = require("../config/db");

const codes = {};

async function getDb() {
  return await dbPromise;
}

//获取用户头像
router.get("/getSelfImg", async (req, res) => {
  const userId = req.query.id;
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
//获取用户名字
router.get("/getSelfName", async (req, res) => {
  const userId = req.query.id;
  try {
    const db = await getDb();
    const [rows] = await db.query(`SELECT name FROM users WHERE id = ?`, [
      userId,
    ]);
    console.log("Rows:", rows);
    if (rows.length > 0) {
      res.json({ name: rows[0].name });
    } else {
      res.status(404).json({ error: "用户未找到" });
    }
  } catch (err) {
    console.error("查询名字失败:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 初始化信息列表
router.get("/initialize/messageList", async (req, res) => {
  const userId = parseInt(req.query.id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "无效的用户ID" });
  }

  try {
    const db = await getDb();
    const [rows] = await db.query(
      `
      SELECT 
        CASE 
          WHEN f.user_id = ? THEN f.friend_id 
          ELSE f.user_id 
        END AS friend_id,
        u.name AS friend_name,
        u.avatar_url AS friend_src,
        MAX(m.content) AS last_message,
        MAX(m.timestamp) AS last_time
      FROM friends f
      JOIN users u ON u.id = CASE 
        WHEN f.user_id = ? THEN f.friend_id 
        ELSE f.user_id 
      END
      LEFT JOIN (
        SELECT 
          CASE 
            WHEN sender_id = ? THEN receiver_id 
            ELSE sender_id 
          END AS friend_id,
          content,
          timestamp
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
      ) m ON m.friend_id = CASE 
        WHEN f.user_id = ? THEN f.friend_id 
        ELSE f.user_id 
      END
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
      GROUP BY friend_id, u.name, u.avatar_url
      ORDER BY MAX(m.timestamp) DESC
    `,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );

    // console.log("Fetched message list:", rows);
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

// 获取与用户相关的项目列表（支持筛选）
// router.get("/initialize/projectList", async (req, res) => {
//   try {
//     const db = await getDb();

//     const userId = req.user.id;
//     const statusFilter = req.query.status; // 获取筛选参数，例如 "doing"

//     let query = `SELECT DISTINCT p.id AS project_id, p.name AS project_name, p.description,
//                         p.created_at, p.progress, p.status
//                  FROM projects p
//                  LEFT JOIN \`groups\` g ON p.id = g.project_id
//                  LEFT JOIN group_members gm ON g.id = gm.group_id
//                  WHERE (p.created_by = ? OR gm.user_id = ?)`;

//     const queryParams = [userId, userId];

//     if (statusFilter) {
//       query += ` AND p.status = ?`;
//       queryParams.push(statusFilter);
//     }

//     query += ` ORDER BY p.created_at DESC`;

//     const [projects] = await db.query(query, queryParams);

//     if (!projects || projects.length === 0) {
//       return res.json([]);
//     }

//     const projectList = await Promise.all(
//       projects.map(async (project) => {
//         const [tags] = await db.query(
//           `SELECT t.* FROM tags t
//            JOIN project_tags pt ON t.id = pt.tag_id
//            WHERE pt.project_id = ?`,
//           [project.project_id]
//         );
//         return {
//           project_id: project.project_id,
//           project_name: project.project_name,
//           project_description: project.description,
//           created_at: project.created_at.toISOString().split("T")[0],
//           progress: project.progress,
//           status: project.status,
//           tags: tags || [],
//         };
//       })
//     );

//     res.json(projectList);
//   } catch (error) {
//     console.error("后端错误:", error);
//     res.status(500).json({ message: "服务器错误", error: error.message });
//   }
// });
router.get("/initialize/projectList", async (req, res) => {
  try {
    const db = await getDb();

    const userId = req.user.id;
    const statusFilter = req.query.status;

    console.log(`用户 ID: ${userId}, 筛选状态: ${statusFilter}`);

    let query = `SELECT DISTINCT p.id AS project_id, p.name AS project_name, p.description, 
                        p.created_at, p.progress, p.status
                 FROM projects p
                 JOIN project_members pm ON p.id = pm.project_id
                 WHERE pm.user_id = ?`;

    const queryParams = [userId];

    if (statusFilter) {
      query += ` AND p.status = ?`;
      queryParams.push(statusFilter);
    }

    query += ` ORDER BY p.created_at DESC`;

    console.log(`执行查询: ${query}, 参数: ${queryParams}`);
    const [projects] = await db.query(query, queryParams);

    if (!projects || projects.length === 0) {
      console.log("未找到项目，返回空数组");
      return res.json([]);
    }

    const projectList = await Promise.all(
      projects.map(async (project) => {
        const [tags] = await db.query(
          `SELECT t.* FROM tags t
           JOIN project_tags pt ON t.id = pt.tag_id
           WHERE pt.project_id = ?`,
          [project.project_id]
        );
        return {
          project_id: project.project_id,
          project_name: project.project_name,
          project_description: project.description,
          created_at: project.created_at.toISOString().split("T")[0],
          progress: project.progress,
          status: project.status,
          tags: tags || [],
        };
      })
    );

    res.json(projectList);
  } catch (error) {
    console.error("后端错误详情:", error);
    res.status(500).json({
      message: "服务器错误",
      error: error.message,
      stack: error.stack,
    });
  }
});

//获取好友信息
router.get("/friends/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const db = await getDb();

    const [friends] = await db.query(
      `
          SELECT u.id, u.name, u.avatar_url
          FROM users u
          INNER JOIN friends f ON (f.friend_id = u.id AND f.user_id = ?) OR (f.user_id = u.id AND f.friend_id = ?)
          WHERE f.status = 'accepted'
      `,
      [userId, userId]
    );

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ success: false, error: "获取好友列表失败" });
  }
});

module.exports = router;
