// initPullRequests();
let currentBranchId = null;
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");
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
            initWorkSpace(); // 手动调用工作区初始化
          }
          if (id === "report") {
            box.style.display = "flex";
            // initReport();
          }
          if (id === "set") {
            box.style.display = "flex";
            initProject();
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

// 递归渲染文件树（为避免冲突，重命名为 renderMainFileTree）
function renderMainFileTree(files, level = 0) {
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
                ? `<div class="children" style="display: none;">${renderMainFileTree(
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
          ${
            fileTree.length
              ? renderMainFileTree(fileTree)
              : "<div>暂无文件</div>"
          }
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

// 手动初始化工作区
function initWorkSpace() {
  if (typeof initFileWorkspace === "function") {
    initFileWorkspace(currentBranchId); // 传递当前分支 ID
  } else {
    console.error("initFileWorkspace 未定义，请确保 file.js 已加载");
  }
}

let pullRequests = [];
let branches = [];
let users = [];
let selectedTags = new Set();
let selectedManagers = new Set();

// 初始化拉取请求页面
let isNewPullRequestInitialized = false;

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
function renderPullRequestsPull(requests) {
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

async function fetchBranches(projectId) {
  try {
    const response = await fetch(
      `http://localhost:3000/project/branches/${projectId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`获取分支失败: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("获取分支数据失败");
    }

    return data.branches || [];
  } catch (error) {
    console.error("获取分支错误:", error);
    return [];
  }
}

// 其他 pull request 相关函数保持不变...
function renderPullRequests(requests) {
  const listContainer = document.querySelector(
    ".main-contain > [data-box='manager'] .pull-request-list"
  );
  const listHeader = listContainer.querySelector(".list-header");
  listContainer.innerHTML = "";
  listContainer.appendChild(listHeader);

  // 过滤当前项目的拉取请求
  const projectId = getProjectId();
  const projectRequests = requests.filter(
    (request) => request.project_id == projectId
  );

  if (!projectRequests.length) {
    listContainer.innerHTML += "<div>暂无拉取请求</div>";
    return;
  }

  projectRequests.forEach((request) => {
    const item = document.createElement("div");
    item.className = "pull-request-item";
    item.dataset.prId = request.id;
    item.innerHTML = `
      <div class="pr-number">#${request.id}</div>
      <div>
        <a href="#" class="pr-title">${request.title}</a>
        <div>
          ${request.project_name || "未知项目"}
          ${
            request.source_branch && request.target_branch
              ? `<span class="branch-info">${request.source_branch} → ${request.target_branch}</span>`
              : ""
          }
          ${
            request.tags?.includes("urgent")
              ? '<span class="badge badge-blue">紧急</span>'
              : ""
          }
        </div>
      </div>
      <div><span class="pr-status status-${request.status}">${
      request.status === "wait"
        ? "等待审核"
        : request.status === "approved"
        ? "已批准"
        : request.status === "merged"
        ? "已合并"
        : "已关闭"
    }</span></div>
      <div class="pr-author">${request.creator_name || "未知用户"}</div>
      <div class="pr-date">${
        new Date(request.created_at).toISOString().split("T")[0]
      }</div>
    `;
    listContainer.appendChild(item);
  });
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

  const authors = [
    ...new Set(requests.map((r) => r.author_name || r.creator_name)),
  ].sort();
  const statuses = [...new Set(requests.map((r) => r.status))].sort();
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

  function filterRequests() {
    const filters = {
      author: authorSelect.value,
      status: statusSelect.value,
      tag: tagSelect.value,
      branch: branchSelect.value,
    };
    const filteredRequests = requests.filter((request) => {
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

// 初始化界面切换
function initSectionToggle(pullBox) {
  const pullSection = pullBox.querySelector(".pull-box");
  const newPullSection = pullBox.querySelector(".new-pull");
  const newPullBtn = pullSection.querySelector(".head .icon");
  const backBtn = newPullSection.querySelector(".head .icon");

  if (!pullSection || !newPullSection || !newPullBtn || !backBtn) {
    console.error("拉取请求相关元素未找到");
    return;
  }

  newPullBtn.addEventListener("click", () => {
    pullSection.style.display = "none";
    newPullSection.style.display = "flex";
  });
  backBtn.addEventListener("click", () => {
    pullSection.style.display = "flex";
    newPullSection.style.display = "none";
  });

  return { pullSection, newPullSection };
}

// 初始化分支选择
function initBranchSelection(section, type, branches) {
  const dropdown = section.querySelector(`.${type} .drop-down`);
  const icon = section.querySelector(`.${type} .icon`);
  const span = section.querySelector(`.${type} .select-${type}`);

  if (!dropdown || !icon || !span) {
    console.error(`${type} 分支下拉菜单元素未找到`, { dropdown, icon, span });
    return;
  }

  // 填充下拉菜单
  let dropdownContent = branches
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

  // 如果是目标分支（to），添加“新建空白分支”选项
  if (type === "to") {
    dropdownContent += `
      <div class="branch-item" data-branch-id="new-blank" data-branch-name="新建空白分支">
        新建空白分支
      </div>
    `;
  }

  dropdown.innerHTML = dropdownContent;

  // 设置默认值
  const defaultBranch =
    type === "from"
      ? branches[0]
      : branches.find((b) => b.is_main) || branches[0];

  if (defaultBranch) {
    span.textContent = defaultBranch.name;
    span.dataset.branchId = defaultBranch.id;
  } else {
    span.textContent = "无分支";
    span.dataset.branchId = "";
  }

  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display = "flex";
  });

  dropdown.querySelectorAll(".branch-item").forEach((item) => {
    item.addEventListener("click", () => {
      span.textContent = item.getAttribute("data-branch-name");
      span.dataset.branchId = item.getAttribute("data-branch-id");
      dropdown.style.display = "none";
    });
  });

  document.addEventListener("click", () => {
    dropdown.style.display = "none";
  });

  return span;
}

async function submitPullRequest(
  newPullSection,
  pullSection,
  projectId,
  selectedTags,
  selectedManagers,
  availableTags,
  handleTagAdd
) {
  const section = newPullSection.querySelector(
    ".new-pull-box > .head .merge-box"
  );
  const fromSpan = section.querySelector(".from .select-from");
  const toSpan = section.querySelector(".to .select-to");
  const titleInput = newPullSection.querySelector(".title-input");
  const messageInput = newPullSection.querySelector("#message");
  const deadlineInput = newPullSection.querySelector(".deadline .date");
  const tagList = newPullSection.querySelector(".tag-box .tag-list");
  const inputTag = newPullSection.querySelector(".tag-box .input-tag");
  const submitBtn = newPullSection.querySelector(".submit");

  let sourceBranchId = fromSpan.dataset.branchId;
  let targetBranchId = toSpan.dataset.branchId;
  const title = titleInput ? titleInput.value.trim() : "";
  const description = messageInput ? messageInput.value.trim() : "";
  const tags = Array.from(selectedTags);
  const members = Array.from(selectedManagers);
  const deadline = deadlineInput ? deadlineInput.value : "";

  if (!title) {
    alert("请输入拉取请求标题！");
    return;
  }
  if (!description) {
    alert("请输入拉取请求描述！");
    return;
  }
  if (!sourceBranchId) {
    alert("请选择源分支！");
    return;
  }

  const hasStatusTag = tags.some((tagId) => {
    const tag = availableTags.get(tagId);
    return tag && ["doing", "over", "wait"].includes(tag.name);
  });
  // if (!hasStatusTag) {
  //   alert("请至少选择一个状态标签（进行中、已完成、待办）！");
  //   return;
  // }

  submitBtn.disabled = true;
  submitBtn.textContent = "提交中...";

  let isNewBlankBranch = targetBranchId === "new-blank";
  if (isNewBlankBranch) {
    const sourceBranchName = fromSpan.textContent;
    const defaultBranchName = `copy-from-${sourceBranchName}-${Date.now()}`;
    const newBranchName = prompt("请输入新分支名称：", defaultBranchName);

    if (!newBranchName) {
      alert("新分支名称不能为空！");
      submitBtn.disabled = false;
      submitBtn.textContent = "提交";
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(newBranchName)) {
      alert("分支名称只能包含字母、数字、下划线和连字符！");
      submitBtn.disabled = false;
      submitBtn.textContent = "提交";
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/project/branches/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            baseBranchId: sourceBranchId,
            newBranchName,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "无法创建新分支，请稍后重试！");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("创建新分支失败，请检查输入！");
      }

      targetBranchId = data.branchId;
      toSpan.textContent = newBranchName;
      toSpan.dataset.branchId = targetBranchId;

      branches = await fetchBranches(projectId);
      initBranchSelection(section, "from", branches);
      initBranchSelection(section, "to", branches);

      alert(`已创建新分支：${newBranchName}，并添加了根文件夹`);
    } catch (error) {
      console.error("创建新分支错误:", error);
      alert(`创建新分支失败：${error.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = "提交";
      return;
    }
  }

  if (!targetBranchId) {
    alert("请选择目标分支！");
    submitBtn.disabled = false;
    submitBtn.textContent = "提交";
    return;
  }

  const status = isNewBlankBranch ? "approved" : "wait";

  const requestBody = {
    projectId,
    title,
    description,
    sourceBranchId,
    targetBranchId,
    status,
    deadline,
    tags,
    members,
  };

  try {
    const response = await fetch(`http://localhost:3000/project/pulls/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "提交拉取请求失败，请稍后重试！");
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("创建拉取请求失败，请检查输入！");
    }

    const pullRequestId = data.pullRequestId;

    if (isNewBlankBranch) {
      try {
        const mergeResponse = await fetch(
          `http://localhost:3000/project/pulls/${pullRequestId}/merge`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!mergeResponse.ok) {
          const errorData = await mergeResponse.json();
          throw new Error(
            errorData.error || "自动合并失败，可能是分支冲突或权限不足！"
          );
        }

        const mergeData = await mergeResponse.json();
        if (!mergeData.success) {
          throw new Error("自动合并失败！");
        }

        alert("拉取请求已创建并自动合并！");
      } catch (error) {
        console.error("自动合并错误:", error);
        alert(`自动合并失败：${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = "提交";
        return;
      }
    } else {
      alert("拉取请求创建成功，等待管理员审核！");
    }

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
  } catch (error) {
    console.error("创建拉取请求错误:", error);
    alert(`创建拉取请求失败：${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "提交";
  }
}

// 主函数
async function initNewPullRequest() {
  const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
  if (!pullBox) {
    console.error("拉取请求容器未找到");
    return;
  }

  const { pullSection, newPullSection } = initSectionToggle(pullBox);
  const section = newPullSection.querySelector(
    ".new-pull-box > .head .merge-box"
  );
  section.style.display = "flex"; // 始终显示

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const branches = await fetchBranches(projectId); // 假设 fetchBranches 已定义

  // 移除对 currentBranchId 的依赖，直接通过下拉菜单选择
  const fromSpan = initBranchSelection(section, "from", branches);
  const toSpan = initBranchSelection(section, "to", branches);

  const selectedTags = new Set();
  const selectedManagers = new Set();
  const availableTags = await initTagSelection(
    newPullSection,
    projectId,
    selectedTags
  );

  const submitBtn = newPullSection.querySelector(".submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      submitPullRequest(
        newPullSection,
        pullSection,
        projectId,
        selectedTags,
        selectedManagers,
        availableTags
      );
    });
  }
}

initPullRequests();

// ---------------------------------------------------
//修改项目内容
const projectId = new URLSearchParams(window.location.search).get("id");
selectedTags = [];
let admins = [];
let members = [];
let allUsers = []; // 存储所有用户，用于下拉选择

// 初始化项目信息
async function initProject() {
  try {
    const response = await fetch(
      `http://localhost:3000/project/init/${projectId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("token") || "your-token"
          }`, // 确保 token 正确
        },
      }
    );

    if (!response.ok) {
      throw new Error(`获取项目详情失败，状态码: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      const project = result.project;

      // 填充标题和简介
      document.querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-title input"
      ).value = project.name || "";
      document.querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-message textarea"
      ).value = project.description || "";

      // 填充标签
      selectedTags = project.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      }));
      updateTags();

      // 获取项目成员
      admins = project.members.admins.map((member) => ({
        id: member.id,
        name: member.name,
        avatar_url: member.avatar_url,
      }));
      members = project.members.regular.map((member) => ({
        id: member.id,
        name: member.name,
        avatar_url: member.avatar_url,
      }));

      // 获取当前用户的所有朋友和项目成员
      await fetchUsersAndMembers();
      renderUsers();
    } else {
      alert("获取项目详情失败：" + result.error);
    }
  } catch (error) {
    console.error("初始化项目失败:", error);
    alert("初始化项目失败：" + error.message);
  }
}

function renderPullRequestsForPullPage(requests) {
  const listBox = document.querySelector('[data-box="pull"] .pull-list .list');
  if (!listBox) {
    console.error("未找到拉取请求列表容器");
    return;
  }

  listBox.innerHTML = requests.length
    ? requests
        .map((request) => {
          const tags = Array.isArray(request.tags)
            ? request.tags.map((tag) =>
                typeof tag === "string" ? tag : tag.name
              )
            : [];
          return `
            <div class="item" data-id="${request.id}">
              <div class="left">
                <div class="title">${request.title || "未命名拉取请求"}</div>
                <div class="branch-info">${
                  request.from_branch && request.to_branch
                    ? `${request.from_branch} → ${request.to_branch}`
                    : "未知分支"
                }</div>
                <div class="author">${request.author_name || "未知作者"}</div>
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

// 获取当前用户的所有朋友和项目成员
async function fetchUsersAndMembers() {
  try {
    const response = await fetch(
      `http://localhost:3000/project/users-and-members/${projectId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("token") || "your-token"
          }`, // 确保 token 正确
        },
      }
    );

    if (!response.ok) {
      throw new Error(`获取用户列表失败，状态码: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      allUsers = result.users;
    } else {
      throw new Error("获取用户列表失败：" + result.error);
    }
  } catch (error) {
    console.error("获取用户失败:", error);
    allUsers = [];
  }
}

// 渲染用户列表
function renderUsers() {
  const managerList = document.querySelector(
    ".main .main-contain > [data-box='set'] > .message-box .responsibility .manager-list"
  );
  const groupList = document.querySelector(
    ".main .main-contain > [data-box='set'] > .message-box .responsibility .group-list"
  );

  managerList.innerHTML = "";
  groupList.innerHTML = "";

  allUsers.forEach((user) => {
    const isAdmin = admins.some((admin) => admin.id === user.id);
    const isMember = members.some((member) => member.id === user.id);

    // 管理员列表
    const adminItem = document.createElement("div");
    adminItem.classList.add("item");
    adminItem.innerHTML = `
      <div class="left">
        <div class="img-box">
          <img src="${user.avatar_url || "../img/头像.jpg"}" alt="${
      user.name
    }" />
        </div>
        <div class="name">${user.name}</div>
      </div>
      <input type="checkbox" data-id="${user.id}" data-type="admin" ${
      isAdmin ? "checked" : ""
    } />
    `;
    managerList.appendChild(adminItem);

    // 普通成员列表
    const memberItem = document.createElement("div");
    memberItem.classList.add("item");
    memberItem.innerHTML = `
      <div class="left">
        <div class="img-box">
          <img src="${user.avatar_url || "../img/头像.jpg"}" alt="${
      user.name
    }" />
        </div>
        <div class="name">${user.name}</div>
      </div>
      <input type="checkbox" data-id="${user.id}" data-type="member" ${
      isMember ? "checked" : ""
    } />
    `;
    groupList.appendChild(memberItem);
  });

  // // 添加 checkbox 事件监听
  // document
  //   .querySelectorAll(
  //     ".main .main-contain [data-box='set'] > .manager-list .manager-list input[type='checkbox']"
  //   )
  //   .forEach((checkbox) => {
  //     checkbox.addEventListener("change", handleCheckboxChange);
  //   });
  // document
  //   .querySelectorAll(
  //     ".main .main-contain [data-box='set'] > .manager-list .group-list input[type='checkbox']"
  //   )
  //   .forEach((checkbox) => {
  //     checkbox.addEventListener("change", handleCheckboxChange);
  //   });
  // 移除旧的事件监听器并绑定新的事件监听器
  const adminCheckboxes = document.querySelectorAll(
    ".main .main-contain [data-box='set'] .manager-list input[type='checkbox']"
  );
  const memberCheckboxes = document.querySelectorAll(
    ".main .main-contain [data-box='set'] .group-list input[type='checkbox']"
  );

  adminCheckboxes.forEach((checkbox) => {
    // 移除旧的事件监听器（通过克隆元素并替换）
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    newCheckbox.addEventListener("change", handleCheckboxChange);
  });

  memberCheckboxes.forEach((checkbox) => {
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    newCheckbox.addEventListener("change", handleCheckboxChange);
  });
}

// 处理 checkbox 变化
function handleCheckboxChange(e) {
  const userId = parseInt(e.target.dataset.id, 10);
  const type = e.target.dataset.type;
  const isChecked = e.target.checked;

  // console.log("Before update - admins:", admins, "members:", members);

  if (type === "admin") {
    if (isChecked) {
      // 添加到管理员
      const user = allUsers.find((u) => u.id === userId);
      if (!admins.some((admin) => admin.id === userId)) {
        admins.push({
          id: userId,
          name: user.name,
          avatar_url: user.avatar_url,
        });
      }
      // 从普通成员中移除
      members = members.filter((member) => member.id !== userId);
    } else {
      // 从管理员中移除
      admins = admins.filter((admin) => admin.id !== userId);
    }
  } else if (type === "member") {
    if (isChecked) {
      // 添加到普通成员
      const user = allUsers.find((u) => u.id === userId);
      if (!members.some((member) => member.id === userId)) {
        members.push({
          id: userId,
          name: user.name,
          avatar_url: user.avatar_url,
        });
      }
      // 从管理员中移除
      admins = admins.filter((admin) => admin.id !== userId);
    } else {
      // 从普通成员中移除
      members = members.filter((member) => member.id !== userId);
    }
  }

  // 同步更新 checkbox 状态
  renderUsers();
}

// 更新标签显示
function updateTags() {
  const inputTag = document.querySelector(
    ".main .main-contain [data-box='set'] > .message-box .tag-box .input-tag"
  );
  inputTag.innerHTML = "";
  selectedTags.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.textContent = tag.name;
    tagElement.style.backgroundColor = tag.color;
    tagElement.style.color = "#fff";
    tagElement.style.padding = "5px 10px";
    tagElement.style.borderRadius = "5px";
    tagElement.style.marginRight = "5px";
    tagElement.dataset.id = tag.id;
    tagElement.addEventListener("click", () => {
      selectedTags = selectedTags.filter((t) => t.id !== tag.id);
      updateTags();
    });
    inputTag.appendChild(tagElement);
  });

  // 确保至少有一个状态标签
  const hasStatusTag = selectedTags.some((tag) =>
    ["doing", "over", "wait"].includes(tag.name)
  );
  if (!hasStatusTag) {
    alert("请至少选择一个状态标签（进行中、已完成、待办）");
  }
}

// 更新管理员和成员列表
function updateMembers() {
  const managerList = document.querySelector(
    ".main .main-contain [data-box='set'] > .message-box .responsibility .manager-list"
  );
  const groupList = document.querySelector(
    ".main .main-contain [data-box='set'] > .message-box .responsibility .group-list"
  );

  managerList.innerHTML = "";
  admins.forEach((admin) => {
    const adminElement = document.createElement("span");
    adminElement.textContent = admin.name;
    adminElement.dataset.id = admin.id;
    managerList.appendChild(adminElement);
  });

  groupList.innerHTML = "";
  members.forEach((member) => {
    const memberElement = document.createElement("span");
    memberElement.textContent = member.name;
    memberElement.dataset.id = member.id;
    groupList.appendChild(memberElement);
  });
}

// // 填充下拉菜单
// function populateDropdowns() {
//   const adminDropdown = document.querySelector(".admin-drop-down");
//   const memberDropdown = document.querySelector(".member-drop-down");

//   adminDropdown.innerHTML = "";
//   memberDropdown.innerHTML = "";

//   allUsers.forEach((user) => {
//     // 管理员下拉
//     const adminOption = document.createElement("div");
//     adminOption.textContent = user.name;
//     adminOption.dataset.id = user.id;
//     adminOption.style.padding = "5px";
//     adminOption.style.cursor = "pointer";
//     adminOption.addEventListener("click", () => {
//       if (!admins.some((admin) => admin.id === user.id)) {
//         admins.push({ id: user.id, name: user.name });
//         updateMembers();
//       }
//       adminDropdown.style.display = "none";
//     });
//     adminDropdown.appendChild(adminOption);

//     // 成员下拉
//     const memberOption = document.createElement("div");
//     memberOption.textContent = user.name;
//     memberOption.dataset.id = user.id;
//     memberOption.style.padding = "5px";
//     memberOption.style.cursor = "pointer";
//     memberOption.addEventListener("click", () => {
//       if (
//         !members.some((member) => member.id === user.id) &&
//         !admins.some((admin) => admin.id === user.id)
//       ) {
//         members.push({ id: user.id, name: user.name });
//         updateMembers();
//       }
//       memberDropdown.style.display = "none";
//     });
//     memberDropdown.appendChild(memberOption);
//   });
// }

// 标签选择
document
  .querySelector(
    ".main .main-contain [data-box='set'] > .message-box .tag-box .tag-list"
  )
  .addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName === "SPAN") {
      const tagId = parseInt(target.dataset.id, 10);
      const tagName = target.dataset.tag;
      const tagColor = target.style.backgroundColor;

      // 如果是状态标签（doing, over, wait），移除其他状态标签
      if (["doing", "over", "wait"].includes(tagName)) {
        selectedTags = selectedTags.filter(
          (tag) => !["doing", "over", "wait"].includes(tag.name)
        );
      }

      // 如果标签未被选中，则添加
      if (!selectedTags.some((tag) => tag.id === tagId)) {
        selectedTags.push({ id: tagId, name: tagName, color: tagColor });
      } else {
        selectedTags = selectedTags.filter((tag) => tag.id !== tagId);
      }
      updateTags();
    }
  });

// 确认修改
document
  .querySelector(".main .main-contain [data-box='set'] .head .submit")
  .addEventListener("click", async () => {
    const title = document
      .querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-title input"
      )
      .value.trim();
    const description = document
      .querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-message textarea"
      )
      .value.trim();
    const status = selectedTags.find((tag) =>
      ["doing", "over", "wait"].includes(tag.name)
    )?.name;

    if (!title) {
      alert("请输入项目标题");
      return;
    }
    if (!status) {
      alert("请至少选择一个状态标签（进行中、已完成、待办）");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/project/update-project/${projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("token") || "your-token"
            }`, // 确保 token 正确
          },
          body: JSON.stringify({
            name: title,
            description,
            status,
            tags: selectedTags.map((tag) => tag.id),
            admins: admins.map((admin) => admin.id),
            members: members.map((member) => member.id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`更新项目失败，状态码: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert("项目信息更新成功");
        window.location.reload(); // 刷新页面以显示更新后的数据
      } else {
        alert("更新项目失败：" + result.error);
      }
    } catch (error) {
      console.error("更新项目失败:", error);
      alert("更新项目失败：" + error.message);
    }
  });

// 删除项目弹窗
document
  .querySelector(
    ".main .main-contain [data-box='set'] .message-box > .icon .delete"
  )
  .addEventListener("click", () => {
    const deleteDropdown = document.querySelector(
      ".main .main-contain [data-box='set'] .message-box > .icon .drop-down"
    );
    deleteDropdown.style.display = "flex";
    document.querySelector("body > .overlay").style.display = "block";
  });

document
  .querySelector(
    ".main .main-contain [data-box='set'] .message-box > .icon .drop-down > .icon .no"
  )
  .addEventListener("click", () => {
    const deleteDropdown = document.querySelector(
      ".main .main-contain [data-box='set'] .message-box > .icon .drop-down"
    );
    deleteDropdown.style.display = "none";
    document.querySelector("body > .overlay").style.display = "none";
  });

document
  .querySelector(
    ".main .main-contain [data-box='set'] .message-box > .icon .drop-down > .icon .yes"
  )
  .addEventListener("click", async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/project/delete-project/${projectId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("token") || "your-token"
            }`, // 确保 token 正确
          },
        }
      );

      if (!response.ok) {
        throw new Error(`删除项目失败，状态码: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert("项目删除成功");
        window.location.href = `http://127.0.0.1:5500/font/public/html/index.html?id=${userId}`; // 假设有一个项目列表页面
      } else {
        alert("删除项目失败：" + result.error);
      }
    } catch (error) {
      console.error("删除项目失败:", error);
      alert("删除项目失败：" + error.message);
    }
  });

// -------------------------------
// 管理页面
// let pullRequests = [];
let currentPullRequest = null;
let currentFile = "createTables.js"; // 当前显示的文件

// 初始化管理员页面
async function initManagerPage() {
  await fetchPullRequests();
  renderStats();
  initFilterListeners();
  initPullRequestListeners();
}

// 获取拉取请求数据
// async function fetchPullRequests() {
//   try {
//     const response = await fetch(`http://localhost:3000/project/pulls/all`, {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem("token")}`,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`获取拉取请求失败: ${response.statusText}`);
//     }

//     const data = await response.json();
//     if (!data.success) {
//       throw new Error("获取拉取请求数据失败");
//     }

//     pullRequests = data.pullRequests || [];
//     renderPullRequests(pullRequests);
//   } catch (error) {
//     console.error("获取拉取请求错误:", error);
//     document.querySelector(".pull-request-list").innerHTML += `
//       <div class="error">加载失败：${error.message}</div>
//     `;
//   }
// }
async function fetchPullRequests() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      document.querySelector(".pull-request-list").innerHTML = `
        <div class="error">未登录，请<a href="login.html">登录</a></div>
      `;
      throw new Error("未登录，请先登录");
    }

    const projectId = getProjectId();
    const response = await fetch(
      `http://localhost:3000/project/pulls/all?projectId=${projectId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("获取拉取请求数据失败");
    }

    pullRequests = data.pullRequests || [];
    renderPullRequests(pullRequests);
  } catch (error) {
    console.error("获取拉取请求错误:", error);
    document.querySelector(".pull-request-list").innerHTML += `
      <div class="error">加载失败：${error.message}</div>
    `;
  }
}

function getProjectId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id") || "38"; // 回退到日志中的项目ID
}

// 渲染统计数据
function renderStats() {
  const stats = {
    pending: pullRequests.filter((pr) => pr.status === "wait").length,
    pendingProjects: [
      ...new Set(
        pullRequests
          .filter((pr) => pr.status === "wait")
          .map((pr) => pr.project_id)
      ),
    ].length,
  };

  document.querySelector(
    ".stats-grid .stat-card:nth-child(1) .stat-value"
  ).textContent = stats.pending;
  document.querySelector(
    ".stats-grid .stat-card:nth-child(2) .stat-value"
  ).textContent = stats.pendingProjects;
}

// 渲染拉取请求列表
function renderPullRequests(requests) {
  const listContainer = document.querySelector(
    ".main-contain > [data-box='manager'] .pull-request-list"
  );
  const listHeader = listContainer.querySelector(".list-header");
  listContainer.innerHTML = "";
  listContainer.appendChild(listHeader);

  if (!requests.length) {
    listContainer.innerHTML += "<div>暂无拉取请求</div>";
    return;
  }

  requests.forEach((request) => {
    const item = document.createElement("div");
    item.className = "pull-request-item";
    item.dataset.prId = request.id;
    item.innerHTML = `
      <div class="pr-number">#${request.id}</div>
      <div>
        <a href="#" class="pr-title">${request.title}</a>
        <div>
          ${request.project_name || "未知项目"}
          ${
            request.tags?.includes("urgent")
              ? '<span class="badge badge-blue">紧急</span>'
              : ""
          }
        </div>
      </div>
      <div><span class="pr-status status-${request.status}">${
      request.status === "wait"
        ? "等待审核"
        : request.status === "approved"
        ? "已批准"
        : request.status === "merged"
        ? "已合并"
        : "已关闭"
    }</span></div>
      <div class="pr-author">${request.creator_name || "未知用户"}</div>
      <div class="pr-date">${
        new Date(request.created_at).toISOString().split("T")[0]
      }</div>
    `;
    listContainer.appendChild(item);
  });
}

// 初始化筛选功能
function initFilterListeners() {
  const statusSelect = document.querySelector(
    ".filter-bar select:nth-child(1)"
  );
  const userSelect = document.querySelector(".filter-bar select:nth-child(2)");
  const searchInput = document.querySelector(".filter-bar .search-box");

  function filterPullRequests() {
    const status = statusSelect.value;
    const user = userSelect.value;
    const search = searchInput.value.toLowerCase();

    const filteredRequests = pullRequests.filter((request) => {
      return (
        (status === "all" || request.status === status) &&
        (user === "all" || request.creator_name === user) &&
        (search === "" || request.title.toLowerCase().includes(search))
      );
    });

    renderPullRequests(filteredRequests);
  }

  statusSelect.addEventListener("change", filterPullRequests);
  userSelect.addEventListener("change", filterPullRequests);
  searchInput.addEventListener("input", filterPullRequests);
}

// 初始化拉取请求点击事件
function initPullRequestListeners() {
  document.querySelectorAll(".pull-request-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const prId = item.dataset.prId;
      currentPullRequest = pullRequests.find((pr) => pr.id == prId);
      await loadPullRequestDetails(currentPullRequest);
      document.querySelector(".index-box").style.display = "none";
      document.querySelector(".manager-box").style.display = "block";
    });
  });
}

// 加载拉取请求详情
async function loadPullRequestDetails(pr) {
  // 更新头部信息
  document.querySelector(
    ".pull-request-title"
  ).textContent = `${pr.title} (#${pr.id})`;
  document.querySelector(".pull-request-info").innerHTML = `
    <span>${pr.source_branch} → ${pr.target_branch}</span>
    <span>创建人: ${pr.creator_name}</span>
    <span>创建于: ${new Date(pr.created_at).toISOString().split("T")[0]}</span>
  `;

  // 初始化分支选择器
  const sourceSelect = document.querySelector("#source-branch");
  const targetSelect = document.querySelector("#target-branch");
  sourceSelect.innerHTML = `<option value="${pr.source_branch}">${pr.source_branch}</option>`;
  targetSelect.innerHTML = `<option value="${pr.target_branch}">${pr.target_branch}</option>`;
  sourceSelect.disabled = true;
  targetSelect.disabled = true;

  // 获取文件差异数据（模拟从后端获取）
  const files = await fetchFileChanges(pr.id);
  renderFilesList(files);
  renderDiffContent(files[0]); // 默认显示第一个文件
  renderComments(pr.id);

  // 初始化按钮事件
  initActionButtons(pr);
}

// 获取文件差异（模拟后端接口）
async function fetchFileChanges(prId) {
  // 这里可以替换为实际的 fetch 请求
  return [
    {
      name: "createTables.js",
      added: 219,
      removed: 12,
      diff: [
        {
          line: 1,
          type: "normal",
          content: "const createTables = async (pool) => {",
        },
        {
          line: 2,
          type: "normal",
          content: "const connection = await pool.getConnection();",
        },
        { line: 3, type: "normal", content: "try {" },
        {
          line: 4,
          type: "removed",
          content:
            "await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY)`);",
        },
        { line: 4, type: "added", content: "await connection.query(`" },
        {
          line: 5,
          type: "added",
          content: "CREATE TABLE IF NOT EXISTS users (",
        },
        {
          line: 6,
          type: "added",
          content: "id INT AUTO_INCREMENT PRIMARY KEY,",
        },
        {
          line: 7,
          type: "added",
          content: "email VARCHAR(255) UNIQUE NOT NULL,",
        },
        {
          line: 8,
          type: "added",
          content: "avatar_url VARCHAR(255) DEFAULT '../img/头像.jpg',",
        },
        {
          line: 9,
          type: "added",
          content: "password_hash VARCHAR(255) NOT NULL,",
        },
        {
          line: 10,
          type: "added",
          content: "role ENUM('admin', 'user') DEFAULT 'user',",
        },
        { line: 11, type: "added", content: "name VARCHAR(255)," },
        {
          line: 12,
          type: "added",
          content: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP,",
        },
        {
          line: 13,
          type: "added",
          content:
            "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        },
        { line: 14, type: "added", content: ")" },
        { line: 15, type: "added", content: "`);" },
        { line: 16, type: "normal", content: "" },
        { line: 17, type: "normal", content: "// 其他表创建代码..." },
        { line: 18, type: "normal", content: "} finally {" },
        { line: 19, type: "normal", content: "connection.release();" },
        { line: 20, type: "normal", content: "}" },
        { line: 21, type: "normal", content: "};" },
      ],
    },
    { name: "schema.sql", added: 18, removed: 3, diff: [] },
    { name: "model.js", added: 8, removed: 2, diff: [] },
  ];
}

// 渲染文件列表
function renderFilesList(files) {
  const filesList = document.querySelector(".files-list");
  filesList.innerHTML = `<div class="files-header">已修改文件 (${files.length})</div>`;
  files.forEach((file) => {
    const fileItem = document.createElement("div");
    fileItem.className = `file-item ${
      file.name === currentFile ? "active" : ""
    }`;
    fileItem.dataset.file = file.name;
    fileItem.innerHTML = `
      <div>${file.name}</div>
      <div class="file-changes">
        <span class="file-added">+${file.added}</span>
        <span class="file-removed">-${file.removed}</span>
      </div>
    `;
    fileItem.addEventListener("click", () => {
      currentFile = file.name;
      filesList
        .querySelectorAll(".file-item")
        .forEach((item) => item.classList.remove("active"));
      fileItem.classList.add("active");
      renderDiffContent(file);
    });
    filesList.appendChild(fileItem);
  });
}

// 渲染差异内容
function renderDiffContent(file) {
  const diffHeader = document.querySelector(".diff-header div:first-child");
  const diffContent = document.querySelector(".diff-content");
  diffHeader.textContent = file.name;
  diffContent.innerHTML = file.diff
    .map(
      (line) => `
    <div class="diff-line ${
      line.type === "added"
        ? "diff-added"
        : line.type === "removed"
        ? "diff-removed"
        : ""
    }">
      <div class="line-number">${line.line}</div>
      <div class="line-content">${line.content}</div>
    </div>
  `
    )
    .join("");
}

// 初始化操作按钮（通过/拒绝）
function initActionButtons(pr) {
  const rejectBtn = document.querySelector(".buttons .btn:not(.btn-primary)");
  const mergeBtn = document.querySelector(".buttons .btn.btn-primary");

  rejectBtn.addEventListener("click", async () => {
    if (confirm("确定要拒绝此拉取请求吗？")) {
      await handlePullRequest(pr.id, "closed");
    }
  });

  mergeBtn.addEventListener("click", async () => {
    if (confirm("确定要通过并合并此拉取请求吗？")) {
      await handlePullRequest(pr.id, "merged");
    }
  });

  // 禁用按钮如果状态不是 "wait"
  if (pr.status !== "wait") {
    rejectBtn.disabled = true;
    mergeBtn.disabled = true;
  }
}

// 处理拉取请求（通过/拒绝）
async function handlePullRequest(prId, status) {
  try {
    const response = await fetch(
      `http://localhost:3000/project/pulls/${prId}/${
        status === "merged" ? "merge" : "close"
      }`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId: currentPullRequest.project_id }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "操作失败");
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("操作失败");
    }

    alert(status === "merged" ? "拉取请求已合并！" : "拉取请求已关闭！");
    document.querySelector(".index-box").style.display = "block";
    document.querySelector(".manager-box").style.display = "none";
    await fetchPullRequests();
    renderStats();
  } catch (error) {
    console.error("处理拉取请求错误:", error);
    alert(`操作失败：${error.message}`);
  }
}

// 返回列表
document
  .querySelector(".pull-request-header")
  .addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") {
      document.querySelector(".index-box").style.display = "block";
      document.querySelector(".manager-box").style.display = "none";
    }
  });

// 初始化页面
document.addEventListener("DOMContentLoaded", initManagerPage);
