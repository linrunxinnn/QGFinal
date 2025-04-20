let currentBranchId = null;

// item.js
document.addEventListener("DOMContentLoaded", () => {
  init(); // 初始加载项目页面
  initPullRequests(); // 初始加载拉取请求页面

  // 导航切换
  const navItems = document.querySelectorAll("nav > .nav-list .item");
  const itemBox = document.querySelectorAll(".main > .main-contain > .item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const id = item.dataset.box;
      itemBox.forEach((box) => {
        box.style.display = "none";
        if (box.dataset.box === id) {
          box.style.display =
            id === "program" || id === "main" ? "flex" : "block";
          if (id === "main") {
            init();
          }
          if (id === "pull") {
            initPullRequests();
          }
          if (id === "program") {
            box.style.display = "flex";
            setTimeout(() => {
              initTasks();
            }, 0);
          }
          if (id === "work") {
            box.style.display = "flex";
            // initWorkSpace();
          }
        }
      });
    });
  });
});

// 构建文件树
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

// 递归渲染文件树
function renderFileTree(files, level = 0) {
  return files
    .map(
      (file) => `
          <div class="document-item" data-file-id="${
            file.id
          }" style="margin-left: ${level * 20}px;">
            <div class="message">
              ${file.type === "folder" ? `<span class="toggle">[+]</span>` : ""}
              <span class="icon">${file.type === "folder" ? "📁" : "📄"}</span>
              <div class="name">${file.name}</div>
            </div>
            <div class="last-time">${
              file.updated_at
                ? new Date(file.updated_at).toLocaleString()
                : "无更新"
            }</div>
            ${
              file.children.length
                ? `<div class="children" style="display: none;">${renderFileTree(
                    file.children,
                    level + 1
                  )}</div>`
                : ""
            }
          </div>
        `
    )
    .join("");
}

// 添加展开/折叠事件
function addToggleEvents(container) {
  container.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const children = toggle
        .closest(".document-item")
        .querySelector(".children");
      if (children) {
        const isExpanded = children.style.display === "block";
        children.style.display = isExpanded ? "none" : "block";
        toggle.textContent = isExpanded ? "[+]" : "[-]";
      }
    });
  });
}

// 渲染分支详情
function renderBranchDetails(itemBox, project, branchId) {
  const branch = project.branches.find((b) => b.id === Number(branchId));
  if (!branch) {
    itemBox.querySelector(".left > .branch > .document").innerHTML =
      "<div>分支不存在</div>";
    return;
  }

  const files = project.filesByBranch[branchId] || [];
  const fileTree = buildFileTree(files);

  itemBox.querySelector(".left > .branch > .document").innerHTML = `
        <div class="head">
          <div class="pusher">
            <div class="img-box">
              <img src="${
                branch.creator_avatar || "../img/default-avatar.jpg"
              }" alt="${branch.creator_name}" />
            </div>
            <div class="name">${branch.creator_name}</div>
          </div>
          <div class="document-message">
            <div class="last-time">${
              branch.last_commit_time
                ? new Date(branch.last_commit_time).toLocaleString()
                : "无提交"
            }</div>
          </div>
        </div>
        <div class="document-box">
          ${fileTree.length ? renderFileTree(fileTree) : "<div>暂无文件</div>"}
        </div>
      `;

  // 添加展开/折叠事件
  addToggleEvents(itemBox);

  // 文件点击跳转
  itemBox.querySelectorAll(".document-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("toggle")) return;
      const fileId = item.getAttribute("data-file-id");
      console.log(
        `跳转到工作区，项目ID: ${project.id}, 分支ID: ${branchId}, 文件ID: ${fileId}`
      );
      // window.location.href = `/workspace?projectId=${project.id}&branchId=${branchId}&fileId=${fileId}`;
    });
  });
}

// 初始化渲染
function init() {
  const itemBox = document.querySelector(
    ".main > .main-contain > [data-box='main']"
  );
  if (!itemBox) {
    console.error("未找到项目容器");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const userId = urlParams.get("userId");

  console.log("项目ID:", projectId);
  console.log("用户ID:", userId);

  fetch(`http://localhost:3000/project/init/${projectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error || `HTTP错误: ${response.status}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("项目数据:", data);
      if (!data.success) {
        throw new Error("获取项目数据失败");
      }

      const { project } = data;

      // 渲染项目名称
      itemBox.querySelector(".head > .title").textContent = project.name;

      // 渲染标签
      const tagBox = itemBox.querySelector(
        ".right > .about > .data > .tag-box"
      );
      tagBox.innerHTML = project.tags.length
        ? project.tags
            .map(
              (tag) => `
                  <div class="tag" style="background-color: ${tag.color}">
                    ${tag.name}
                  </div>
                `
            )
            .join("")
        : "<div>暂无标签</div>";

      // 渲染成员
      const managerBox = itemBox.querySelector(
        ".right > .manage > .manager > .manager-box"
      );
      managerBox.innerHTML = project.members.admins.length
        ? project.members.admins
            .map(
              (admin) => `
                  <div class="item">
                    <div class="img-box">
                      <img src="${
                        admin.avatar_url || "../img/default-avatar.jpg"
                      }" alt="${admin.name}" />
                    </div>
                    <div class="name">${admin.name}</div>
                  </div>
                `
            )
            .join("")
        : "<div>暂无管理员</div>";

      const groupBox = itemBox.querySelector(
        ".right > .manage > .group > .group-box"
      );
      groupBox.innerHTML = project.members.regular.length
        ? project.members.regular
            .map(
              (member) => `
                  <div class="item">
                    <div class="img-box">
                      <img src="${
                        member.avatar_url || "../img/default-avatar.jpg"
                      }" alt="${member.name}" />
                    </div>
                    <div class="name">${member.name}</div>
                  </div>
                `
            )
            .join("")
        : "<div>暂无组员</div>";

      // 渲染分支下拉菜单
      const selectIcon = itemBox.querySelector(
        ".left > .branch > .select > .select-icon"
      );
      const branchNameSpan = selectIcon.querySelector(".branch-name");
      const dropdown = itemBox.querySelector(
        ".left > .branch > .select > .drop-down"
      );

      // 初始化默认分支
      const defaultBranch =
        project.branches.find((b) => b.is_main) || project.branches[0];
      if (defaultBranch) {
        currentBranchId = defaultBranch.id;
        branchNameSpan.textContent = defaultBranch.name;
      } else {
        branchNameSpan.textContent = "无分支";
      }

      console.log("分支信息", project.branches);
      // 填充下拉菜单
      const branchList = dropdown.querySelector(".branch-list");
      branchList.innerHTML = `
            ${
              project.branches.length
                ? project.branches
                    .map(
                      (branch) => `
                      <div class="branch-item" data-branch-id="${branch.id}">
                        ${branch.is_main ? "[主分支] " : ""}${branch.name}
                      </div>
                    `
                    )
                    .join("")
                : "<div>暂无分支</div>"
            }
          `;

      // 下拉菜单交互
      selectIcon.addEventListener("click", (e) => {
        dropdown.style.display = "flex";
        e.stopPropagation();
      });
      document.addEventListener("click", () => {
        dropdown.style.display = "none";
      });

      // 分支选择
      dropdown.querySelectorAll(".branch-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const branchId = item.getAttribute("data-branch-id");
          const branch = project.branches.find(
            (b) => b.id === Number(branchId)
          );
          if (branch) {
            currentBranchId = branch.id;
            branchNameSpan.textContent = branch.name;
            renderBranchDetails(itemBox, project, branchId);
            dropdown.style.display = "none";
          }
        });
      });

      // 搜索分支
      const searchInput = dropdown.querySelector("input");
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        dropdown.querySelectorAll(".branch-item").forEach((item) => {
          const branchName = item.textContent.toLowerCase();
          item.style.display = branchName.includes(query) ? "block" : "none";
        });
      });

      // 初始渲染分支详情
      if (defaultBranch) {
        renderBranchDetails(itemBox, project, defaultBranch.id);
      } else {
        itemBox.querySelector(".left > .branch > .document").innerHTML =
          "<div>暂无分支</div>";
      }

      // 渲染统计信息
      itemBox.querySelector(".about > .data > .view > .num").textContent = `${
        project.members.admins.length + project.members.regular.length
      } 人参加`;
      itemBox.querySelector(
        ".about > .data > .branch > .num"
      ).textContent = `${project.branches.length} 个`;
    })
    .catch((error) => {
      console.error("获取项目信息错误:", error);
      itemBox.querySelector(".main-box").innerHTML = `
            <div class="error">加载失败：${error.message}</div>
          `;
    });
}

// 启动初始化
init();

// --------------------------------------------------------------
let pullRequests = []; // 存储拉取请求数据
let branches = []; // 存储分支数据
let users = []; // 存储用户信息
let selectedTags = new Set(); // 存储已选标签
let selectedManagers = new Set(); // 存储已选负责人

// 初始化拉取请求页面
let isNewPullRequestInitialized = false; // 防止重复初始化

function initPullRequests() {
  const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
  if (!pullBox) {
    console.error("未找到拉取请求容器");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  // 获取拉取请求数据
  fetch(`http://localhost:3000/project/pulls/${projectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`获取拉取请求失败: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.success) {
        throw new Error("获取拉取请求数据失败");
      }
      pullRequests = data.pullRequests || [];
      renderPullRequests(pullRequests);
      initFilterOptions(pullRequests);
    })
    .catch((error) => {
      console.error("获取拉取请求错误:", error);
      pullBox.querySelector(".pull-list .list").innerHTML = `
        <div class="error">加载失败：${error.message}</div>
      `;
    });

  // 获取分支数据和成员数据，使用 Promise.all 确保只调用一次 initNewPullRequest
  Promise.all([
    fetch(`http://localhost:3000/project/branches/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`获取分支数据失败: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.success) {
          throw new Error("获取分支数据失败");
        }
        branches = data.branches || [];
      }),
    fetch(`http://localhost:3000/project/members/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`获取成员数据失败: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.success) {
          throw new Error("获取成员数据失败");
        }
        users = data.members || [];
      }),
  ])
    .then(() => {
      if (!isNewPullRequestInitialized) {
        initNewPullRequest();
        initResponsibility();
        isNewPullRequestInitialized = true;
      }
    })
    .catch((error) => {
      console.error("初始化错误:", error);
      pullBox.querySelector(".new-pull-box").innerHTML += `
        <div class="error">初始化失败：${error.message}</div>
      `;
    });
}

// 渲染拉取请求列表
function renderPullRequests(requests) {
  const listBox = document.querySelector('[data-box="pull"] .pull-list .list');
  if (!listBox) {
    console.error("未找到拉取请求列表容器");
    return;
  }
  listBox.innerHTML = requests.length
    ? requests
        .map((request) => {
          // 处理 tags，确保是字符串数组
          const tags = Array.isArray(request.tags)
            ? request.tags.map((tag) =>
                typeof tag === "string" ? tag : tag.name
              )
            : [];
          return `
                <div class="item" data-id="${request.id}">
                  <div class="left">
                    <div class="title">${
                      request.title ||
                      `${request.from_branch} → ${request.to_branch}`
                    }</div>
                    <div class="author">${
                      request.author_name || "未知作者"
                    }</div>
                  </div>
                  <div class="status">
                    <span data-status="${request.status}">${
            request.status === "doing"
              ? "进行中"
              : request.status === "over"
              ? "已完成"
              : "待办"
          }</span>
                    ${tags
                      .map(
                        (tag) =>
                          `<span data-tag="${tag}" style="background-color: ${
                            tag === "doing"
                              ? "#e67700"
                              : tag === "over"
                              ? "#862e9c"
                              : tag === "wait"
                              ? "#74b816"
                              : "#e67700"
                          }; color: #fff">${tag}</span>`
                      )
                      .join("")}
                  </div>
                </div>
              `;
        })
        .join("")
    : "<div>暂无拉取请求</div>";
}

// 初始化筛选下拉框并实时过滤
function initFilterOptions(requests) {
  const authorSelect = document.querySelector("#author");
  const statusSelect = document.querySelector("#status");
  const tagSelect = document.querySelector("#tag");
  const branchSelect = document.querySelector("#branch");

  if (!authorSelect || !statusSelect || !tagSelect || !branchSelect) {
    console.error("筛选下拉框未找到");
    return;
  }

  // 初始化选项
  const authors = [
    ...new Set(requests.map((r) => r.author_name || r.creator_name)),
  ].sort();
  const statuses = [...new Set(requests.map((r) => r.status))].sort();
  // 处理 tags，确保是字符串数组
  const tags = [
    ...new Set(
      [].concat(
        ...requests.map((r) =>
          Array.isArray(r.tags)
            ? r.tags.map((tag) => (typeof tag === "string" ? tag : tag.name))
            : []
        )
      )
    ),
  ].sort();
  const branches = [
    ...new Set([
      ...requests.map((r) => r.from_branch),
      ...requests.map((r) => r.to_branch),
    ]),
  ].sort();

  authorSelect.innerHTML =
    `<option value="">作者</option>` +
    authors.map((a) => `<option value="${a}">${a}</option>`).join("");
  statusSelect.innerHTML =
    `<option value="">状态</option>` +
    statuses
      .map(
        (s) =>
          `<option value="${s}">${
            s === "doing" ? "进行中" : s === "over" ? "已完成" : "待办"
          }</option>`
      )
      .join("");
  tagSelect.innerHTML =
    `<option value="">标签</option>` +
    tags.map((t) => `<option value="${t}">${t}</option>`).join("");
  branchSelect.innerHTML =
    `<option value="">分支</option>` +
    branches.map((b) => `<option value="${b}">${b}</option>`).join("");

  // 实时筛选
  function filterRequests() {
    const filters = {
      author: authorSelect.value,
      status: statusSelect.value,
      tag: tagSelect.value,
      branch: branchSelect.value,
    };
    const filteredRequests = requests.filter((request) => {
      // 处理 tags，确保是字符串数组
      const requestTags = Array.isArray(request.tags)
        ? request.tags.map((tag) => (typeof tag === "string" ? tag : tag.name))
        : [];
      return (
        (!filters.author ||
          (request.author_name || request.creator_name) === filters.author) &&
        (!filters.status || request.status === filters.status) &&
        (!filters.tag || requestTags.includes(filters.tag)) &&
        (!filters.branch ||
          request.from_branch === filters.branch ||
          request.to_branch === filters.branch)
      );
    });
    renderPullRequests(filteredRequests);
  }

  [authorSelect, statusSelect, tagSelect, branchSelect].forEach((select) => {
    select.addEventListener("change", filterRequests);
  });
}

// 初始化新的拉取请求
function initNewPullRequest() {
  const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
  const pullSection = pullBox.querySelector(".pull-box");
  const newPullSection = pullBox.querySelector(".new-pull");
  const newPullBtn = pullSection.querySelector(".head .icon");
  const backBtn = newPullSection.querySelector(".head .icon");

  if (!pullBox || !pullSection || !newPullSection || !newPullBtn || !backBtn) {
    console.error("拉取请求相关元素未找到");
    return;
  }

  // 显示/隐藏新拉取请求页面
  newPullBtn.addEventListener("click", () => {
    pullSection.style.display = "none";
    newPullSection.style.display = "flex";
  });
  backBtn.addEventListener("click", () => {
    pullSection.style.display = "flex";
    newPullSection.style.display = "none";
  });

  // 切换拉取/合并模式
  const actionSelect = newPullSection.querySelector(
    ".new-pull-box > .head #action"
  );
  const pullBoxSection = newPullSection.querySelector(
    ".new-pull-box > .head .pull-box"
  );
  const mergeBoxSection = newPullSection.querySelector(
    ".new-pull-box > .head .merge-box"
  );

  if (!actionSelect || !pullBoxSection || !mergeBoxSection) {
    console.error("拉取/合并模式元素未找到");
    return;
  }

  // 设置初始状态
  pullBoxSection.style.display =
    actionSelect.value === "pull-box" ? "flex" : "none";
  mergeBoxSection.style.display =
    actionSelect.value === "merge-box" ? "flex" : "none";

  actionSelect.addEventListener("change", () => {
    const action = actionSelect.value;
    pullBoxSection.style.display = action === "pull-box" ? "flex" : "none";
    mergeBoxSection.style.display = action === "merge-box" ? "flex" : "none";
  });

  // 初始化 pull-box 分支下拉菜单（仅 from 部分）
  const fromDropdown = pullBoxSection.querySelector(".from .drop-down");
  const fromIcon = pullBoxSection.querySelector(".from .icon");
  const fromSpan = pullBoxSection.querySelector(".from .icon .select-from");

  if (!fromDropdown || !fromIcon || !fromSpan) {
    console.error("pull-box 分支下拉菜单元素未找到");
    return;
  }

  // 填充“根据（从哪里拉取）”下拉菜单
  // console.log("branches:", branches);
  fromDropdown.innerHTML = branches
    .map(
      (branch) => `
        <div class="branch-item" data-branch-id="${
          branch.id
        }" data-branch-name="${branch.name}">
          ${branch.name}${branch.is_main ? " (主分支)" : ""}
        </div>
      `
    )
    .join("");

  // 设置默认值：从当前分支拉取（currentBranchId）
  const defaultFromBranch =
    branches.find((b) => b.id === Number(currentBranchId)) || branches[0];
  if (defaultFromBranch) {
    fromSpan.textContent = defaultFromBranch.name;
    fromSpan.dataset.branchId = defaultFromBranch.id;
  } else {
    fromSpan.textContent = "无分支";
    fromSpan.dataset.branchId = "";
  }

  fromIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    fromDropdown.style.display = "flex";
  });

  fromDropdown.querySelectorAll(".branch-item").forEach((item) => {
    item.addEventListener("click", () => {
      fromSpan.textContent = item.getAttribute("data-branch-name");
      fromSpan.dataset.branchId = item.getAttribute("data-branch-id");
      fromDropdown.style.display = "none";
    });
  });

  document.addEventListener("click", () => {
    fromDropdown.style.display = "none";
  });

  // 初始化 merge-box 的分支下拉菜单（包含 from 和 to）
  const mergeFromDropdown = mergeBoxSection.querySelector(".from .drop-down");
  const mergeToDropdown = mergeBoxSection.querySelector(".to .drop-down");
  const mergeFromIcon = mergeBoxSection.querySelector(".from .icon");
  const mergeToIcon = mergeBoxSection.querySelector(".to .icon");
  const mergeFromSpan = mergeBoxSection.querySelector(".from .select-from");
  const mergeToSpan = mergeBoxSection.querySelector(".to .select-to");

  if (
    mergeFromDropdown &&
    mergeToDropdown &&
    mergeFromIcon &&
    mergeToIcon &&
    mergeFromSpan &&
    mergeToSpan
  ) {
    mergeFromDropdown.innerHTML = branches
      .map(
        (branch) => `
          <div class="branch-item" data-branch-id="${
            branch.id
          }" data-branch-name="${branch.name}">
            ${branch.name}${branch.is_main ? " (主分支)" : ""}
          </div>
        `
      )
      .join("");
    mergeToDropdown.innerHTML = branches
      .map(
        (branch) => `
          <div class="branch-item" data-branch-id="${
            branch.id
          }" data-branch-name="${branch.name}">
            ${branch.name}${branch.is_main ? " (主分支)" : ""}
          </div>
        `
      )
      .join("");

    // merge-box 的默认值
    const defaultMergeFromBranch =
      branches.find((b) => b.id === Number(currentBranchId)) || branches[0];
    const defaultMergeToBranch = branches.find((b) => b.is_main) || branches[0];
    if (defaultMergeFromBranch) {
      mergeFromSpan.textContent = defaultMergeFromBranch.name;
      mergeFromSpan.dataset.branchId = defaultMergeFromBranch.id;
    }
    if (defaultMergeToBranch) {
      mergeToSpan.textContent = defaultMergeToBranch.name;
      mergeToSpan.dataset.branchId = defaultMergeToBranch.id;
    }

    mergeFromIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      mergeFromDropdown.style.display = "flex";
    });
    mergeToIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      mergeToDropdown.style.display = "flex";
    });

    mergeFromDropdown.querySelectorAll(".branch-item").forEach((item) => {
      item.addEventListener("click", () => {
        mergeFromSpan.textContent = item.getAttribute("data-branch-name");
        mergeFromSpan.dataset.branchId = item.getAttribute("data-branch-id");
        mergeFromDropdown.style.display = "none";
      });
    });
    mergeToDropdown.querySelectorAll(".branch-item").forEach((item) => {
      item.addEventListener("click", () => {
        mergeToSpan.textContent = item.getAttribute("data-branch-name");
        mergeToSpan.dataset.branchId = item.getAttribute("data-branch-id");
        mergeToDropdown.style.display = "none";
      });
    });

    document.addEventListener("click", () => {
      mergeFromDropdown.style.display = "none";
      mergeToDropdown.style.display = "none";
    });
  }

  // 标签选择：从数据库获取标签
  const tagList = newPullSection.querySelector(".tag-box .tag-list");
  const inputTag = newPullSection.querySelector(".tag-box .input-tag");
  const availableTags = new Map();

  if (!tagList || !inputTag) {
    console.error("标签选择元素未找到");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  fetch(`http://localhost:3000/project/tags/${projectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`获取标签失败: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.success) {
        throw new Error("获取标签数据失败");
      }

      const tags = data.tags || [];
      tagList.innerHTML = "";
      tags.forEach((tag) => {
        const tagId = String(tag.id);
        const tagElement = document.createElement("span");
        tagElement.setAttribute("data-tag", tagId);
        tagElement.textContent = tag.name;
        tagElement.style.backgroundColor = tag.color || "#e67700";
        tagElement.style.color = "#fff";
        tagElement.style.padding = "5px 10px";
        tagElement.style.borderRadius = "5px";
        tagElement.style.margin = "2px";
        tagList.appendChild(tagElement);
        // 将标签信息存储到 availableTags 中
        availableTags.set(tagId, {
          name: tag.name,
          color: tag.color || "#e67700",
          element: tagElement.cloneNode(true),
        });

        tagElement.addEventListener("click", handleTagAdd);
      });
    })
    .catch((error) => {
      console.error("获取标签错误:", error);
      tagList.innerHTML = `<div class="error">加载标签失败：${error.message}</div>`;
    });

  function handleTagAdd(e) {
    const tag = e.target;
    const tagId = String(tag.getAttribute("data-tag"));
    const tagInfo = availableTags.get(tagId);

    if (!tagInfo) {
      console.error(`未找到标签信息，tagId: ${tagId}`);
      return;
    }

    const newTag = document.createElement("span");
    newTag.setAttribute("data-tag", tagId);
    newTag.className = "tag-item";
    newTag.textContent = tagInfo.name;
    newTag.style.backgroundColor = tagInfo.color;
    newTag.style.borderRadius = "5px";
    newTag.style.padding = "5px 10px";
    newTag.style.color = "#fff";
    newTag.style.margin = "2px";
    inputTag.appendChild(newTag);
    selectedTags.add(tagId);

    tag.remove();
  }

  inputTag.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-item")) {
      const tagId = String(e.target.getAttribute("data-tag"));
      const tagInfo = availableTags.get(tagId);

      if (!tagInfo) {
        console.error(`未找到标签信息，tagId: ${tagId}`);
        return;
      }

      const existingTag = tagList.querySelector(`[data-tag="${tagId}"]`);
      if (!existingTag) {
        // 如果不存在，则添加
        const newTag = tagInfo.element.cloneNode(true);
        newTag.addEventListener("click", handleTagAdd);
        tagList.appendChild(newTag);
      } else {
        console.log(`标签 ${tagId} 已存在于 .tag-list 中，不重复添加`);
      }

      e.target.remove();
      selectedTags.delete(tagId);
    }
  });

  // 提交申请
  const submitBtn = newPullSection.querySelector(".submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const action = actionSelect.value;
      const section = action === "pull-box" ? pullBoxSection : mergeBoxSection;
      const fromSpan = section.querySelector(".from .select-from");
      const toSpan = section.querySelector(".to .select-to"); // 仅在 merge-box 中使用
      const titleInput = newPullSection.querySelector(".title-input");
      const messageInput = newPullSection.querySelector("#message");
      const deadlineInput = newPullSection.querySelector(".deadline .date");

      const fromBranchId = fromSpan.dataset.branchId;
      const toBranchId = toSpan ? toSpan.dataset.branchId : null; // pull-box 不需要 toBranchId
      const title = titleInput ? titleInput.value : "";
      const message = messageInput ? messageInput.value : "";
      const tags = Array.from(selectedTags);
      const managers = Array.from(selectedManagers);
      const deadline = deadlineInput ? deadlineInput.value : "";

      if (!title || !message || !fromBranchId) {
        alert("请填写所有必填字段！");
        return;
      }

      // 提交数据
      const requestBody = {
        projectId,
        title,
        description: message,
        sourceBranchId: fromBranchId,
        status: "wait",
        deadline,
        tags,
        members: managers,
      };

      // 如果是 merge-box，则需要 targetBranchId
      if (action === "merge-box" && toBranchId) {
        requestBody.targetBranchId = toBranchId;
      }

      fetch(`http://localhost:3000/project/pulls/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((errorData) => {
              throw new Error(
                errorData.error || `HTTP错误: ${response.status}`
              );
            });
          }
          return response.json();
        })
        .then((data) => {
          if (!data.success) {
            throw new Error("创建拉取请求失败");
          }
          alert("拉取请求创建成功！");
          // 清空表单并返回列表
          if (titleInput) titleInput.value = "";
          if (messageInput) messageInput.value = "";
          selectedTags.clear();
          inputTag.innerHTML = "";
          tagList.innerHTML = "";
          availableTags.forEach((tagInfo, tagId) => {
            const newTag = tagInfo.element.cloneNode(true);
            newTag.addEventListener("click", handleTagAdd);
            tagList.appendChild(newTag);
          });
          selectedManagers.clear();
          const managerList = newPullSection.querySelector(".manager-list");
          if (managerList) managerList.innerHTML = "";
          pullSection.style.display = "flex";
          newPullSection.style.display = "none";
          initPullRequests();
        })
        .catch((error) => {
          console.error("创建拉取请求错误:", error);
          alert("创建失败：" + error.message);
        });
    });
  }
}

// 初始化负责人选择
function initResponsibility() {
  const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
  if (!pullBox) {
    console.error("未找到拉取请求容器");
    return;
  }
  const responsibilitySection = pullBox.querySelector(
    ".new-pull .responsibility"
  );
  if (!responsibilitySection) {
    console.error("未找到负责人选择容器");
    return;
  }
  const icon = responsibilitySection.querySelector(".head .select .icon");
  const dropdown = responsibilitySection.querySelector(".head .drop-down");
  const managerList = responsibilitySection.querySelector(".manager-list");

  if (!icon || !dropdown || !managerList) {
    console.error("负责人选择元素未找到");
    return;
  }

  managerList.innerHTML = users
    .map(
      (user) => `
        <div class="item" data-user-id="${user.id}">
          <div class="left">
            <div class="img-box">
              <img src="${user.avatar_url || "../img/头像.jpg"}" alt="" />
            </div>
            <div class="name">${user.name}</div>
          </div>
          <input type="checkbox" class="checkbox" ${
            selectedManagers.has(String(user.id)) ? "checked" : ""
          }>
        </div>
      `
    )
    .join("");

  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display =
      dropdown.style.display === "block" ? "none" : "block";
  });

  dropdown.querySelectorAll(".user-item").forEach((item) => {
    const checkbox = item.querySelector(".checkbox");
    const userId = item.getAttribute("data-user-id");

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) {
        selectedManagers.add(userId);
      } else {
        selectedManagers.delete(userId);
      }
      managerList.innerHTML = Array.from(selectedManagers)
        .map((userId) => {
          const user = users.find((u) => u.id === Number(userId));
          return `
            <div class="item">
              <div class="left">
                <div class="img-box">
                  <img src="${user.avatar_url || "../img/头像.jpg"}" alt="" />
                </div>
                <div class="name">${user.name}</div>
              </div>
              <div class="job">产品经理</div>
            </div>
          `;
        })
        .join("");
    });
  });

  document.addEventListener("click", () => {
    dropdown.style.display = "none";
  });
}

initPullRequests();
