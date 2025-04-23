const jwt = require("jsonwebtoken");

//确保dotenv在最早被加载出来
function getSecretKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured in environment variables");
  }
  return process.env.JWT_SECRET;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // 提取 Bearer 后的 token

  if (!token) {
    // return res.status(401).json({ message: "未提供令牌" });
    return sendAuthRedirect(res);
  }

  jwt.verify(token, getSecretKey(), (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        // return res.status(403).json({ message: "令牌已过期" });
        return sendAuthRedirect(res);
      }
      // return res.status(403).json({ message: "无效的令牌" });
      return sendAuthRedirect(res);
    }
    req.user = user;
    next();
  });
}

// 发送认证重定向
function sendAuthRedirect(res, redirectUrl = "/login") {
  // 设置302临时重定向
  res.redirect(
    302,
    `${redirectUrl}?from=${encodeURIComponent(req.originalUrl || "/")}`
  );
}

function generateToken(user) {
  return jwt.sign({ id: user.id }, getSecretKey(), { expiresIn: "6h" });
}

module.exports = { authenticateToken, generateToken };
