const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const fileUpload = require("express-fileupload");
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
    // console.log("Rows:", rows);
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
    // console.log("Rows:", rows);
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
                f.friend_id,
                u.name AS friend_name,
                u.avatar_url AS friend_src,
                f.status AS friend_status,
                m.content AS last_message,
                m.timestamp AS last_time
              FROM (
                SELECT 
                  CASE 
                    WHEN user_id = ? THEN friend_id 
                    ELSE user_id 
                  END AS friend_id,
                  status
                FROM friends
                WHERE user_id = ? OR friend_id = ?
              ) f
              JOIN users u ON u.id = f.friend_id
              LEFT JOIN (
                SELECT 
                  m1.sender_id,
                  m1.receiver_id,
                  m1.content,
                  m1.timestamp
                FROM messages m1
                WHERE m1.timestamp = (
                  SELECT MAX(m2.timestamp)
                  FROM messages m2
                  WHERE 
                    (m2.sender_id = m1.sender_id AND m2.receiver_id = m1.receiver_id)
                    OR (m2.sender_id = m1.receiver_id AND m2.receiver_id = m1.sender_id)
                )
              ) m ON (m.sender_id = ? AND m.receiver_id = f.friend_id)
                  OR (m.receiver_id = ? AND m.sender_id = f.friend_id)
              ORDER BY m.timestamp DESC
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

    // 查询好友状态
    const [friendStatus] = await db.query(
      `
      SELECT status, user_id, friend_id 
      FROM friends 
      WHERE (user_id = ? AND friend_id = ?) 
         OR (user_id = ? AND friend_id = ?)
      `,
      [userid, friendid, friendid, userid]
    );

    // 确定好友状态和谁需要通过
    let status = "not_friends"; // 默认不是好友
    let needsApproval = null; // 需要通过请求的用户ID
    if (friendStatus.length > 0) {
      status = friendStatus[0].status;
      if (status === "pending") {
        // 如果是pending状态，friend_id 需要通过 user_id 的请求
        needsApproval = friendStatus[0].friend_id;
      }
    }

    // 构建返回结构
    res.json({
      selfAvatar: avatarMap[userid] || null,
      friendAvatar: avatarMap[friendid] || null,
      messages,
      friendStatus: status,
      needsApproval,
    });
  } catch (err) {
    console.error("初始化聊天框失败:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

//发送信息
router.post("/send-message", async (req, res) => {
  const { userId, friendId, message } = req.body;
  senderId = parseInt(userId, 10);
  receiverId = parseInt(friendId, 10);
  console.log("发送消息", req.body);
  try {
    const db = await getDb();

    // 检查好友状态
    const [friendship] = await db.query(
      `
      SELECT status
      FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `,
      [senderId, receiverId, receiverId, senderId]
    );

    if (friendship.length === 0) {
      return res.status(403).json({ success: false, error: "你们还不是好友" });
    }

    if (friendship[0].status !== "accepted") {
      return res
        .status(403)
        .json({ success: false, error: "好友请求尚未通过，无法发送消息" });
    }

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
router.get("/initialize/projectList", async (req, res) => {
  try {
    const db = await getDb();

    const userId = req.user.id;
    const statusFilter = req.query.status;

    // console.log(`用户 ID: ${userId}, 筛选状态: ${statusFilter}`);

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

    // console.log(`执行查询: ${query}, 参数: ${queryParams}`);
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

        // 查询项目的所有任务并计算进度
        const [tasks] = await db.query(
          `SELECT status FROM tasks WHERE project_id = ?`,
          [project.project_id]
        );

        // console.log("项目任务列表:", tasks, "项目ID:", project.project_id);

        // 计算任务的完成进度
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (task) => task.status === "over"
        ).length;
        const progress =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // console.log("项目进度", progress);

        return {
          project_id: project.project_id,
          project_name: project.project_name,
          project_description: project.description,
          created_at: project.created_at.toISOString().split("T")[0],
          progress: progress.toFixed(2),
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

//添加好友
router.get("/search", async (req, res) => {
  const { account } = req.query;
  const userId = req.user.id;

  if (!account) {
    return res.status(400).json({ success: false, error: "请输入账号" });
  }

  try {
    const db = await getDb();
    const [users] = await db.query(
      `
      SELECT id, name, avatar_url
      FROM users
      WHERE email LIKE ? 
      `,
      [`%${account}%`]
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error("搜索用户失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

router.post("/add", async (req, res) => {
  console.log("收到添加好友请求:", req.body);
  const { friendId } = req.body;
  const userId = req.user.id;

  if (!friendId || isNaN(parseInt(friendId, 10))) {
    return res.status(400).json({ success: false, error: "无效的用户ID" });
  }

  try {
    const db = await getDb();

    const [friend] = await db.query("SELECT id FROM users WHERE id = ?", [
      friendId,
    ]);
    if (friend.length === 0) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    const [existing] = await db.query(
      `
      SELECT * FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `,
      [userId, friendId, friendId, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "已经是好友" });
    }

    await db.query(
      `
      INSERT INTO friends (user_id, friend_id, status)
      VALUES (?, ?, 'pending')
      `,
      [userId, friendId]
    );

    // 发送验证消息
    await db.query(
      `
      INSERT INTO messages (sender_id, receiver_id, content, timestamp)
      VALUES (?, ?, ?, NOW())
      `,
      [userId, friendId, "希望成为你的好友，请通过"]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("添加好友失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

//通过好友请求
router.post("/accept", async (req, res) => {
  const { friendId, userId } = req.body;

  try {
    const db = await getDb();

    // 检查好友关系是否存在且状态为pending
    const [friendship] = await db.query(
      `
      SELECT * FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `,
      [userId, friendId, friendId, userId]
    );

    if (friendship.length === 0) {
      return res.status(404).json({ success: false, error: "好友关系不存在" });
    }

    if (friendship[0].status !== "pending") {
      return res
        .status(400)
        .json({ success: false, error: "好友请求状态不正确" });
    }

    // 更新好友状态为accepted
    await db.query(
      `
      UPDATE friends
      SET status = 'accepted'
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `,
      [userId, friendId, friendId, userId]
    );

    // 发送验证消息
    await db.query(
      `
      INSERT INTO messages (sender_id, receiver_id, content, timestamp)
      VALUES (?, ?, ?, NOW())
      `,
      [userId, friendId, "我们已经成为好友啦！"]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("接受好友请求失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 更新用户名或邮箱
router.post("/update", async (req, res) => {
  const { userId, name, email } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "用户ID不能为空" });
  }

  try {
    const db = await getDb();
    let query, params;

    if (name) {
      query = "UPDATE users SET name = ? WHERE id = ?";
      params = [name, userId];
    }
    // else if (email) {
    //   query = "UPDATE users SET email = ? WHERE id = ?";
    //   params = [email, userId];
    // }
    else {
      return res
        .status(400)
        .json({ success: false, error: "未提供要更新的字段" });
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 上传头像
router.post("/uploadAvatar", async (req, res) => {
  if (!req.files || !req.files.avatar) {
    return res.status(400).json({ success: false, error: "未上传文件" });
  }

  const userId = req.body.userId;
  const file = req.files.avatar; // 获取上传的文件

  if (!userId) {
    return res.status(400).json({ success: false, error: "用户ID不能为空" });
  }

  try {
    const db = await getDb();

    const originalName = Buffer.from(file.name, "latin1").toString("utf8");
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const sanitizedName = `${userId}_${Date.now()}_${baseName}${extension}`;

    // 保存到前端的 public/img 目录
    const uploadDir = path.join(__dirname, "../../font/public/img"); // 假设前端目录在 ../../font/public
    const filePath = path.join(uploadDir, sanitizedName);

    await fs.mkdir(uploadDir, { recursive: true });
    await file.mv(filePath);

    const avatarPath = `../img/${sanitizedName}`; // 前端可以直接访问的路径
    const [result] = await db.query(
      "UPDATE users SET avatar_url = ? WHERE id = ?",
      [avatarPath, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    res.json({ success: true, avatarPath });
  } catch (error) {
    console.error("上传头像失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

module.exports = router;
