const express = require("express");
const router = express.Router();
const dbPromise = require("../config/db");
const { generateToken } = require("../middleware/auth");

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
  console.log("req.user:", req.user); // 调试
  console.log("Creator ID:", creatorId); // 调试

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

  try {
    const db = await getDb();

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

    res.status(201).json({ success: true, projectId });
  } catch (error) {
    console.error("Error creating project:", error);
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
    const project = projects[0];

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
  console.log("POST /project/pulls/create 被调用", req.body);

  const {
    projectId,
    title,
    description,
    sourceBranchId,
    targetBranchId,
    status = "wait",
    deadline,
    tags = [],
    members = [],
  } = req.body;
  const userId = req.user.id;

  if (!title || !sourceBranchId) {
    return res
      .status(400)
      .json({ success: false, error: "标题和源分支是必填的" });
  }

  try {
    const db = await getDb();

    // 检查是否在短时间内已存在相同的拉取请求
    const [existingPulls] = await db.query(
      `SELECT id FROM pull_requests 
       WHERE project_id = ? AND title = ? AND source_branch_id = ? 
       AND creator_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)`,
      [projectId, title, sourceBranchId, userId]
    );

    if (existingPulls.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "请勿重复提交相同的拉取请求" });
    }

    // 验证源分支是否存在
    const [sourceBranch] = await db.query(
      `SELECT id, name FROM branches WHERE id = ? AND project_id = ?`,
      [sourceBranchId, projectId]
    );
    if (sourceBranch.length === 0) {
      return res.status(400).json({ success: false, error: "源分支不存在" });
    }

    // 如果 targetBranchId 未提供，自动选择主分支
    let finalTargetBranchId = targetBranchId;
    if (!finalTargetBranchId) {
      const [mainBranch] = await db.query(
        `SELECT id FROM branches WHERE project_id = ? AND is_main = true LIMIT 1`,
        [projectId]
      );
      if (mainBranch.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "项目没有主分支，无法创建拉取请求" });
      }
      finalTargetBranchId = mainBranch[0].id;
    }

    // 验证目标分支是否存在
    const [targetBranch] = await db.query(
      `SELECT id FROM branches WHERE id = ? AND project_id = ?`,
      [finalTargetBranchId, projectId]
    );
    if (targetBranch.length === 0) {
      return res.status(400).json({ success: false, error: "目标分支不存在" });
    }

    // （可选）动态创建新分支：基于 sourceBranchId 创建一个新分支
    const newBranchName = `${sourceBranch[0].name}-pull-${Date.now()}`; // 例如：feature-branch-pull-1699999999999
    const [newBranchResult] = await db.query(
      `INSERT INTO branches (project_id, name, is_main, creator_id)
       VALUES (?, ?, ?, ?)`,
      [projectId, newBranchName, false, userId]
    );
    const newBranchId = newBranchResult.insertId;

    // 插入拉取请求（使用新分支作为源分支，或者继续使用 sourceBranchId）
    const [result] = await db.query(
      `INSERT INTO pull_requests (project_id, title, description, source_branch_id, target_branch_id, creator_id, status, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        title,
        description,
        sourceBranchId, // 或者使用 newBranchId
        finalTargetBranchId,
        userId,
        status,
        deadline || null,
      ]
    );
    const pullRequestId = result.insertId;

    // 插入拉取请求的标签
    if (tags.length) {
      const tagValues = tags.map((tagId) => [pullRequestId, tagId]);
      await db.query(
        `INSERT INTO pull_request_tags (pull_request_id, tag_id) VALUES ?`,
        [tagValues]
      );
    }

    // 插入负责人
    if (members.length) {
      const memberValues = members.map((memberId) => [pullRequestId, memberId]);
      await db.query(
        `INSERT INTO pull_request_members (pull_request_id, user_id) VALUES ?`,
        [memberValues]
      );
    }

    // 插入 branch_tags：将标签关联到源分支、目标分支和新分支（如果创建了新分支）
    if (tags.length) {
      // 为 sourceBranchId 插入 branch_tags
      const sourceBranchTagValues = tags.map((tagId) => [
        sourceBranchId,
        tagId,
      ]);
      await db.query(
        `INSERT IGNORE INTO branch_tags (branch_id, tag_id) VALUES ?`,
        [sourceBranchTagValues]
      );

      // 为 finalTargetBranchId 插入 branch_tags
      if (finalTargetBranchId) {
        const targetBranchTagValues = tags.map((tagId) => [
          finalTargetBranchId,
          tagId,
        ]);
        await db.query(
          `INSERT IGNORE INTO branch_tags (branch_id, tag_id) VALUES ?`,
          [targetBranchTagValues]
        );
      }

      // 为新分支插入 branch_tags（如果创建了新分支）
      if (newBranchId) {
        const newBranchTagValues = tags.map((tagId) => [newBranchId, tagId]);
        await db.query(
          `INSERT IGNORE INTO branch_tags (branch_id, tag_id) VALUES ?`,
          [newBranchTagValues]
        );
      }
    }

    res.json({ success: true, pullRequestId });
  } catch (error) {
    console.error("创建拉取请求失败:", error);
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

module.exports = router;
