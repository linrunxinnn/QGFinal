const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");

// 获取数据库连接
async function getDb() {
  return await dbPromise;
}

// 中间件：验证项目成员权限
async function checkProjectMembership(req, res, next) {
  const userId = req.user.id;
  const projectId = req.params.projectId || req.body.projectId || req.query.id;

  if (!projectId || isNaN(parseInt(projectId, 10))) {
    return res.status(400).json({ success: false, error: "无效的项目ID" });
  }

  try {
    const db = await getDb();
    const [membership] = await db.query(
      "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userId]
    );
    if (!membership || membership.length === 0) {
      return res.status(403).json({ success: false, error: "无权访问该项目" });
    }
    req.membership = membership[0]; // 保存角色信息供后续使用
    next();
  } catch (error) {
    console.error("权限验证失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
}

// 获取项目的小组列表
router.get("/groups/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);

  try {
    const db = await getDb();
    const [groups] = await db.query(
      "SELECT id, name FROM `groups` WHERE project_id = ?",
      [projectId]
    );

    res.json({ success: true, groups });
  } catch (error) {
    console.error("获取小组列表失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取任务列表
router.get("/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const userId = req.user.id;
  const userRole = req.membership.role;

  try {
    const db = await getDb();

    let tasks;
    if (userRole === "creator") {
      // 管理员：获取所有任务
      [tasks] = await db.query(
        `
        SELECT 
          t.id, t.title, t.description, t.status, t.priority, 
          t.due_date, t.assigned_to, t.group_id, t.created_by,
          u.name AS assigned_to_name, u.avatar_url AS assigned_to_avatar,
          g.name AS group_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN \`groups\` g ON t.group_id = g.id
        WHERE t.group_id IN (
          SELECT id FROM \`groups\` WHERE project_id = ?
        )
        `,
        [projectId]
      );
    } else {
      // 普通成员：只获取分配给自己的任务
      [tasks] = await db.query(
        `
        SELECT 
          t.id, t.title, t.description, t.status, t.priority, 
          t.due_date, t.assigned_to, t.group_id, t.created_by,
          u.name AS assigned_to_name, u.avatar_url AS assigned_to_avatar,
          g.name AS group_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN \`groups\` g ON t.group_id = g.id
        WHERE t.group_id IN (
          SELECT id FROM \`groups\` WHERE project_id = ?
        ) AND t.assigned_to = ?
        `,
        [projectId, userId]
      );
    }

    res.json({ success: true, tasks });
  } catch (error) {
    console.error("获取任务列表失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 创建新任务（管理员专用）
router.post("/create", checkProjectMembership, async (req, res) => {
  const {
    projectId,
    title,
    description,
    status,
    groupId,
    assignedTo,
    dueDate,
  } = req.body;
  const creatorId = req.user.id;
  const userRole = req.membership.role;

  if (userRole !== "creator") {
    return res
      .status(403)
      .json({ success: false, error: "只有管理员可以创建任务" });
  }

  if (!title || !groupId || !assignedTo) {
    return res
      .status(400)
      .json({ success: false, error: "任务名称、小组和负责人是必填的" });
  }

  try {
    const db = await getDb();

    // 验证小组是否存在
    const [group] = await db.query(
      "SELECT id FROM `groups` WHERE id = ? AND project_id = ?",
      [groupId, projectId]
    );
    if (group.length === 0) {
      return res.status(400).json({ success: false, error: "小组不存在" });
    }

    // 验证负责人是否是项目成员
    const [member] = await db.query(
      "SELECT user_id FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, assignedTo]
    );
    if (member.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "负责人不是项目成员" });
    }

    // 创建任务
    const [result] = await db.query(
      `
      INSERT INTO tasks (title, description, status, group_id, assigned_to, created_by, due_date,project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?,?)
      `,
      [
        title,
        description || "",
        status || "wait",
        groupId,
        assignedTo,
        creatorId,
        dueDate || null,
        projectId,
      ]
    );

    res.json({ success: true, taskId: result.insertId });
  } catch (error) {
    console.error("创建任务失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 更新任务状态
router.patch("/:taskId/status", checkProjectMembership, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { status, projectId } = req.body;
  const userId = req.user.id;

  if (!status || !["wait", "doing", "over"].includes(status)) {
    return res.status(400).json({ success: false, error: "无效的任务状态" });
  }

  try {
    const db = await getDb();

    // 验证任务是否存在且用户有权限操作
    const [task] = await db.query(
      `
      SELECT t.id, t.assigned_to
      FROM tasks t
      JOIN \`groups\` g ON t.group_id = g.id
      WHERE t.id = ? AND g.project_id = ?
      `,
      [taskId, parseInt(projectId, 10)]
    );
    console.log(task);

    if (task.length === 0) {
      console.log("任务不存在或无权限访问:", taskId);
      return res.status(404).json({ success: false, error: "任务不存在" });
    }

    if (task[0].assigned_to !== userId && req.membership.role !== "creator") {
      return res.status(403).json({ success: false, error: "无权修改此任务" });
    }

    // 更新任务状态
    await db.query(
      "UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, taskId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("更新任务状态失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 删除任务
router.delete(
  "/:projectId/:taskId",
  checkProjectMembership,
  async (req, res) => {
    const projectId = parseInt(req.params.projectId, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user.id;

    try {
      const db = await getDb();

      // 验证任务是否存在且用户有权限操作
      const [task] = await db.query(
        `
      SELECT t.id, t.assigned_to
      FROM tasks t
      JOIN \`groups\` g ON t.group_id = g.id
      WHERE t.id = ? AND g.project_id = ?
      `,
        [taskId, req.params.projectId]
      );

      if (task.length === 0) {
        return res.status(404).json({ success: false, error: "任务不存在" });
      }

      if (task[0].assigned_to !== userId && req.membership.role !== "creator") {
        return res
          .status(403)
          .json({ success: false, error: "无权删除此任务" });
      }

      // 删除任务
      await db.query("DELETE FROM tasks WHERE id = ?", [taskId]);

      res.json({ success: true });
    } catch (error) {
      console.error("删除任务失败:", error);
      res.status(500).json({ success: false, error: "服务器错误" });
    }
  }
);

module.exports = router;
