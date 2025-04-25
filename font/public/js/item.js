// item.js

// 全局变量
let currentBranchId = null;
let pullRequestsForPullPage = []; // 用于拉取页面
let pullRequestsForManagerPage = []; // 用于管理页面
let branches = [];
let users = [];
let selectedTags = new Set();
let selectedManagers = new Set();
let isNewPullRequestInitialized = false;

// 获取项目ID和用户ID
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("id") || "38";
const userId = urlParams.get("userId") || "1";

// DOM 加载完成时初始化
document.addEventListener("DOMContentLoaded", () => {
  init(); // 初始加载项目页面
  initPullRequests(); // 初始加载拉取请求页面
  initManagerPage(); // 初始加载管理页面

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
          if (id === "manager") {
            initManagerPage();
          }
          if (id === "program") {
            box.style.display = "flex";
            setTimeout(() => {
              initTasks();
            }, 0);
          }
          if (id === "work") {
            box.style.display = "flex";
            initWorkSpace();
          }
          if (id === "report") {
            box.style.display = "flex";
            // initReport();
          }
          if (id === "set") {
            box.style.display = "flex";
            initProject();
          }
          if (id === "manager") {
            box.style.display = "flex";
            document.querySelector(
              ".main-contain > [data-box='manager'] .index-box"
            ).style.display = "block";
            document.querySelector(
              ".main-contain > [data-box='manager'] .manager-box"
            ).style.display = "none";
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

  addToggleEvents(itemBox);

  itemBox.querySelectorAll(".document-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("toggle")) return;
      const fileId = item.getAttribute("data-file-id");
      //跳转到工作区
      document
        .querySelectorAll("nav > .nav-list .item")
        .forEach((i) => i.classList.remove("active"));
      document
        .querySelector(".nav-list > .item[data-box='work']")
        .classList.add("active");
      document
        .querySelectorAll(".main > .main-contain > .item")
        .forEach((box) => {
          box.style.display = "none";
          if (box.dataset.box === "work") {
            box.style.display = "flex";
            initWorkSpace(fileId, branchId);
          }
        });
    });
  });
}

// 初始化项目页面
function init() {
  const itemBox = document.querySelector(
    ".main > .main-contain > [data-box='main']"
  );
  if (!itemBox) {
    console.error("未找到项目容器");
    return;
  }

  // console.log("项目ID:", projectId);
  // console.log("用户ID:", userId);

  fetch(`${API_BASE_URL}/project/init/${projectId}`, {
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

      itemBox.querySelector(".head > .title").textContent = project.name;

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

      const selectIcon = itemBox.querySelector(
        ".left > .branch > .select > .select-icon"
      );
      const branchNameSpan = selectIcon.querySelector(".branch-name");
      const dropdown = itemBox.querySelector(
        ".left > .branch > .select > .drop-down"
      );

      const defaultBranch =
        project.branches.find((b) => b.is_main) || project.branches[0];
      if (defaultBranch) {
        currentBranchId = defaultBranch.id;
        branchNameSpan.textContent = defaultBranch.name;
      } else {
        branchNameSpan.textContent = "无分支";
      }

      console.log("分支信息", project.branches);
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

      selectIcon.addEventListener("click", (e) => {
        dropdown.style.display = "flex";
        e.stopPropagation();
      });
      document.addEventListener("click", () => {
        dropdown.style.display = "none";
      });

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

      const searchInput = dropdown.querySelector("input");
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        dropdown.querySelectorAll(".branch-item").forEach((item) => {
          const branchName = item.textContent.toLowerCase();
          item.style.display = branchName.includes(query) ? "block" : "none";
        });
      });

      if (defaultBranch) {
        renderBranchDetails(itemBox, project, defaultBranch.id);
      } else {
        itemBox.querySelector(".left > .branch > .document").innerHTML =
          "<div>暂无分支</div>";
      }

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
    initFileWorkspace(currentBranchId);
  } else {
    console.error("initFileWorkspace 未定义，请确保 file.js 已加载");
  }
}

// 获取分支数据
async function fetchBranches() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/project/branches/${projectId}`,
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

// 初始化拉取请求页面
function initPullRequests() {
  const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
  if (!pullBox) {
    console.error("未找到拉取请求容器");
    return;
  }

  // 获取拉取请求数据
  fetch(`${API_BASE_URL}/project/pulls/${projectId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(
            errorData.error || `获取拉取请求失败: ${response.statusText}`
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      if (!data.success) {
        throw new Error("获取拉取请求数据失败");
      }
      pullRequestsForPullPage = data.pullRequests || [];
      renderPullRequestsForPullPage(pullRequestsForPullPage);
      initFilterOptionsForPullPage(pullRequestsForPullPage);
    })
    .catch((error) => {
      console.error("获取拉取请求错误:", error);
      pullBox.querySelector(".pull-list .list").innerHTML = `
        <div class="error">加载失败：${error.message}</div>
      `;
    });

  // 获取分支和成员数据
  Promise.all([
    fetch(`${API_BASE_URL}/project/branches/${projectId}`, {
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
    fetch(`${API_BASE_URL}/project/members/${projectId}`, {
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

// 渲染拉取请求列表（拉取页面专用）
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
          const fromBranch =
            request.from_branch || request.source_branch || "未知";
          const toBranch = request.to_branch || request.target_branch || "未知";
          return `
            <div class="item" data-id="${request.id}">
              <div class="left">
                <div class="title">${request.title || "未命名拉取请求"}</div>
                <div class="branch-info">${fromBranch} → ${toBranch}</div>
                <div class="author">${
                  request.author_name || request.creator_name || "未知作者"
                }</div>
              </div>
              <div class="status">
                <span data-status="${request.status}">${
            request.status === "doing"
              ? "进行中"
              : request.status === "over"
              ? "已完成"
              : request.status === "wait"
              ? "待办"
              : "未知状态"
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

// 初始化筛选下拉框（拉取页面专用）
function initFilterOptionsForPullPage(requests) {
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
  ]
    .filter(Boolean)
    .sort();
  const statuses = [...new Set(requests.map((r) => r.status))]
    .filter(Boolean)
    .sort();
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
  ]
    .filter(Boolean)
    .sort();
  const branches = [
    ...new Set([
      ...requests.map((r) => r.from_branch || r.source_branch),
      ...requests.map((r) => r.to_branch || r.target_branch),
    ]),
  ]
    .filter(Boolean)
    .sort();

  authorSelect.innerHTML =
    `<option value="">作者</option>` +
    authors.map((a) => `<option value="${a}">${a}</option>`).join("");
  statusSelect.innerHTML =
    `<option value="">状态</option>` +
    statuses
      .map(
        (s) =>
          `<option value="${s}">${
            s === "doing"
              ? "进行中"
              : s === "over"
              ? "已完成"
              : s === "wait"
              ? "待办"
              : s
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
      const fromBranch = request.from_branch || request.source_branch || "";
      const toBranch = request.to_branch || request.target_branch || "";
      return (
        (!filters.author ||
          (request.author_name || request.creator_name) === filters.author) &&
        (!filters.status || request.status === filters.status) &&
        (!filters.tag || requestTags.includes(filters.tag)) &&
        (!filters.branch ||
          fromBranch === filters.branch ||
          toBranch === filters.branch)
      );
    });
    renderPullRequestsForPullPage(filteredRequests);
  }

  [authorSelect, statusSelect, tagSelect, branchSelect].forEach((select) => {
    select.addEventListener("change", filterRequests);
  });
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

  managerList.querySelectorAll(".item").forEach((item) => {
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

  if (type === "to") {
    dropdownContent += `
      <div class="branch-item" data-branch-id="new-blank" data-branch-name="新建空白分支">
        新建空白分支
      </div>
    `;
  }

  dropdown.innerHTML = dropdownContent;

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

// 初始化标签选择
async function initTagSelection(newPullSection, projectId, selectedTags) {
  const tagList = newPullSection.querySelector(".tag-box .tag-list");
  if (!tagList) {
    console.error("未找到标签列表容器");
    return new Map();
  }

  const availableTags = new Map();
  const tags = [
    { id: "1", name: "doing", color: "#e67700" },
    { id: "2", name: "over", color: "#862e9c" },
    { id: "3", name: "wait", color: "#74b816" },
    { id: "4", name: "urgent", color: "#ff0000" },
  ];

  tags.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.className = "tag";
    tagElement.dataset.id = tag.id;
    tagElement.dataset.tag = tag.name;
    tagElement.style.backgroundColor = tag.color;
    tagElement.style.color = "#fff";
    tagElement.style.padding = "5px 10px";
    tagElement.style.borderRadius = "5px";
    tagElement.style.marginRight = "5px";
    tagElement.style.cursor = "pointer";
    tagElement.textContent = tag.name;

    availableTags.set(tag.id, { ...tag, element: tagElement });
    tagList.appendChild(tagElement);
  });

  const handleTagAdd = (e) => {
    const target = e.target;
    if (target.tagName === "SPAN") {
      const tagId = target.dataset.id;
      if (selectedTags.has(tagId)) {
        selectedTags.delete(tagId);
        target.style.opacity = "1";
      } else {
        const tagName = target.dataset.tag;
        if (["doing", "over", "wait"].includes(tagName)) {
          selectedTags.forEach((id) => {
            const tag = availableTags.get(id);
            if (tag && ["doing", "over", "wait"].includes(tag.name)) {
              selectedTags.delete(id);
              const tagElement = tagList.querySelector(`span[data-id="${id}"]`);
              if (tagElement) tagElement.style.opacity = "1";
            }
          });
        }
        selectedTags.add(tagId);
        target.style.opacity = "0.5";
      }

      const inputTag = newPullSection.querySelector(".tag-box .input-tag");
      inputTag.innerHTML = "";
      selectedTags.forEach((tagId) => {
        const tag = availableTags.get(tagId);
        if (tag) {
          const tagElement = document.createElement("span");
          tagElement.textContent = tag.name;
          tagElement.style.backgroundColor = tag.color;
          tagElement.style.color = "#fff";
          tagElement.style.padding = "5px 10px";
          tagElement.style.borderRadius = "5px";
          tagElement.style.marginRight = "5px";
          inputTag.appendChild(tagElement);
        }
      });
    }
  };

  tagList.querySelectorAll(".tag").forEach((tagElement) => {
    tagElement.addEventListener("click", handleTagAdd);
  });

  return availableTags;
}

// 提交拉取请求
async function submitPullRequest(
  newPullSection,
  pullSection,
  projectId,
  selectedTags,
  selectedManagers,
  availableTags
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
  if (!hasStatusTag) {
    alert("请至少选择一个状态标签（进行中、已完成、待办）！");
    return;
  }

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
      const response = await fetch(`${API_BASE_URL}/project/branches/create`, {
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
      });

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

      branches = await fetchBranches();
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
    const response = await fetch(`${API_BASE_URL}/project/pulls/create`, {
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
          `${API_BASE_URL}/project/pulls/${pullRequestId}/merge`,
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
      newTag.addEventListener("click", (e) => {
        const tagId = newTag.dataset.id;
        if (selectedTags.has(tagId)) {
          selectedTags.delete(tagId);
          newTag.style.opacity = "1";
        } else {
          const tagName = newTag.dataset.tag;
          if (["doing", "over", "wait"].includes(tagName)) {
            selectedTags.forEach((id) => {
              const tag = availableTags.get(id);
              if (tag && ["doing", "over", "wait"].includes(tag.name)) {
                selectedTags.delete(id);
                const tagElement = tagList.querySelector(
                  `span[data-id="${id}"]`
                );
                if (tagElement) tagElement.style.opacity = "1";
              }
            });
          }
          selectedTags.add(tagId);
          newTag.style.opacity = "0.5";
        }

        const inputTag = newPullSection.querySelector(".tag-box .input-tag");
        inputTag.innerHTML = "";
        selectedTags.forEach((tagId) => {
          const tag = availableTags.get(tagId);
          if (tag) {
            const tagElement = document.createElement("span");
            tagElement.textContent = tag.name;
            tagElement.style.backgroundColor = tag.color;
            tagElement.style.color = "#fff";
            tagElement.style.padding = "5px 10px";
            tagElement.style.borderRadius = "5px";
            tagElement.style.marginRight = "5px";
            inputTag.appendChild(tagElement);
          }
        });
      });
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

// 初始化创建拉取请求
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
  section.style.display = "flex";

  const branches = await fetchBranches();

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

// 初始化管理页面
let currentPullRequest = null;
let currentFile = "createTables.js";

async function initManagerPage() {
  const managerBox = document.querySelector(
    '.main-contain > [data-box="manager"]'
  );
  if (!managerBox) {
    console.error("未找到管理页面容器");
    return;
  }

  await fetchPullRequestsForManagerPage();
  renderStatsForManagerPage();
  initFilterListenersForManagerPage();
  initPullRequestListenersForManagerPage();
}

// 获取拉取请求数据（管理页面专用）
async function fetchPullRequestsForManagerPage() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      document.querySelector(".pull-request-list").innerHTML = `
        <div class="error">未登录，请<a href="login.html">登录</a></div>
      `;
      throw new Error("未登录，请先登录");
    }

    const response = await fetch(`${API_BASE_URL}/project/pulls/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `获取拉取请求失败: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data);
    if (!data.success) {
      throw new Error("获取拉取请求数据失败");
    }

    pullRequestsForManagerPage = data.pullRequests || [];
    renderPullRequestsForManagerPage(pullRequestsForManagerPage);
  } catch (error) {
    console.error("获取拉取请求错误:", error);
    document.querySelector(".pull-request-list").innerHTML += `
      <div class="error">加载失败：${error.message}</div>
    `;
  }
}

// 渲染统计数据（管理页面专用）
function renderStatsForManagerPage() {
  const stats = {
    pending: pullRequestsForManagerPage.filter((pr) => pr.status === "wait")
      .length,
    pendingProjects: [
      ...new Set(
        pullRequestsForManagerPage
          .filter((pr) => pr.status === "wait")
          .map((pr) => pr.project_id)
      ),
    ].length,
  };

  const statCard1 = document.querySelector(
    ".stats-grid .stat-card:nth-child(1) .stat-value"
  );
  const statCard2 = document.querySelector(
    ".stats-grid .stat-card:nth-child(2) .stat-value"
  );

  if (statCard1) statCard1.textContent = stats.pending;
  if (statCard2) statCard2.textContent = stats.pendingProjects;
}

// 渲染拉取请求列表（管理页面专用）
function renderPullRequestsForManagerPage(requests) {
  // console.log(requests);

  const listContainer = document.querySelector(
    ".main-contain > [data-box='manager'] .pull-request-list"
  );
  if (!listContainer) {
    console.error("未找到管理页面拉取请求列表容器");
    return;
  }

  const listHeader = listContainer.querySelector(".list-header");
  listContainer.innerHTML = "";
  if (listHeader) listContainer.appendChild(listHeader);

  const projectRequests = requests;

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

// 初始化筛选功能（管理页面专用）
function initFilterListenersForManagerPage() {
  const statusSelect = document.querySelector(
    ".filter-bar select:nth-child(1)"
  );
  const userSelect = document.querySelector(".filter-bar select:nth-child(2)");
  const searchInput = document.querySelector(".filter-bar .search-box");

  if (!statusSelect || !userSelect || !searchInput) {
    console.error("筛选元素未找到");
    return;
  }

  function filterPullRequests() {
    const status = statusSelect.value;
    const user = userSelect.value;
    const search = searchInput.value.toLowerCase();

    const filteredRequests = pullRequestsForManagerPage.filter((request) => {
      return (
        (status === "all" || request.status === status) &&
        (user === "all" || request.creator_name === user) &&
        (search === "" || request.title.toLowerCase().includes(search))
      );
    });

    renderPullRequestsForManagerPage(filteredRequests);
  }

  statusSelect.addEventListener("change", filterPullRequests);
  userSelect.addEventListener("change", filterPullRequests);
  searchInput.addEventListener("input", filterPullRequests);
}

// 初始化拉取请求点击事件（管理页面专用）
function initPullRequestListenersForManagerPage() {
  const items = document.querySelectorAll(".pull-request-item");
  items.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const prId = item.dataset.prId;
      currentPullRequest = pullRequestsForManagerPage.find(
        (pr) => pr.id == prId
      );
      await loadPullRequestDetailsForManagerPage(currentPullRequest);
      const indexBox = document.querySelector(
        ".main-contain > [data-box='manager'] .index-box"
      );
      const managerBox = document.querySelector(
        ".main-contain > [data-box='manager'] .manager-box"
      );
      if (indexBox) indexBox.style.display = "none";
      if (managerBox) managerBox.style.display = "block";
    });
  });
}

// 获取文件差异（管理页面专用）
async function fetchFileChangesForManagerPage(prId) {
  try {
    const token = localStorage.getItem("token");
    // console.log("Token used for request:", token); // 调试日志
    if (!token) {
      throw new Error("未登录，请先登录");
    }

    const response = await fetch(
      `${API_BASE_URL}/project/${projectId}/pulls/${prId}/diff`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.log("Error response from server:", errorData); // 调试日志
      throw new Error(`获取文件差异失败: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Fetched diff data:", data);
    if (!data.success) {
      throw new Error("获取文件差异数据失败");
    }

    return data.diff || [];
  } catch (error) {
    console.error("获取文件差异错误:", error);
    return [];
  }
}

// 渲染文件列表（管理页面专用）
function renderFilesListForManagerPage(files) {
  const filesList = document.querySelector(".files-list");
  if (!filesList) return;

  filesList.innerHTML = `<div class="files-header">已修改文件 (${files.length})</div>`;
  files.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = `file-item ${index === 0 ? "active" : ""}`; // 默认第一个文件高亮
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
      renderDiffContentForManagerPage(file);
    });
    filesList.appendChild(fileItem);
  });
}

// 渲染差异内容（管理页面专用）
function renderDiffContentForManagerPage(file) {
  const diffHeader = document.querySelector(".diff-header div:first-child");
  const diffContent = document.querySelector(".diff-content");

  if (!file) {
    if (diffHeader) diffHeader.textContent = "无文件差异";
    if (diffContent) diffContent.innerHTML = "<div>暂无差异内容</div>";
    return;
  }

  if (diffHeader) diffHeader.textContent = file.name;
  if (diffContent) {
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
            <div class="line-content">${line.content || ""}</div>
          </div>
        `
      )
      .join("");
  }
}

// 初始化操作按钮（管理页面专用）
function initActionButtonsForManagerPage(pr) {
  const rejectBtn = document.querySelector(".buttons .btn:not(.btn-primary)");
  const mergeBtn = document.querySelector(".buttons .btn.btn-primary");

  if (rejectBtn) {
    rejectBtn.addEventListener("click", async () => {
      if (confirm("确定要拒绝此拉取请求吗？")) {
        await handlePullRequestForManagerPage(pr.id, "closed");
      }
    });
  }

  if (mergeBtn) {
    mergeBtn.addEventListener("click", async () => {
      if (confirm("确定要通过并合并此拉取请求吗？")) {
        await handlePullRequestForManagerPage(pr.id, "merged");
      }
    });
  }

  if (pr.status !== "wait") {
    if (rejectBtn) rejectBtn.disabled = true;
    if (mergeBtn) mergeBtn.disabled = true;
  }
}

// 处理拉取请求（管理页面专用）
async function handlePullRequestForManagerPage(prId, status) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/project/pulls/${prId}/${
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
    const indexBox = document.querySelector(
      ".main-contain > [data-box='manager'] .index-box"
    );
    const managerBox = document.querySelector(
      ".main-contain > [data-box='manager'] .manager-box"
    );
    if (indexBox) indexBox.style.display = "block";
    if (managerBox) managerBox.style.display = "none";
    await fetchPullRequestsForManagerPage();
    renderStatsForManagerPage();
  } catch (error) {
    console.error("处理拉取请求错误:", error);
    alert(`操作失败：${error.message}`);
  }
}

// 加载拉取请求详情（管理页面专用）
async function loadPullRequestDetailsForManagerPage(pr) {
  const pullRequestTitle = document.querySelector(
    ".main-contain > [data-box='manager'] .pull-request-title"
  );
  const pullRequestInfo = document.querySelector(
    ".main-contain > [data-box='manager'] .pull-request-info"
  );

  if (pullRequestTitle) {
    pullRequestTitle.textContent = `${pr.title} (#${pr.id})`;
  }
  if (pullRequestInfo) {
    pullRequestInfo.innerHTML = `
      <span>${pr.source_branch} → ${pr.target_branch}</span>
      <span>创建人: ${pr.creator_name}</span>
      <span>创建于: ${
        new Date(pr.created_at).toISOString().split("T")[0]
      }</span>
    `;
  }

  const sourceSelect = document.querySelector("#source-branch");
  const targetSelect = document.querySelector("#target-branch");
  if (sourceSelect) {
    sourceSelect.innerHTML = `<option value="${pr.source_branch}">${pr.source_branch}</option>`;
    sourceSelect.disabled = true;
  }
  if (targetSelect) {
    targetSelect.innerHTML = `<option value="${pr.target_branch}">${pr.target_branch}</option>`;
    targetSelect.disabled = true;
  }

  const files = await fetchFileChangesForManagerPage(pr.id);
  renderFilesListForManagerPage(files);
  if (files.length > 0) {
    renderDiffContentForManagerPage(files[0]); // 默认显示第一个文件的差异
  } else {
    renderDiffContentForManagerPage(null); // 没有差异时显示提示
  }

  initActionButtonsForManagerPage(pr);
}

// 返回列表（管理页面）
const pullRequestHeader = document.querySelector(
  ".main-contain > [data-box='manager'] .pull-request-header"
);
if (pullRequestHeader) {
  pullRequestHeader.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") {
      const indexBox = document.querySelector(
        ".main-contain > [data-box='manager'] .index-box"
      );
      const managerBox = document.querySelector(
        ".main-contain > [data-box='manager'] .manager-box"
      );
      if (indexBox) indexBox.style.display = "block";
      if (managerBox) managerBox.style.display = "none";
    }
  });
}

// 修改项目内容
let selectedTagsForSetPage = [];
let admins = [];
let members = [];
let allUsers = [];

async function initProject() {
  try {
    const response = await fetch(`${API_BASE_URL}/project/init/${projectId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`获取项目详情失败，状态码: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      const project = result.project;

      document.querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-title input"
      ).value = project.name || "";
      document.querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-message textarea"
      ).value = project.description || "";

      selectedTagsForSetPage = project.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      }));
      updateTagsForSetPage();

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

      await fetchUsersAndMembersForSetPage();
      renderUsersForSetPage();
    } else {
      alert("获取项目详情失败：" + result.error);
    }
  } catch (error) {
    console.error("初始化项目失败:", error);
    alert("初始化项目失败：" + error.message);
  }
}

async function fetchUsersAndMembersForSetPage() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/project/users-and-members/${projectId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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

function renderUsersForSetPage() {
  const managerList = document.querySelector(
    ".main .main-contain > [data-box='set'] > .message-box .responsibility .manager-list"
  );
  const groupList = document.querySelector(
    ".main .main-contain > [data-box='set'] > .message-box .responsibility .group-list"
  );

  if (!managerList || !groupList) return;

  managerList.innerHTML = "";
  groupList.innerHTML = "";

  allUsers.forEach((user) => {
    const isAdmin = admins.some((admin) => admin.id === user.id);
    const isMember = members.some((member) => member.id === user.id);

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

  const adminCheckboxes = document.querySelectorAll(
    ".main .main-contain [data-box='set'] .manager-list input[type='checkbox']"
  );
  const memberCheckboxes = document.querySelectorAll(
    ".main .main-contain [data-box='set'] .group-list input[type='checkbox']"
  );

  adminCheckboxes.forEach((checkbox) => {
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    newCheckbox.addEventListener("change", handleCheckboxChangeForSetPage);
  });

  memberCheckboxes.forEach((checkbox) => {
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    newCheckbox.addEventListener("change", handleCheckboxChangeForSetPage);
  });
}

function handleCheckboxChangeForSetPage(e) {
  const userId = parseInt(e.target.dataset.id, 10);
  const type = e.target.dataset.type;
  const isChecked = e.target.checked;

  if (type === "admin") {
    if (isChecked) {
      const user = allUsers.find((u) => u.id === userId);
      if (!admins.some((admin) => admin.id === userId)) {
        admins.push({
          id: userId,
          name: user.name,
          avatar_url: user.avatar_url,
        });
      }
      members = members.filter((member) => member.id !== userId);
    } else {
      admins = admins.filter((admin) => admin.id !== userId);
    }
  } else if (type === "member") {
    if (isChecked) {
      const user = allUsers.find((u) => u.id === userId);
      if (!members.some((member) => member.id === userId)) {
        members.push({
          id: userId,
          name: user.name,
          avatar_url: user.avatar_url,
        });
      }
      admins = admins.filter((admin) => admin.id !== userId);
    } else {
      members = members.filter((member) => member.id !== userId);
    }
  }

  renderUsersForSetPage();
}

function updateTagsForSetPage() {
  const inputTag = document.querySelector(
    ".main .main-contain [data-box='set'] > .message-box .tag-box .input-tag"
  );
  if (!inputTag) return;

  inputTag.innerHTML = "";
  selectedTagsForSetPage.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.textContent = tag.name;
    tagElement.style.backgroundColor = tag.color;
    tagElement.style.color = "#fff";
    tagElement.style.padding = "5px 10px";
    tagElement.style.borderRadius = "5px";
    tagElement.style.marginRight = "5px";
    tagElement.dataset.id = tag.id;
    tagElement.addEventListener("click", () => {
      selectedTagsForSetPage = selectedTagsForSetPage.filter(
        (t) => t.id !== tag.id
      );
      updateTagsForSetPage();
    });
    inputTag.appendChild(tagElement);
  });

  const hasStatusTag = selectedTagsForSetPage.some((tag) =>
    ["doing", "over", "wait"].includes(tag.name)
  );
  if (!hasStatusTag) {
    alert("请至少选择一个状态标签（进行中、已完成、待办）");
  }
}

document
  .querySelector(
    ".main .main-contain [data-box='set'] > .message-box .tag-box .tag-list"
  )
  ?.addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName === "SPAN") {
      const tagId = parseInt(target.dataset.id, 10);
      const tagName = target.dataset.tag;
      const tagColor = target.style.backgroundColor;

      if (["doing", "over", "wait"].includes(tagName)) {
        selectedTagsForSetPage = selectedTagsForSetPage.filter(
          (tag) => !["doing", "over", "wait"].includes(tag.name)
        );
      }

      if (!selectedTagsForSetPage.some((tag) => tag.id === tagId)) {
        selectedTagsForSetPage.push({
          id: tagId,
          name: tagName,
          color: tagColor,
        });
      } else {
        selectedTagsForSetPage = selectedTagsForSetPage.filter(
          (tag) => tag.id !== tagId
        );
      }
      updateTagsForSetPage();
    }
  });

document
  .querySelector(".main .main-contain [data-box='set'] .head .submit")
  ?.addEventListener("click", async () => {
    const title = document
      .querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-title input"
      )
      ?.value.trim();
    const description = document
      .querySelector(
        ".main .main-contain [data-box='set'] > .message-box .input-message textarea"
      )
      ?.value.trim();
    const status = selectedTagsForSetPage.find((tag) =>
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
        `${API_BASE_URL}/project/update-project/${projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: title,
            description,
            status,
            tags: selectedTagsForSetPage.map((tag) => tag.id),
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
        window.location.reload();
      } else {
        alert("更新项目失败：" + result.error);
      }
    } catch (error) {
      console.error("更新项目失败:", error);
      alert("更新项目失败：" + error.message);
    }
  });

document
  .querySelector(
    ".main .main-contain [data-box='set'] .message-box > .icon .delete"
  )
  ?.addEventListener("click", () => {
    const deleteDropdown = document.querySelector(
      ".main .main-contain [data-box='set'] .message-box > .icon .drop-down"
    );
    if (deleteDropdown) deleteDropdown.style.display = "flex";
    const overlay = document.querySelector("body > .overlay");
    if (overlay) overlay.style.display = "block";
  });

document
  .querySelector(
    ".main .main-contain [data-box='set'] .message-box > .icon .drop-down > .icon .no"
  )
  ?.addEventListener("click", () => {
    const deleteDropdown = document.querySelector(
      ".main .main-contain [data-box='set'] .message-box > .icon .drop-down"
    );
    if (deleteDropdown) deleteDropdown.style.display = "none";
    const overlay = document.querySelector("body > .overlay");
    if (overlay) overlay.style.display = "none";
  });

document
  .querySelector(
    ".main .main-contain [data-box='set'] .message-box > .icon .drop-down > .icon .yes"
  )
  ?.addEventListener("click", async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/project/delete-project/${projectId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`删除项目失败，状态码: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert("项目删除成功");
        window.location.href = `${LocalAPI}/font/public/html/index.html?id=${userId}`;
      } else {
        alert("删除项目失败：" + result.error);
      }
    } catch (error) {
      console.error("删除项目失败:", error);
      alert("删除项目失败：" + error.message);
    }
  });
