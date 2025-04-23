const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");
const { generateProjectReport } = require("../routes/projectReportGenerator");

const codes = {};

async function getDb() {
  return await dbPromise;
}

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

// 创建项目
router.post("/create", async (req, res) => {
  const {
    title,
    description,
    tags,
    admins = [],
    members = [],
    status,
  } = req.body;
  const creatorId = req.user.id; // 从认证令牌获取当前用户ID
  console.log("req.user:", req.user);
  console.log("Creator ID:", creatorId);

  if (!creatorId) {
    return res
      .status(401)
      .json({ success: false, error: "无法获取创建者ID，请重新登录" });
  }
  if (!title || !tags?.length) {
    return res
      .status(400)
      .json({ success: false, error: "标题和至少一个标签是必填的" });
  }
  if (!tags.every((tag) => tag.id && tag.name)) {
    return res.status(400).json({ success: false, error: "标签格式无效" });
  }

  let db;
  try {
    db = await getDb();

    // 开始事务
    await db.query("BEGIN");

    // 创建项目
    const [projectResult] = await db.query(
      "INSERT INTO projects (name, description, status) VALUES (?, ?, ?)",
      [title, description, status || "wait"]
    );
    const projectId = projectResult.insertId;

    // 添加标签
    for (const tag of tags) {
      await db.query(
        "INSERT IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)",
        [tag.id, tag.name, tag.color || "#000000"]
      );
      await db.query(
        "INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)",
        [projectId, tag.id]
      );
    }

    const uniqueAdmins = [...new Set([creatorId, ...admins])];
    const uniqueMembers = [...new Set(members)];

    // 添加管理员
    for (const adminId of uniqueAdmins) {
      await db.query(
        "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
        [projectId, adminId, adminId === creatorId ? "creator" : "member"]
      );
    }

    // 添加普通成员
    for (const memberId of uniqueMembers) {
      if (!uniqueAdmins.includes(memberId)) {
        await db.query(
          "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
          [projectId, memberId, "member"]
        );
      }
    }

    // 创建 main 分支
    const [branchResult] = await db.query(
      "INSERT INTO branches (project_id, name, creator_id, created_at,is_main) VALUES (?, ?, ?, NOW(),1)",
      [projectId, "main", creatorId]
    );
    const mainBranchId = branchResult.insertId;
    console.log("创建 main 分支，branchId:", mainBranchId);

    // 在 main 分支下创建根目录
    await db.query(
      "INSERT INTO files (project_id, branch_id, name, type, parent_id, content) VALUES (?, ?, ?, ?, ?, ?)",
      [projectId, mainBranchId, "根目录", "folder", null, null]
    );

    // 创建默认群组
    const groupName = `${title} 讨论组`;
    const [groupResult] = await db.query(
      "INSERT INTO `groups` (name, project_id, created_by, created_at) VALUES (?, ?, ?, NOW())",
      [groupName, projectId, creatorId]
    );
    const groupId = groupResult.insertId;
    console.log("创建群组，groupId:", groupId);

    // 将所有项目成员添加到群组
    const allMembers = [...new Set([...uniqueAdmins, ...uniqueMembers])]; // 合并所有成员并去重
    for (const memberId of allMembers) {
      const role = memberId === creatorId ? "admin" : "member";
      await db.query(
        "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())",
        [groupId, memberId, role]
      );
    }

    // 提交事务
    await db.query("COMMIT");

    res.status(201).json({ success: true, projectId });
  } catch (error) {
    console.error("Error creating project:", error);
    if (db) {
      await db.query("ROLLBACK");
    }
    res.status(500).json({ success: false, error: "创建项目失败" });
  }
});

function buildFileTree(files) {
  const tree = [];
  const fileMap = {};

  files.forEach((file) => {
    file.children = [];
    fileMap[file.id] = file;
  });

  files.forEach((file) => {
    if (file.parent_id === null) {
      tree.push(file);
    } else if (fileMap[file.parent_id]) {
      fileMap[file.parent_id].children.push(file);
    }
  });

  return tree;
}

// 获取项目详情
router.get("/init/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);

  try {
    const db = await getDb();

    // 获取项目基本信息
    const [projects] = await db.query(
      "SELECT id, name, description, status, progress FROM projects WHERE id = ?",
      [projectId]
    );
    if (projects.length === 0) {
      return res.status(404).json({ success: false, error: "项目不存在" });
    }
    let project = projects[0];

    // 查询任务表，计算进度
    const [tasks] = await db.query(
      "SELECT status FROM tasks WHERE project_id = ?",
      [projectId]
    );

    let progress = 0;
    let completedTasks = 0;
    let totalTasks = 0;
    if (tasks.length > 0) {
      totalTasks = tasks.length;
      completedTasks = tasks.filter((task) => task.status === "over").length;
      progress = Math.round((completedTasks / totalTasks) * 100); // 计算百分比并四舍五入
    }
    // console.log(
    //   `项目 ${projectId} 进度计算: 已完成 ${completedTasks}/${totalTasks}, 进度 ${progress}%`
    // );

    // 更新项目的 progress（可选：如果需要持久化到数据库）
    await db.query("UPDATE projects SET progress = ? WHERE id = ?", [
      progress,
      projectId,
    ]);

    // 更新 project 对象
    project.progress = progress;

    // 获取项目标签
    const [tags] = await db.query(
      `
      SELECT t.id, t.name, t.color
      FROM tags t
      JOIN project_tags pt ON pt.tag_id = t.id
      WHERE pt.project_id = ?
      `,
      [projectId]
    );

    // 获取项目成员
    const [members] = await db.query(
      `
      SELECT 
        pm.user_id AS id, 
        u.name, 
        u.avatar_url, 
        pm.role
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      `,
      [projectId]
    );

    // 获取分支信息
    const [branches] = await db.query(
      `
      SELECT 
        b.id, 
        b.name, 
        b.created_by AS creator_id, 
        u.name AS creator_name, 
        u.avatar_url AS creator_avatar, 
        b.created_at, 
        b.updated_at AS last_commit_time, 
        b.status,
        b.is_main
      FROM branches b
      LEFT JOIN users u ON u.id = b.created_by
      WHERE b.project_id = ?
      ORDER BY b.is_main DESC, b.created_at
      `,
      [projectId]
    );

    // 获取每个分支的顶层文件
    const [files] = await db.query(
      `SELECT id, branch_id, name, type, parent_id, content, created_at, updated_at
       FROM files
       WHERE project_id = ?`,
      [projectId]
    );

    const filesByBranch = {};
    branches.forEach((branch) => {
      const branchFiles = files.filter((f) => f.branch_id === branch.id);
      filesByBranch[branch.id] = buildFileTree(branchFiles);
    });

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress,
        tags,
        members: {
          admins: members.filter((m) => m.role === "creator"),
          regular: members.filter((m) => m.role === "member"),
        },
        branches,
        filesByBranch: filesByBranch || {},
      },
    });
  } catch (err) {
    console.error("获取项目详情失败:", err);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取项目分支
router.get("/branches/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const db = await getDb();

    const [branches] = await db.query(
      `
      SELECT 
        b.id, 
        b.name, 
        b.created_by AS creator_id, 
        u.name AS creator_name, 
        u.avatar_url AS creator_avatar, 
        b.created_at, 
        b.updated_at AS last_commit_time, 
        b.status,
        b.is_main
      FROM branches b
      LEFT JOIN users u ON u.id = b.created_by
      WHERE b.project_id = ?
      ORDER BY b.is_main DESC, b.created_at
      `,
      [projectId]
    );

    res.json({ success: true, branches });
  } catch (error) {
    console.error("获取分支数据失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取项目成员
router.get("/members/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const db = await getDb();

    const [members] = await db.query(
      `
      SELECT 
        pm.user_id AS id, 
        u.name, 
        u.avatar_url, 
        pm.role
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      `,
      [projectId]
    );

    res.json({ success: true, members });
  } catch (error) {
    console.error("获取成员数据失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 获取拉取请求
router.get("/pulls/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const db = await getDb();

    // 获取拉取请求
    const [pulls] = await db.query(
      `SELECT pr.id, pr.title, pr.description, pr.source_branch_id, pr.target_branch_id,
              pr.creator_id, pr.status, pr.deadline, pr.created_at, pr.updated_at,
              u.name AS creator_name, u.avatar_url AS creator_avatar,
              sb.name AS source_branch_name, tb.name AS target_branch_name
       FROM pull_requests pr
       JOIN users u ON pr.creator_id = u.id
       JOIN branches sb ON pr.source_branch_id = sb.id
       JOIN branches tb ON pr.target_branch_id = tb.id
       WHERE pr.project_id = ?`,
      [projectId]
    );

    if (pulls.length === 0) {
      return res.json({ success: true, pullRequests: [] });
    }

    // 获取拉取请求的标签
    const pullIds = pulls.map((p) => p.id);
    const [pullTags] = await db.query(
      `SELECT prt.pull_request_id, t.id, t.name, t.color
       FROM pull_request_tags prt
       JOIN tags t ON prt.tag_id = t.id
       WHERE prt.pull_request_id IN (?)`,
      [pullIds]
    );

    // 获取拉取请求的负责人
    const [pullMembers] = await db.query(
      `SELECT prm.pull_request_id, u.id, u.name, u.avatar_url
       FROM pull_request_members prm
       JOIN users u ON prm.user_id = u.id
       WHERE prm.pull_request_id IN (?)`,
      [pullIds]
    );

    // 组织数据
    const pullRequests = pulls.map((pull) => ({
      id: pull.id,
      author_name: pull.creator_name,
      title: pull.title,
      description: pull.description,
      source_branch_id: pull.source_branch_id,
      target_branch_id: pull.target_branch_id,
      creator_id: pull.creator_id,
      creator_name: pull.creator_name,
      creator_avatar: pull.creator_avatar,
      status: pull.status,
      deadline: pull.deadline,
      created_at: pull.created_at,
      updated_at: pull.updated_at,
      source_branch: pull.source_branch_name,
      target_branch: pull.target_branch,
      tags: pullTags
        .filter((pt) => pt.pull_request_id === pull.id)
        .map((t) => ({ id: t.id, name: t.name, color: t.color })),
      members: pullMembers.filter((pm) => pm.pull_request_id === pull.id),
    }));

    res.json({ success: true, pullRequests });
  } catch (error) {
    console.error("获取拉取请求失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 创建拉取请求
router.post("/pulls/create", checkProjectMembership, async (req, res) => {
  const {
    projectId,
    sourceBranchId,
    targetBranchId,
    title,
    description,
    status,
    deadline,
    tags,
    members,
  } = req.body;
  const userId = req.user.id;

  if (!sourceBranchId || !targetBranchId || !title || !description) {
    return res
      .status(400)
      .json({ success: false, error: "源分支、目标分支、标题和描述是必填的" });
  }

  try {
    const db = await getDb();
    await db.query("START TRANSACTION");

    // 创建拉取请求
    const [result] = await db.query(
      `INSERT INTO pull_requests (project_id, source_branch_id, target_branch_id, creator_id, title, description, status, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        sourceBranchId,
        targetBranchId,
        userId,
        title,
        description,
        status || "wait",
        deadline || null,
      ]
    );
    const pullRequestId = result.insertId;

    // 插入标签
    if (tags && tags.length > 0) {
      const tagValues = tags.map((tagId) => [pullRequestId, tagId]);
      await db.query(
        "INSERT INTO pull_request_tags (pull_request_id, tag_id) VALUES ?",
        [tagValues]
      );
    }

    // 插入负责人
    if (members && members.length > 0) {
      const memberValues = members.map((memberId) => [pullRequestId, memberId]);
      await db.query(
        "INSERT INTO pull_request_members (pull_request_id, user_id) VALUES ?",
        [memberValues]
      );
    }

    await db.query("COMMIT");
    res.json({ success: true, pullRequestId });
  } catch (error) {
    console.error("创建拉取请求失败:", error);
    await db.query("ROLLBACK");
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

router.get("/tags/:projectId", checkProjectMembership, async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const db = await getDb();

    // 获取项目标签
    const [tags] = await db.query(
      `
      SELECT t.id, t.name, t.color
      FROM tags t
      `
    );

    res.json({ success: true, tags });
  } catch (error) {
    console.error("获取标签数据失败:", error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

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

// 生成项目进度报告
router.post(
  "/generate-report/:projectId",
  checkProjectMembership,
  async (req, res) => {
    const projectId = parseInt(req.params.projectId, 10);

    try {
      const db = await getDb();

      // 获取项目基本信息
      const [projects] = await db.query(
        "SELECT id, name, description, status, progress, created_at FROM projects WHERE id = ?",
        [projectId]
      );
      if (projects.length === 0) {
        return res.status(404).json({ success: false, error: "项目不存在" });
      }
      const projectInfo = projects[0];

      // 获取任务统计
      const [tasks] = await db.query(
        `SELECT 
           COUNT(*) AS total_tasks,
           SUM(CASE WHEN status = 'wait' THEN 1 ELSE 0 END) AS waiting_tasks,
           SUM(CASE WHEN status = 'doing' THEN 1 ELSE 0 END) AS ongoing_tasks,
           SUM(CASE WHEN status = 'over' THEN 1 ELSE 0 END) AS completed_tasks,
           SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS highPriorityTasks,
           SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS mediumPriorityTasks,
           SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS lowPriorityTasks
         FROM tasks
         WHERE project_id = ?`,
        [projectId]
      );
      const taskStats = tasks[0];

      // 获取分支统计
      const [branches] = await db.query(
        `SELECT 
         COUNT(*) AS total_branches,
         SUM(CASE WHEN status = 'developing' THEN 1 ELSE 0 END) AS developing_branches,
         SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_branches,
         SUM(CASE WHEN status = 'merged' THEN 1 ELSE 0 END) AS merged_branches
       FROM branches
       WHERE project_id = ?`,
        [projectId]
      );
      const branchStats = branches[0];

      // 获取 Pull Request 统计
      const [prs] = await db.query(
        `SELECT 
         COUNT(*) AS total_prs,
         SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) AS waiting_prs,
         SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing_prs,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_prs
       FROM pull_requests
       WHERE project_id = ?`,
        [projectId]
      );
      const pullRequestStats = prs[0];

      // 获取团队成员
      const [teamMembers] = await db.query(
        `SELECT u.name, pm.role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?`,
        [projectId]
      );

      // 获取最近版本
      const [recentVersions] = await db.query(
        `SELECT v.version_number, v.description, v.created_at, u.name AS author
       FROM versions v
       JOIN users u ON v.created_by = u.id
       WHERE v.project_id = ?
       ORDER BY v.created_at DESC
       LIMIT 5`,
        [projectId]
      );

      // 构建项目数据
      const projectData = {
        projectInfo,
        taskStats,
        branchStats,
        pullRequestStats,
        teamMembers,
        recentVersions,
      };

      // 调用 AI 生成报告
      const report = await generateProjectReport(projectData);

      res.json({ success: true, report });
    } catch (error) {
      console.error("生成项目报告失败:", error);
      res
        .status(500)
        .json({ success: false, error: "生成项目报告失败: " + error.message });
    }
  }
);

// 获取当前用户的所有朋友和项目成员（非朋友）
router.get(
  "/users-and-members/:projectId",
  checkProjectMembership,
  async (req, res) => {
    const projectId = parseInt(req.params.projectId, 10);
    const userId = req.user.id; // 当前用户 ID

    try {
      const db = await getDb();

      // 获取当前用户的所有朋友
      const [friends] = await db.query(
        `
      SELECT 
        u.id, 
        u.name, 
        u.avatar_url
      FROM users u
      JOIN friends f ON (f.user_id = ? AND f.friend_id = u.id) OR (f.user_id = u.id AND f.friend_id = ?)
      WHERE u.id != ?
      `,
        [userId, userId, userId]
      );

      // 获取项目成员
      const [projectMembers] = await db.query(
        `
      SELECT 
        u.id, 
        u.name, 
        u.avatar_url
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      `,
        [projectId]
      );

      // 合并朋友和项目成员，去重
      const allUsers = [...friends];
      projectMembers.forEach((member) => {
        if (!allUsers.some((user) => user.id === member.id)) {
          allUsers.push(member);
        }
      });

      res.json({ success: true, users: allUsers });
    } catch (error) {
      console.error("获取用户和成员失败:", error);
      res.status(500).json({ success: false, error: "服务器错误" });
    }
  }
);

// 更新项目信息
router.put(
  "/update-project/:projectId",
  checkProjectMembership,
  async (req, res) => {
    const projectId = parseInt(req.params.projectId, 10);
    const { name, description, status, tags, admins, members } = req.body;

    if (!name || !status) {
      return res
        .status(400)
        .json({ success: false, error: "标题和状态为必填项" });
    }

    try {
      const db = await getDb();

      // 开启事务
      await db.query("START TRANSACTION");

      // 更新项目基本信息
      await db.query(
        "UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?",
        [name, description, status, projectId]
      );

      // 更新标签（先删除旧的，再添加新的）
      await db.query("DELETE FROM project_tags WHERE project_id = ?", [
        projectId,
      ]);
      if (tags && tags.length > 0) {
        const tagValues = tags.map((tagId) => [projectId, tagId]);
        await db.query(
          "INSERT INTO project_tags (project_id, tag_id) VALUES ?",
          [tagValues]
        );
      }

      // 更新成员（先删除旧的，再添加新的）
      await db.query("DELETE FROM project_members WHERE project_id = ?", [
        projectId,
      ]);
      const memberValues = [];
      if (admins && admins.length > 0) {
        admins.forEach((adminId) => {
          memberValues.push([projectId, adminId, "creator"]);
        });
      }
      if (members && members.length > 0) {
        members.forEach((memberId) => {
          memberValues.push([projectId, memberId, "member"]);
        });
      }
      if (memberValues.length > 0) {
        await db.query(
          "INSERT INTO project_members (project_id, user_id, role) VALUES ?",
          [memberValues]
        );
      }

      // 提交事务
      await db.query("COMMIT");

      res.json({ success: true, message: "项目信息更新成功" });
    } catch (error) {
      console.error("更新项目失败:", error);
      await db.query("ROLLBACK");
      res.status(500).json({ success: false, error: "服务器错误" });
    }
  }
);

// 删除项目
// router.delete(
//   "/delete-project/:projectId",
//   checkProjectMembership,
//   async (req, res) => {
//     const projectId = parseInt(req.params.projectId, 10);

//     try {
//       const db = await getDb();

//       // 检查用户是否是项目创建者（只有创建者可以删除）
//       const [membership] = await db.query(
//         "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
//         [projectId, req.user.id]
//       );
//       if (
//         !membership ||
//         membership.length === 0 ||
//         membership[0].role !== "creator"
//       ) {
//         return res
//           .status(403)
//           .json({ success: false, error: "只有项目创建者可以删除项目" });
//       }

//       // 删除项目（外键约束会自动删除相关数据）
//       await db.query("DELETE FROM projects WHERE id = ?", [projectId]);

//       res.json({ success: true, message: "项目删除成功" });
//     } catch (error) {
//       console.error("删除项目失败:", error);
//       res.status(500).json({ success: false, error: "服务器错误" });
//     }
//   }
// );
router.delete(
  "/delete-project/:projectId",
  checkProjectMembership,
  async (req, res) => {
    const projectId = parseInt(req.params.projectId, 10);

    let db; // 在 try 块外部定义 db
    try {
      db = await getDb();

      await db.query("START TRANSACTION");

      // 找到所有与该项目相关的分支
      const [branches] = await db.query(
        "SELECT id FROM branches WHERE project_id = ?",
        [projectId]
      );
      const branchIds = branches.map((branch) => branch.id);

      // 删除 history 表中与这些分支相关的记录
      if (branchIds.length > 0) {
        await db.query("DELETE FROM history WHERE branch_id IN (?)", [
          branchIds,
        ]);
      }

      // 删除 files 表中的记录（递归删除已实现）
      async function deleteFilesRecursively(branchId) {
        const [topFiles] = await db.query(
          "SELECT id FROM files WHERE branch_id = ? AND (parent_id IS NULL OR parent_id = 0)",
          [branchId]
        );

        for (const file of topFiles) {
          await deleteFileAndChildren(file.id);
        }

        await db.query("DELETE FROM files WHERE branch_id = ?", [branchId]);
      }

      async function deleteFileAndChildren(fileId) {
        const [children] = await db.query(
          "SELECT id FROM files WHERE parent_id = ?",
          [fileId]
        );
        for (const child of children) {
          await deleteFileAndChildren(child.id);
        }
        await db.query("DELETE FROM files WHERE id = ?", [fileId]);
      }

      for (const branchId of branchIds) {
        await deleteFilesRecursively(branchId);
      }

      // 删除依赖该项目的所有相关记录
      await db.query("DELETE FROM branches WHERE project_id = ?", [projectId]);
      await db.query("DELETE FROM project_tags WHERE project_id = ?", [
        projectId,
      ]);
      await db.query("DELETE FROM project_members WHERE project_id = ?", [
        projectId,
      ]);

      // 再删除项目
      await db.query("DELETE FROM projects WHERE id = ?", [projectId]);

      await db.query("COMMIT");

      res.json({ success: true, message: "项目删除成功" });
    } catch (error) {
      console.error("删除项目失败:", error);
      if (db) {
        // 确保 db 已定义
        await db.query("ROLLBACK");
      }
      res
        .status(500)
        .json({ success: false, error: "删除项目失败：" + error.message });
    }
  }
);

// 获取分支差异
router.get(
  "/pulls/:pullRequestId/diff",
  checkProjectMembership,
  async (req, res) => {
    const { pullRequestId } = req.params;

    try {
      const db = await getDb();
      const [pullRequest] = await db.query(
        `SELECT source_branch_id, target_branch_id 
       FROM pull_requests 
       WHERE id = ?`,
        [pullRequestId]
      );

      if (!pullRequest.length) {
        return res
          .status(404)
          .json({ success: false, error: "拉取请求不存在" });
      }

      const { source_branch_id, target_branch_id } = pullRequest[0];
      const [sourceBranch] = await db.query(
        "SELECT name FROM branches WHERE id = ?",
        [source_branch_id]
      );
      const [targetBranch] = await db.query(
        "SELECT name FROM branches WHERE id = ?",
        [target_branch_id]
      );

      const sourceBranchName = sourceBranch[0].name;
      const targetBranchName = targetBranch[0].name;

      // 假设你的 Git 仓库路径
      const repoPath = `/path/to/repo`;
      const { stdout: diff } = await execPromise(
        `git diff ${targetBranchName} ${sourceBranchName}`,
        { cwd: repoPath }
      );

      res.json({ success: true, diff });
    } catch (error) {
      console.error("获取分支差异失败:", error);
      res.status(500).json({ success: false, error: "服务器错误" });
    }
  }
);

//更新拉取请求状态
router.patch(
  "/pulls/:pullRequestId/status",
  checkProjectMembership,
  async (req, res) => {
    const { pullRequestId } = req.params;
    const { status } = req.body;

    if (!["approved", "closed"].includes(status)) {
      return res.status(400).json({ success: false, error: "无效的状态" });
    }

    try {
      const db = await getDb();
      await db.query("START TRANSACTION");

      const [pullRequest] = await db.query(
        "SELECT status, source_branch_id, target_branch_id FROM pull_requests WHERE id = ?",
        [pullRequestId]
      );

      if (!pullRequest.length) {
        return res
          .status(404)
          .json({ success: false, error: "拉取请求不存在" });
      }

      if (pullRequest[0].status !== "wait") {
        return res
          .status(400)
          .json({ success: false, error: "拉取请求已处理" });
      }

      await db.query("UPDATE pull_requests SET status = ? WHERE id = ?", [
        status,
        pullRequestId,
      ]);

      if (status === "approved") {
        // 执行合并操作
        const { source_branch_id, target_branch_id } = pullRequest[0];
        const [sourceBranch] = await db.query(
          "SELECT name FROM branches WHERE id = ?",
          [source_branch_id]
        );
        const [targetBranch] = await db.query(
          "SELECT name FROM branches WHERE id = ?",
          [target_branch_id]
        );

        const sourceBranchName = sourceBranch[0].name;
        const targetBranchName = targetBranch[0].name;

        const repoPath = `/path/to/repo`;
        try {
          await execPromise(`git checkout ${targetBranchName}`, {
            cwd: repoPath,
          });
          await execPromise(`git merge ${sourceBranchName}`, { cwd: repoPath });
          await db.query(
            "UPDATE pull_requests SET status = 'merged' WHERE id = ?",
            [pullRequestId]
          );
        } catch (mergeError) {
          await db.query(
            "UPDATE pull_requests SET status = 'conflict' WHERE id = ?",
            [pullRequestId]
          );
          throw new Error("合并冲突，请手动解决");
        }
      }

      await db.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      console.error("更新拉取请求状态失败:", error);
      await db.query("ROLLBACK");
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
module.exports = router;
