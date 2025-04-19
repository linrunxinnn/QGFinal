const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");

const codes = {};

async function getDb() {
  return await dbPromise;
}

const checkAdminRole = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.projectId;
  const userId = req.user.id;

  try {
    const db = await getDb();
    const [members] = await db.query(
      `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, userId]
    );
    if (members.length === 0 || members[0].role !== "creator") {
      return res
        .status(403)
        .json({ success: false, error: "仅管理员可以执行此操作" });
    }
    next();
  } catch (error) {
    console.error("检查管理员角色失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
};
// 中间件：验证项目成员权限
async function checkProjectMembership(req, res, next) {
  const userId = req.user.id;
  const projectId = req.params.projectId || req.body.projectId;

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

// 获取用户在项目中的角色
router.get(
  "/members/:projectId/role",
  checkProjectMembership,
  async (req, res) => {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    try {
      const db = await getDb();
      const [member] = await db.query(
        `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
        [projectId, userId]
      );

      if (member.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "用户不是项目成员" });
      }

      res.json({ success: true, role: member[0].role });
    } catch (error) {
      console.error("获取用户角色失败:", error);
      res.status(500).json({ success: false, error: "服务器错误" });
    }
  }
);

// 获取小组列表
router.get("/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const db = await getDb();
    const [groups] = await db.query(
      `SELECT id, name FROM \`groups\` WHERE project_id = ?`,
      [projectId]
    );
    res.json({ success: true, groups });
  } catch (error) {
    console.error("获取小组失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取小组列表
router.get("/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const db = await getDb();
    const [groups] = await db.query(
      `SELECT id, name FROM \`groups\` WHERE project_id = ?`,
      [projectId]
    );
    res.json({ success: true, groups });
  } catch (error) {
    console.error("获取小组失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取项目任务
router.get("/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;
  const userId = req.user.id;

  try {
    const db = await getDb();
    const [member] = await db.query(
      `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, userId]
    );
    const isAdmin = member.length > 0 && member[0].role === "creator";

    let query;
    let params;

    if (isAdmin) {
      // 管理员查看所有任务
      query = `
        SELECT
          t.id, t.title, t.description, t.status, t.priority, t.due_date,
          t.assigned_to, u.name AS assigned_to_name, t.created_at
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.group_id IN (
          SELECT id FROM \`groups\` WHERE project_id = ?
        )
        ORDER BY t.created_at DESC
      `;
      params = [projectId];
    } else {
      // 普通组员只查看分配给自己的任务
      query = `
        SELECT
          t.id, t.title, t.description, t.status, t.priority, t.due_date,
          t.assigned_to, u.name AS assigned_to_name, t.created_at
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.group_id IN (
          SELECT id FROM \`groups\` WHERE project_id = ?
        ) AND t.assigned_to = ?
        ORDER BY t.created_at DESC
      `;
      params = [projectId, userId];
    }

    const [tasks] = await db.query(query, params);
    res.json({ success: true, tasks });
  } catch (error) {
    console.error("获取任务失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 添加任务
router.post(
  "/create",
  checkProjectMembership,
  checkAdminRole,
  async (req, res) => {
    const {
      projectId,
      title,
      description,
      status = "wait",
      priority = "medium",
      assigned_to,
      due_date,
      group_id,
    } = req.body;
    const created_by = req.user.id;

    if (!title || !group_id) {
      return res
        .status(400)
        .json({ success: false, error: "任务名称和小组ID是必填的" });
    }

    try {
      const db = await getDb();
      const connection = await db.getConnection();
      await connection.beginTransaction();

      // 验证小组是否属于项目
      const [group] = await connection.query(
        `SELECT id FROM \`groups\` WHERE id = ? AND project_id = ?`,
        [group_id, projectId]
      );
      if (group.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: "小组不存在" });
      }

      // 验证负责人是否为项目成员
      if (assigned_to) {
        const [member] = await connection.query(
          `SELECT user_id FROM project_members WHERE project_id = ? AND user_id = ?`,
          [projectId, assigned_to]
        );
        if (member.length === 0) {
          await connection.rollback();
          return res
            .status(400)
            .json({ success: false, error: "负责人不是项目成员" });
        }
      }

      // 插入任务
      const [result] = await connection.query(
        `
      INSERT INTO tasks (
        title, description, status, priority, assigned_to, group_id, created_by, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          title,
          description || null,
          status,
          priority,
          assigned_to || null,
          group_id,
          created_by,
          due_date || null,
        ]
      );

      await connection.commit();
      res.json({ success: true, taskId: result.insertId });
    } catch (error) {
      await connection.rollback();
      console.error("添加任务失败:", error);
      res.status(500).json({ success: false, error: "服务器错误" });
    } finally {
      connection.release();
    }
  }
);

// 更新任务状态
router.put("/update/:taskId", checkProjectMembership, async (req, res) => {
  const taskId = req.params.taskId;
  const { status } = req.body;
  const userId = req.user.id;

  if (!status || !["wait", "doing", "over"].includes(status)) {
    return res.status(400).json({ success: false, error: "无效的状态" });
  }

  try {
    const db = await getDb();
    const connection = await db.getConnection();
    await connection.beginTransaction();

    // 验证任务存在且用户有权限（管理员或任务负责人）
    const [task] = await connection.query(
      `
      SELECT t.assigned_to, pm.role
      FROM tasks t
      JOIN \`groups\` g ON t.group_id = g.id
      JOIN project_members pm ON pm.project_id = g.project_id AND pm.user_id = ?
      WHERE t.id = ?
      `,
      [userId, taskId]
    );

    if (task.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "任务不存在" });
    }

    const isAdmin = task[0].role === "creator";
    const isAssigned = task[0].assigned_to === userId;
    if (!isAdmin && !isAssigned) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: "无权更新此任务" });
    }

    // 更新状态
    await connection.query(
      `UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, taskId]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error("更新任务状态失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  } finally {
    connection.release();
  }
});

// 删除任务
router.delete(
  "/delete/:taskId",
  checkProjectMembership,
  checkAdminRole,
  async (req, res) => {
    const taskId = req.params.taskId;

    try {
      const db = await getDb();
      const connection = await db.getConnection();
      await connection.beginTransaction();

      // 验证任务存在
      const [task] = await connection.query(
        `SELECT id FROM tasks WHERE id = ?`,
        [taskId]
      );
      if (task.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: "任务不存在" });
      }

      // 删除任务
      await connection.query(`DELETE FROM tasks WHERE id = ?`, [taskId]);

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      console.error("删除任务失败:", error);
      res.status(500).json({ success: false, error: "服务器错误" });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
