const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");

const codes = {};

async function getDb() {
  return await dbPromise;
}

// 登录
router.post("/login", async (req, res) => {
  const { phoneNum, password } = req.body;
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(
      "SELECT id, email FROM users WHERE email = ? AND password_hash = ?",
      [phoneNum, password]
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

// 发送验证码（模拟）
router.post("/send-code", (req, res) => {
  const { phone } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 随机6位验证码
  codes[phone] = code;
  console.log(`验证码发送至 ${phone}: ${code}`); // 模拟发送，实际需集成短信服务
  res.json({ success: true, message: "验证码已发送" });
});

// 注册
router.post("/register", async (req, res) => {
  const { firstName, lastName, phone, code, password } = req.body;
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    if (!codes[phone] || codes[phone] !== code) {
      return res.json({ success: false, message: "验证码无效" });
    }

    // 检查用户是否已存在
    const [existing] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [phone]
    );
    if (existing.length > 0) {
      return res.json({ success: false, message: "该手机号已注册" });
    }

    // 插入新用户
    const name = `${firstName} ${lastName}`;
    await connection.query(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
      [phone, password, name] // 实际应用中应对密码进行哈希处理
    );

    delete codes[phone];
    res.json({ success: true, message: "注册成功" });
  } catch (err) {
    console.error("注册错误:", err);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    connection.release();
  }
});

// 重置密码
router.post("/reset-password", async (req, res) => {
  const { phone, code, password } = req.body;
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    if (!codes[phone] || codes[phone] !== code) {
      return res.json({ success: false, message: "验证码无效" });
    }

    // 检查用户是否存在
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [phone]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: "用户不存在" });
    }

    // 更新密码
    await connection.query(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [password, phone] // 实际应用中应对密码进行哈希处理
    );

    delete codes[phone];
    res.json({ success: true, message: "密码重置成功" });
  } catch (err) {
    console.error("重置密码错误:", err);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    connection.release();
  }
});

module.exports = router;
