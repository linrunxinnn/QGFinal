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

// 以下是原有的 pull request 相关代码（保持不变）...
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

// function initNewPullRequest() {
//   const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
//   const pullSection = pullBox.querySelector(".pull-box");
//   const newPullSection = pullBox.querySelector(".new-pull");
//   const newPullBtn = pullSection.querySelector(".head .icon");
//   const backBtn = newPullSection.querySelector(".head .icon");

//   if (!pullBox || !pullSection || !newPullSection || !newPullBtn || !backBtn) {
//     console.error("拉取请求相关元素未找到");
//     return;
//   }

//   newPullBtn.addEventListener("click", () => {
//     pullSection.style.display = "none";
//     newPullSection.style.display = "flex";
//   });
//   backBtn.addEventListener("click", () => {
//     pullSection.style.display = "flex";
//     newPullSection.style.display = "none";
//   });

//   const actionSelect = newPullSection.querySelector(
//     ".new-pull-box > .head #action"
//   );
//   const pullBoxSection = newPullSection.querySelector(
//     ".new-pull-box > .head .pull-box"
//   );
//   const mergeBoxSection = newPullSection.querySelector(
//     ".new-pull-box > .head .merge-box"
//   );

//   if (!actionSelect || !pullBoxSection || !mergeBoxSection) {
//     console.error("拉取/合并模式元素未找到");
//     return;
//   }

//   pullBoxSection.style.display =
//     actionSelect.value === "pull-box" ? "flex" : "none";
//   mergeBoxSection.style.display =
//     actionSelect.value === "merge-box" ? "flex" : "none";

//   actionSelect.addEventListener("change", () => {
//     const action = actionSelect.value;
//     pullBoxSection.style.display = action === "pull-box" ? "flex" : "none";
//     mergeBoxSection.style.display = action === "merge-box" ? "flex" : "none";
//   });

//   const fromDropdown = pullBoxSection.querySelector(".from .drop-down");
//   const fromIcon = pullBoxSection.querySelector(".from .icon");
//   const fromSpan = pullBoxSection.querySelector(".from .icon .select-from");

//   if (!fromDropdown || !fromIcon || !fromSpan) {
//     console.error("pull-box 分支下拉菜单元素未找到");
//     return;
//   }

//   fromDropdown.innerHTML = branches
//     .map(
//       (branch) => `
//         <div class="branch-item" data-branch-id="${
//           branch.id
//         }" data-branch-name="${branch.name}">
//           ${branch.name}${branch.is_main ? " (主分支)" : ""}
//         </div>
//       `
//     )
//     .join("");

//   const defaultFromBranch =
//     branches.find((b) => b.id === Number(currentBranchId)) || branches[0];
//   if (defaultFromBranch) {
//     fromSpan.textContent = defaultFromBranch.name;
//     fromSpan.dataset.branchId = defaultFromBranch.id;
//   } else {
//     fromSpan.textContent = "无分支";
//     fromSpan.dataset.branchId = "";
//   }

//   fromIcon.addEventListener("click", (e) => {
//     e.stopPropagation();
//     fromDropdown.style.display = "flex";
//   });

//   fromDropdown.querySelectorAll(".branch-item").forEach((item) => {
//     item.addEventListener("click", () => {
//       fromSpan.textContent = item.getAttribute("data-branch-name");
//       fromSpan.dataset.branchId = item.getAttribute("data-branch-id");
//       fromDropdown.style.display = "none";
//     });
//   });

//   document.addEventListener("click", () => {
//     fromDropdown.style.display = "none";
//   });

//   const mergeFromDropdown = mergeBoxSection.querySelector(".from .drop-down");
//   const mergeToDropdown = mergeBoxSection.querySelector(".to .drop-down");
//   const mergeFromIcon = mergeBoxSection.querySelector(".from .icon");
//   const mergeToIcon = mergeBoxSection.querySelector(".to .icon");
//   const mergeFromSpan = mergeBoxSection.querySelector(".from .select-from");
//   const mergeToSpan = mergeBoxSection.querySelector(".to .select-to");

//   if (
//     mergeFromDropdown &&
//     mergeToDropdown &&
//     mergeFromIcon &&
//     mergeToIcon &&
//     mergeFromSpan &&
//     mergeToSpan
//   ) {
//     mergeFromDropdown.innerHTML = branches
//       .map(
//         (branch) => `
//           <div class="branch-item" data-branch-id="${
//             branch.id
//           }" data-branch-name="${branch.name}">
//             ${branch.name}${branch.is_main ? " (主分支)" : ""}
//           </div>
//         `
//       )
//       .join("");
//     mergeToDropdown.innerHTML = branches
//       .map(
//         (branch) => `
//           <div class="branch-item" data-branch-id="${
//             branch.id
//           }" data-branch-name="${branch.name}">
//             ${branch.name}${branch.is_main ? " (主分支)" : ""}
//           </div>
//         `
//       )
//       .join("");

//     const defaultMergeFromBranch =
//       branches.find((b) => b.id === Number(currentBranchId)) || branches[0];
//     const defaultMergeToBranch = branches.find((b) => b.is_main) || branches[0];
//     if (defaultMergeFromBranch) {
//       mergeFromSpan.textContent = defaultMergeFromBranch.name;
//       mergeFromSpan.dataset.branchId = defaultMergeFromBranch.id;
//     }
//     if (defaultMergeToBranch) {
//       mergeToSpan.textContent = defaultMergeToBranch.name;
//       mergeToSpan.dataset.branchId = defaultMergeToBranch.id;
//     }

//     mergeFromIcon.addEventListener("click", (e) => {
//       e.stopPropagation();
//       mergeFromDropdown.style.display = "flex";
//     });
//     mergeToIcon.addEventListener("click", (e) => {
//       e.stopPropagation();
//       mergeToDropdown.style.display = "flex";
//     });

//     mergeFromDropdown.querySelectorAll(".branch-item").forEach((item) => {
//       item.addEventListener("click", () => {
//         mergeFromSpan.textContent = item.getAttribute("data-branch-name");
//         mergeFromSpan.dataset.branchId = item.getAttribute("data-branch-id");
//         mergeFromDropdown.style.display = "none";
//       });
//     });
//     mergeToDropdown.querySelectorAll(".branch-item").forEach((item) => {
//       item.addEventListener("click", () => {
//         mergeToSpan.textContent = item.getAttribute("data-branch-name");
//         mergeToSpan.dataset.branchId = item.getAttribute("data-branch-id");
//         mergeToDropdown.style.display = "none";
//       });
//     });

//     document.addEventListener("click", () => {
//       mergeFromDropdown.style.display = "none";
//       mergeToDropdown.style.display = "none";
//     });
//   }

//   const tagList = newPullSection.querySelector(".tag-box .tag-list");
//   const inputTag = newPullSection.querySelector(".tag-box .input-tag");
//   const availableTags = new Map();

//   if (!tagList || !inputTag) {
//     console.error("标签选择元素未找到");
//     return;
//   }

//   const urlParams = new URLSearchParams(window.location.search);
//   const projectId = urlParams.get("id");

//   fetch(`http://localhost:3000/project/tags/${projectId}`, {
//     method: "GET",
//     headers: {
//       Authorization: `Bearer ${localStorage.getItem("token")}`,
//       "Content-Type": "application/json",
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`获取标签失败: ${response.statusText}`);
//       }
//       return response.json();
//     })
//     .then((data) => {
//       if (!data.success) {
//         throw new Error("获取标签数据失败");
//       }

//       const tags = data.tags || [];
//       tagList.innerHTML = "";
//       tags.forEach((tag) => {
//         const tagId = String(tag.id);
//         const tagElement = document.createElement("span");
//         tagElement.setAttribute("data-tag", tagId);
//         tagElement.textContent = tag.name;
//         tagElement.style.backgroundColor = tag.color || "#e67700";
//         tagElement.style.color = "#fff";
//         tagElement.style.padding = "5px 10px";
//         tagElement.style.borderRadius = "5px";
//         tagElement.style.margin = "2px";
//         tagList.appendChild(tagElement);
//         availableTags.set(tagId, {
//           name: tag.name,
//           color: tag.color || "#e67700",
//           element: tagElement.cloneNode(true),
//         });

//         tagElement.addEventListener("click", handleTagAdd);
//       });
//     })
//     .catch((error) => {
//       console.error("获取标签错误:", error);
//       tagList.innerHTML = `<div class="error">加载标签失败：${error.message}</div>`;
//     });

//   function handleTagAdd(e) {
//     const tag = e.target;
//     const tagId = String(tag.getAttribute("data-tag"));
//     const tagInfo = availableTags.get(tagId);

//     if (!tagInfo) {
//       console.error(`未找到标签信息，tagId: ${tagId}`);
//       return;
//     }

//     const newTag = document.createElement("span");
//     newTag.setAttribute("data-tag", tagId);
//     newTag.className = "tag-item";
//     newTag.textContent = tagInfo.name;
//     newTag.style.backgroundColor = tagInfo.color;
//     newTag.style.borderRadius = "5px";
//     newTag.style.padding = "5px 10px";
//     newTag.style.color = "#fff";
//     newTag.style.margin = "2px";
//     inputTag.appendChild(newTag);
//     selectedTags.add(tagId);

//     tag.remove();
//   }

//   inputTag.addEventListener("click", (e) => {
//     if (e.target.classList.contains("tag-item")) {
//       const tagId = String(e.target.getAttribute("data-tag"));
//       const tagInfo = availableTags.get(tagId);

//       if (!tagInfo) {
//         console.error(`未找到标签信息，tagId: ${tagId}`);
//         return;
//       }

//       const existingTag = tagList.querySelector(`[data-tag="${tagId}"]`);
//       if (!existingTag) {
//         const newTag = tagInfo.element.cloneNode(true);
//         newTag.addEventListener("click", handleTagAdd);
//         tagList.appendChild(newTag);
//       } else {
//         console.log(`标签 ${tagId} 已存在于 .tag-list 中，不重复添加`);
//       }

//       e.target.remove();
//       selectedTags.delete(tagId);
//     }
//   });

//   const submitBtn = newPullSection.querySelector(".submit");
//   if (submitBtn) {
//     submitBtn.addEventListener("click", () => {
//       const action = actionSelect.value;
//       const section = action === "pull-box" ? pullBoxSection : mergeBoxSection;
//       const fromSpan = section.querySelector(".from .select-from");
//       const toSpan = section.querySelector(".to .select-to");
//       const titleInput = newPullSection.querySelector(".title-input");
//       const messageInput = newPullSection.querySelector("#message");
//       const deadlineInput = newPullSection.querySelector(".deadline .date");

//       const fromBranchId = fromSpan.dataset.branchId;
//       const toBranchId = toSpan ? toSpan.dataset.branchId : null;
//       const title = titleInput ? titleInput.value : "";
//       const message = messageInput ? messageInput.value : "";
//       const tags = Array.from(selectedTags);
//       const managers = Array.from(selectedManagers);
//       const deadline = deadlineInput ? deadlineInput.value : "";

//       if (!title || !message || !fromBranchId) {
//         alert("请填写所有必填字段！");
//         return;
//       }

//       const requestBody = {
//         projectId,
//         title,
//         description: message,
//         sourceBranchId: fromBranchId,
//         status: "wait",
//         deadline,
//         tags,
//         members: managers,
//       };

//       if (action === "merge-box" && toBranchId) {
//         requestBody.targetBranchId = toBranchId;
//       }

//       if (action === "pull-box") {
//         fetch(`http://localhost:3000/project/pulls/create`, {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(requestBody),
//         })
//           .then((response) => {
//             if (!response.ok) {
//               return response.json().then((errorData) => {
//                 throw new Error(
//                   errorData.error || `HTTP错误: ${response.status}`
//                 );
//               });
//             }
//             return response.json();
//           })
//           .then((data) => {
//             if (!data.success) {
//               throw new Error("创建拉取请求失败");
//             }
//             alert("拉取请求创建成功！");
//             if (titleInput) titleInput.value = "";
//             if (messageInput) messageInput.value = "";
//             selectedTags.clear();
//             inputTag.innerHTML = "";
//             tagList.innerHTML = "";
//             availableTags.forEach((tagInfo, tagId) => {
//               const newTag = tagInfo.element.cloneNode(true);
//               newTag.addEventListener("click", handleTagAdd);
//               tagList.appendChild(newTag);
//             });
//             selectedManagers.clear();
//             const managerList = newPullSection.querySelector(".manager-list");
//             if (managerList) managerList.innerHTML = "";
//             pullSection.style.display = "flex";
//             newPullSection.style.display = "none";
//             initPullRequests();
//           })
//           .catch((error) => {
//             console.error("创建拉取请求错误:", error);
//             alert("创建失败：" + error.message);
//           });
//       } else {
//         fetch(`http://localhost:3000/project/merge/create`, {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(requestBody),
//         })
//           .then((response) => {
//             if (!response.ok) {
//               return response.json().then((errorData) => {
//                 throw new Error(
//                   errorData.error || `HTTP错误: ${response.status}`
//                 );
//               });
//             }
//             return response.json();
//           })
//           .then((data) => {
//             if (!data.success) {
//               throw new Error("创建合并请求失败");
//             }
//             alert("合并请求创建成功！");
//             if (titleInput) titleInput.value = "";
//             if (messageInput) messageInput.value = "";
//             selectedTags.clear();
//             inputTag.innerHTML = "";
//             tagList.innerHTML = "";
//             availableTags.forEach((tagInfo, tagId) => {
//               const newTag = tagInfo.element.cloneNode(true);
//               newTag.addEventListener("click", handleTagAdd);
//               tagList.appendChild(newTag);
//             });
//             selectedManagers.clear();
//             const managerList = newPullSection.querySelector(".manager-list");
//             if (managerList) managerList.innerHTML = "";
//             pullSection.style.display = "flex";
//             newPullSection.style.display = "none";
//             initPullRequests();
//           })
//           .catch((error) => {
//             console.error("创建合并请求错误:", error);
//             alert("创建失败：" + error.message);
//           });
//       }
//     });
//   }
// }

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
function initBranchSelection(
  section,
  type,
  branches,
  defaultBranchId,
  mainBranchId
) {
  const dropdown = section.querySelector(`.${type} .drop-down`);
  const icon = section.querySelector(`.${type} .icon`);
  const span = section.querySelector(`.${type} .select-${type}`);

  if (!dropdown || !icon || !span) {
    console.error(`${type} 分支下拉菜单元素未找到`);
    return;
  }

  // 填充下拉菜单
  dropdown.innerHTML = branches
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

  // 设置默认值
  // 源分支（from）：默认选择第一个分支
  // 目标分支（to）：默认选择主分支（如果存在），否则选择第一个分支
  const defaultBranch =
    type === "from"
      ? branches[0] // 源分支默认选择第一个分支
      : branches.find((b) => b.is_main) || branches[0]; // 目标分支默认选择主分支

  if (defaultBranch) {
    span.textContent = defaultBranch.name;
    span.dataset.branchId = defaultBranch.id;
  } else {
    span.textContent = "无分支";
    span.dataset.branchId = "";
  }

  // 点击图标显示下拉菜单
  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display = "flex";
  });

  // 选择分支
  dropdown.querySelectorAll(".branch-item").forEach((item) => {
    item.addEventListener("click", () => {
      span.textContent = item.getAttribute("data-branch-name");
      span.dataset.branchId = item.getAttribute("data-branch-id");
      dropdown.style.display = "none";
    });
  });

  // 点击页面其他地方关闭下拉菜单
  document.addEventListener("click", () => {
    dropdown.style.display = "none";
  });

  return span;
}

// 初始化标签选择
async function initTagSelection(newPullSection, projectId, selectedTags) {
  const tagList = newPullSection.querySelector(".tag-box .tag-list");
  const inputTag = newPullSection.querySelector(".tag-box .input-tag");
  const availableTags = new Map();

  if (!tagList || !inputTag) {
    console.error("标签选择元素未找到");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/project/tags/${projectId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`获取标签失败: ${response.statusText}`);
    }

    const data = await response.json();
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
      availableTags.set(tagId, {
        name: tag.name,
        color: tag.color || "#e67700",
        element: tagElement.cloneNode(true),
      });

      tagElement.addEventListener("click", handleTagAdd);
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
          const newTag = tagInfo.element.cloneNode(true);
          newTag.addEventListener("click", handleTagAdd);
          tagList.appendChild(newTag);
        }
        e.target.remove();
        selectedTags.delete(tagId);
      }
    });

    return availableTags;
  } catch (error) {
    console.error("获取标签错误:", error);
    tagList.innerHTML = `<div class="error">加载标签失败：${error.message}</div>`;
  }
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
  ); // 直接使用 merge-box 样式
  const fromSpan = section.querySelector(".from .select-from");
  const toSpan = section.querySelector(".to .select-to");
  const titleInput = newPullSection.querySelector(".title-input");
  const messageInput = newPullSection.querySelector("#message");
  const deadlineInput = newPullSection.querySelector(".deadline .date");
  const tagList = newPullSection.querySelector(".tag-box .tag-list");
  const inputTag = newPullSection.querySelector(".tag-box .input-tag");

  const sourceBranchId = fromSpan.dataset.branchId;
  const targetBranchId = toSpan.dataset.branchId;
  const title = titleInput ? titleInput.value.trim() : "";
  const description = messageInput ? messageInput.value.trim() : "";
  const tags = Array.from(selectedTags);
  const members = Array.from(selectedManagers);
  const deadline = deadlineInput ? deadlineInput.value : "";

  // 验证必填字段
  if (!title || !description || !sourceBranchId || !targetBranchId) {
    alert("请填写所有必填字段，包括源分支和目标分支！");
    return;
  }

  const requestBody = {
    projectId,
    title,
    description,
    sourceBranchId,
    targetBranchId,
    status: "wait",
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
      throw new Error(errorData.error || `HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("创建拉取请求失败");
    }

    alert("拉取请求创建成功！");
    // 重置表单
    if (titleInput) titleInput.value = "";
    if (messageInput) messageInput.value = "";
    selectedTags.clear();
    inputTag.innerHTML = "";
    tagList.innerHTML = "";
    availableTags.forEach((tagInfo, tagId) => {
      const newTag = tagInfo.element.cloneNode(true);
      newTag.addEventListener("click", tagList.handleTagAdd);
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
    alert(`创建失败：${error.message}`);
  }
}

// 主函数
async function initNewPullRequest() {
  const pullBox = document.querySelector('.main-contain > [data-box="pull"]');
  if (!pullBox) {
    console.error("拉取请求容器未找到");
    return;
  }

  // const { pullSection, newPullSection } = initSectionToggle(pullBox);
  // const section = newPullSection.querySelector(
  //   ".new-pull-box > .head .merge-box"
  // );
  // section.style.display = "flex"; // 始终显示

  // const urlParams = new URLSearchParams(window.location.search);
  // const projectId = urlParams.get("id");
  // const currentBranchId = urlParams.get("branchId"); // 假设可以从 URL 获取
  // const branches = await fetchBranches(projectId); // 假设有一个函数获取分支

  // const fromSpan = initBranchSelection(
  //   section,
  //   "from",
  //   branches,
  //   currentBranchId
  // );
  // const toSpan = initBranchSelection(section, "to", branches, null, true);

  // const selectedTags = new Set();
  // const selectedManagers = new Set();
  // const availableTags = await initTagSelection(
  //   newPullSection,
  //   projectId,
  //   selectedTags
  // );

  // const submitBtn = newPullSection.querySelector(".submit");
  // if (submitBtn) {
  //   submitBtn.addEventListener("click", () => {
  //     submitPullRequest(
  //       newPullSection,
  //       pullSection,
  //       projectId,
  //       selectedTags,
  //       selectedManagers,
  //       availableTags
  //     );
  //   });
  // }
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
