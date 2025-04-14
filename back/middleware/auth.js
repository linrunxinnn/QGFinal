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
    return res.status(401).json({ message: "未提供令牌" });
  }

  jwt.verify(token, getSecretKey(), (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({ message: "令牌已过期" });
      }
      return res.status(403).json({ message: "无效的令牌" });
    }
    req.user = user;
    next();
  });
}

function generateToken(user) {
  return jwt.sign({ id: user.id }, getSecretKey(), { expiresIn: "1h" });
}

module.exports = { authenticateToken, generateToken };
