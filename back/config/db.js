const mysql = require("mysql2/promise");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "undefined");
console.log("DB_NAME:", process.env.DB_NAME);

// 创建不指定数据库的初始连接
const createInitialConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
};

// 创建包含数据库的连接池
const createDatabaseConnection = async () => {
  return await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
  });
};

// 创建所有表的 SQL 语句
const createTables = async (pool) => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar_url VARCHAR(255) DEFAULT '../img/头像.jpg',
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id INT,
        user_id INT,
        role ENUM('member', 'admin') DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('wait', 'doing', 'over') DEFAULT 'wait',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        assigned_to INT,
        group_id INT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        due_date DATE,
        progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES\`groups\`(id) ,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('developing', 'ready_to_merge', 'merged') DEFAULT 'developing',
        content TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS merge_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT,
        task_id INT,
        requested_by INT,
        reviewed_by INT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        conflict TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT,
        branch_id INT,
        operation_type ENUM('create', 'update', 'delete', 'merge') NOT NULL,
        user_id INT,
        description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT,
        depends_on_task_id INT,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT,
        receiver_id INT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
       CREATE TABLE IF NOT EXISTS friends (
        user_id INT,
        friend_id INT,
        status ENUM('pending', 'accepted') DEFAULT 'accepted',
        PRIMARY KEY (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (friend_id) REFERENCES users(id)
      );
    `);

    console.log("所有表已成功创建或已存在");
  } finally {
    connection.release();
  }
};

// 初始化数据库和表
const initializeDatabase = async () => {
  let initialConnection;
  let pool;

  try {
    // 创建初始连接
    initialConnection = await createInitialConnection();

    // 创建数据库
    await initialConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} 
       CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci`
    );

    await initialConnection.end();

    // 创建连接池
    pool = await createDatabaseConnection();

    // 创建所有表
    await createTables(pool);

    console.log(`成功连接到数据库: ${process.env.DB_NAME}`);
    return pool;
  } catch (err) {
    console.error("数据库初始化失败:", err);
    if (initialConnection) await initialConnection.end();
    if (pool) await pool.end();
    throw err;
  }
};

module.exports = initializeDatabase();
