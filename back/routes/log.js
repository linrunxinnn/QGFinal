const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");
const e = require("cors");

const codes = {};

async function getDb() {
  return await dbPromise;
}

const transporter = nodemailer.createTransport({
  service: "qq",
  host: "smtp.qq.com",
  port: 465,
  secure: true,
  auth: {
    user: "1689785565@qq.com", // 你的QQ邮箱
    pass: "jumhthrdswjreejg", // QQ邮箱的授权码
  },
});

// 登录
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(
      "SELECT id, email FROM users WHERE email = ? AND password_hash = ?",
      [email, password]
    );

    if (rows.length > 0) {
      const token = generateToken(rows[0]);
      res.json({
        success: true,
        message: "登录成功",
        token: token,
        user: { id: rows[0].id, email: rows[0].email },
      });
    } else {
      res.json({ success: false, message: "无效的账号或密码" });
    }
  } catch (err) {
    console.error("登录错误:", err);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    connection.release();
  }
});

// 发送验证码
router.post("/send-code", async (req, res) => {
  const { email } = req.body; // 改为接收 email
  if (!email) {
    return res.status(400).json({ success: false, message: "请输入邮箱" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6位验证码
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30分钟后过期

  codes[email] = { code, expiresAt }; // 存储验证码和过期时间

  // console.log(`验证码发送至 ${email}: ${code}`); // 模拟发送，实际需集成短信服务

  try {
    const mailOptions = {
      from: '"网站名称" <1689785565@qq.com>',
      to: email,
      subject: "邮箱验证码",
      html: `
        <h1>欢迎使用QGFinal团队协作管理平台</h1>
        <p>您的验证码是: <strong>${code}</strong></p>
        <p>此验证码30分钟内有效。</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "验证码已发送至您的邮箱" });
  } catch (error) {
    console.error("发送邮件失败:", error);
    res.status(500).json({ success: false, message: "发送验证码失败" });
  }
});

router.post("/register", async (req, res) => {
  const { firstName, lastName, email, code, password } = req.body;
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    // 验证验证码
    console.log("验证码:", codes);
    console.log("请求的验证码:", code);
    if (!codes[email] || codes[email].code !== code) {
      return res.json({ success: false, message: "验证码无效" });
    }

    // 检查用户是否已存在
    const [existing] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.json({ success: false, message: "该手机号已注册" });
    }

    // 开始事务
    await connection.query("BEGIN");

    // 插入新用户
    const name = `${firstName} ${lastName}`;
    const [userResult] = await connection.query(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
      [email, password, name]
    );
    const newUserId = userResult.insertId;
    console.log("新用户注册，userId:", newUserId);

    // 自动添加 id=1 的用户为好友
    const developerId = 1;
    // 检查 id=1 是否存在
    const [developer] = await connection.query(
      "SELECT id FROM users WHERE id = ?",
      [developerId]
    );
    if (developer.length === 0) {
      throw new Error("开发者用户 (id=1) 不存在");
    }

    // 添加好友关系（user_id -> friend_id 和 friend_id -> user_id）
    await connection.query(
      "INSERT IGNORE INTO friends (user_id, friend_id,status) VALUES (?, ?,'accepted')",
      [newUserId, developerId]
    );

    // 从 id=1 向新用户发送消息
    const welcomeMessage = "我是开发者，有任何bug可以与我联系，qq：1689785565";
    await connection.query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
      [developerId, newUserId, welcomeMessage]
    );

    // 提交事务
    await connection.query("COMMIT");

    // 删除验证码
    delete codes[email];
    res.json({ success: true, message: "注册成功", userId: newUserId });
  } catch (err) {
    console.error("注册错误:", err);
    await connection.query("ROLLBACK");
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    connection.release();
  }
});

// 重置密码
router.post("/reset-password", async (req, res) => {
  const { email, code, password } = req.body;
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    if (!codes[email] || codes[email] !== code) {
      return res.json({ success: false, message: "验证码无效" });
    }

    // 检查用户是否存在
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: "用户不存在" });
    }

    // 更新密码
    await connection.query(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [password, email]
    );

    delete codes[email];
    res.json({ success: true, message: "密码重置成功" });
  } catch (err) {
    console.error("重置密码错误:", err);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    connection.release();
  }
});

module.exports = router;
