const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");

const codes = {};

async function getDb() {
  return await dbPromise;
}

// 获取用户可访问的分支
router.get("/branches", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  const projectId = parseInt(req.query.projectId, 10);

  if (!userId || !projectId) {
    return res
      .status(400)
      .json({ success: false, error: "缺少用户ID或项目ID" });
  }

  try {
    const db = await getDb();
    const [user] = await db.query(
      "SELECT role FROM qgfinal.project_members WHERE user_id = ? AND project_id = ? ",
      [userId, projectId]
    );
    if (!user.length) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    let branches;
    if (user[0].role === "creator") {
      // 管理员可以访问项目内的所有分支
      [branches] = await db.query(
        "SELECT id, name, is_main FROM branches WHERE project_id = ?",
        [projectId]
      );
    } else {
      // 普通用户只能访问自己创建的分支或所在项目的默认分支
      [branches] = await db.query(
        `
        SELECT DISTINCT b.id, b.name, b.is_main
        FROM branches b
        WHERE b.project_id = ?
        AND (
          -- 自己创建的分支
          b.created_by = ?
          -- 默认分支
          OR b.is_main = 1
          -- 通过 pull requests 参与的分支
          OR b.id IN (
            SELECT pr.source_branch_id
            FROM pull_requests pr
            JOIN pull_request_members prm ON pr.id = prm.pull_request_id
            WHERE pr.project_id = ? AND prm.user_id = ?
          )
          OR b.id IN (
            SELECT pr.target_branch_id
            FROM pull_requests pr
            JOIN pull_request_members prm ON pr.pull_request_id = prm.pull_request_id
            WHERE pr.project_id = ? AND prm.user_id = ?
          )
        )
        `,
        [projectId, userId, projectId, userId, projectId, userId]
      );
    }

    res.json({ success: true, branches });
  } catch (error) {
    console.error("获取分支失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取文件树
router.get("/files", async (req, res) => {
  const branchId = parseInt(req.query.branchId, 10);
  const projectId = parseInt(req.query.projectId, 10);

  if (!branchId || !projectId) {
    return res
      .status(400)
      .json({ success: false, error: "缺少分支ID或项目ID" });
  }

  try {
    const db = await getDb();
    const [files] = await db.query(
      "SELECT id, name, type, parent_id, content FROM files WHERE project_id = ? AND branch_id = ?",
      [projectId, branchId]
    );

    console.log("获取文件树:", files);

    // 构建文件树
    const buildTree = (files, parentId = null) => {
      return files
        .filter((file) => file.parent_id === parentId)
        .map((file) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          content: file.content || "",
          children:
            file.type === "folder" ? buildTree(files, file.id) : undefined,
        }));
    };

    const fileTree = buildTree(files);
    res.json({ success: true, files: fileTree });
  } catch (error) {
    console.error("获取文件树失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 添加文件或文件夹
router.post("/add", async (req, res) => {
  const { projectId, branchId, parentId, name, type } = req.body;

  if (!projectId || !branchId || !name || !type) {
    return res.status(400).json({ success: false, error: "缺少必要参数" });
  }

  try {
    const db = await getDb();
    const [result] = await db.query(
      "INSERT INTO files (project_id, branch_id, name, type, parent_id) VALUES (?, ?, ?, ?, ?)",
      [projectId, branchId, name, type, parentId || null]
    );

    res.json({ success: true, fileId: result.insertId });
  } catch (error) {
    console.error("添加文件/文件夹失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 删除文件或文件夹
router.delete("/delete/:fileId", async (req, res) => {
  const fileId = parseInt(req.params.fileId, 10);

  if (!fileId) {
    return res.status(400).json({ success: false, error: "缺少文件ID" });
  }

  try {
    const db = await getDb();
    // await db.query("DELETE FROM files WHERE id = ?", [fileId]);
    // 递归删除函数(解决不能删除包含子文件/文件夹的文件夹)
    const deleteRecursive = async (id) => {
      // 查找所有子文件/子文件夹
      const [children] = await db.query(
        "SELECT id FROM files WHERE parent_id = ?",
        [id]
      );

      // 递归删除子文件/子文件夹
      for (const child of children) {
        await deleteRecursive(child.id);
      }

      // 删除当前文件/文件夹
      await db.query("DELETE FROM files WHERE id = ?", [id]);
    };

    await deleteRecursive(fileId);
    res.json({ success: true });
  } catch (error) {
    console.error("删除文件/文件夹失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 保存文件内容
router.post("/save", async (req, res) => {
  const { fileId, content } = req.body;

  if (!fileId || content === undefined) {
    return res.status(400).json({ success: false, error: "缺少必要参数" });
  }

  try {
    const db = await getDb();
    await db.query("UPDATE files SET content = ? WHERE id = ?", [
      content,
      fileId,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error("保存文件失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 提交（上传）当前分支，创建版本快照
router.post("/commit", async (req, res) => {
  const { projectId, branchId, userId, description } = req.body;

  if (!projectId || !branchId || !userId || !description) {
    return res.status(400).json({ success: false, error: "缺少必要参数" });
  }

  try {
    const db = await getDb();

    // 获取当前分支的所有文件
    const [files] = await db.query(
      "SELECT id, name, type, parent_id, content FROM files WHERE project_id = ? AND branch_id = ?",
      [projectId, branchId]
    );

    // 创建新版本
    const [versionCount] = await db.query(
      "SELECT COUNT(*) as count FROM versions WHERE project_id = ? AND branch_id = ?",
      [projectId, branchId]
    );
    const versionNumber = `v${versionCount[0].count + 1}`;
    const [versionResult] = await db.query(
      "INSERT INTO versions (project_id, branch_id, version_number, description, created_by) VALUES (?, ?, ?, ?, ?)",
      [projectId, branchId, versionNumber, description, userId]
    );
    const versionId = versionResult.insertId;

    // 记录历史
    await db.query(
      "INSERT INTO history (task_id, branch_id, version_id, operation_type, user_id, description) VALUES (?, ?, ?, 'update', ?, ?)",
      [null, branchId, versionId, userId, description]
    );

    // 创建版本文件快照
    const fileMap = new Map(); // 存储旧文件ID到新文件ID的映射
    for (const file of files) {
      console.log("file:", file);
      const [vfResult] = await db.query(
        "INSERT INTO version_files (version_id, file_id, name, type, parent_id, content) VALUES (?, ?, ?, ?, ?, ?)",
        [
          versionId,
          file.id,
          file.name,
          file.type,
          file.parent_id ? fileMap.get(file.parent_id) : null,
          file.content,
        ]
      );
      fileMap.set(file.id, vfResult.insertId);
    }

    res.json({ success: true, versionId, versionNumber });
  } catch (error) {
    console.error("提交失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取提交记录
router.get("/commits", async (req, res) => {
  const branchId = parseInt(req.query.branchId, 10);
  const projectId = parseInt(req.query.projectId, 10);

  if (!branchId || !projectId) {
    return res
      .status(400)
      .json({ success: false, error: "缺少分支ID或项目ID" });
  }

  try {
    const db = await getDb();
    const [commits] = await db.query(
      "SELECT id, version_number, description, created_at FROM versions WHERE project_id = ? AND branch_id = ? ORDER BY created_at DESC",
      [projectId, branchId]
    );

    res.json({ success: true, commits });
  } catch (error) {
    console.error("获取提交记录失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 拉取历史版本
router.get("/version/:versionId", async (req, res) => {
  const versionId = parseInt(req.params.versionId, 10);
  const branchId = parseInt(req.query.branchId, 10);
  const projectId = parseInt(req.query.projectId, 10);

  if (!versionId || !branchId || !projectId) {
    return res.status(400).json({ success: false, error: "缺少必要参数" });
  }

  let connection;
  try {
    const db = await getDb();
    connection = await db.getConnection();

    // 开始事务
    await connection.beginTransaction();

    // 获取版本文件
    const [versionFiles] = await connection.query(
      "SELECT id, name, type, parent_id, content FROM version_files WHERE version_id = ?",
      [versionId]
    );

    // 暂时禁用外键检查
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    // 删除当前分支的所有文件
    await connection.query(
      "DELETE FROM files WHERE project_id = ? AND branch_id = ?",
      [projectId, branchId]
    );

    // 重新启用外键检查
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    // 插入版本文件到当前分支
    const fileMap = new Map();
    const restoreFiles = async (files, parentId = null) => {
      for (const file of files) {
        const [result] = await connection.query(
          "INSERT INTO files (project_id, branch_id, name, type, parent_id, content) VALUES (?, ?, ?, ?, ?, ?)",
          [projectId, branchId, file.name, file.type, parentId, file.content]
        );
        fileMap.set(file.id, result.insertId);
        if (file.children) {
          await restoreFiles(file.children, result.insertId);
        }
      }
    };

    // 构建文件树(用于恢复到数据库)
    const buildTreeForRestore = (files, parentId = null) => {
      return files
        .filter((file) => file.parent_id === parentId)
        .map((file) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          content: file.content || "",
          children:
            file.type === "folder"
              ? buildTreeForRestore(files, file.id)
              : undefined,
        }));
    };

    const fileTreeForRestore = buildTreeForRestore(versionFiles);
    await restoreFiles(fileTreeForRestore);

    // 提交事务
    await connection.commit();

    // 获取新插入的文件，以便返回正确的文件ID
    const [newFiles] = await db.query(
      "SELECT id, name, type, parent_id, content FROM files WHERE project_id = ? AND branch_id = ?",
      [projectId, branchId]
    );

    // 构建新的文件树(用于返回给前端)
    const buildTreeForResponse = (files, parentId = null) => {
      return files
        .filter((file) => file.parent_id === parentId)
        .map((file) => ({
          id: file.id, // 这里使用的是最新插入的文件ID
          name: file.name,
          type: file.type,
          content: file.content || "",
          children:
            file.type === "folder"
              ? buildTreeForResponse(files, file.id)
              : undefined,
        }));
    };

    const fileTreeForResponse = buildTreeForResponse(newFiles);
    res.json({ success: true, files: fileTreeForResponse });
  } catch (error) {
    console.error("拉取历史版本失败:", error);

    // 如果出错，回滚事务
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("回滚事务失败:", rollbackError);
      }
    }

    res.status(500).json({ success: false, error: "服务器错误" });
  } finally {
    // 释放连接
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
