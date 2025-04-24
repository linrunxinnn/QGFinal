function initFileWorkspace(initialBranchId) {
  // const urlParams = new URLSearchParams(window.location.search);
  // const userId = urlParams.get("userId");
  const token = localStorage.getItem("token");
  const projectId = urlParams.get("id");

  if (!userId || !token || !projectId) {
    alert("请登录后再操作");
    window.location.href = "/login.html";
    return;
  }

  let currentBranchId = initialBranchId || null;
  let currentFileId = null;
  let saveTimeout = null;

  // 获取分支列表
  const branchSelect = document.querySelector(
    ".main .main-contain > [data-box='work'] > .nav .top #action"
  );
  const loadBranches = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/branches?userId=${userId}&projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        branchSelect.innerHTML = result.branches
          .map(
            (branch) =>
              `<option value="${branch.id}">${branch.name}${
                branch.is_main ? " (主分支)" : ""
              }</option>`
          )
          .join("");
        if (!currentBranchId) {
          currentBranchId = branchSelect.value;
        } else {
          branchSelect.value = currentBranchId;
        }
        loadFiles();
        loadCommits();
      } else {
        console.error("获取分支失败:", result.error);
      }
    } catch (error) {
      console.error("加载分支失败:", error);
    }
  };

  // 切换分支
  branchSelect.addEventListener("change", () => {
    currentBranchId = branchSelect.value;
    loadFiles();
    loadCommits();
  });

  // 加载文件树
  const documentContainer = document.querySelector(
    ".main .main-contain > [data-box='work'] > .nav .top .document"
  );
  const loadFiles = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/files?projectId=${projectId}&branchId=${currentBranchId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      console.log("后端返回的文件树:", result);
      if (result.success) {
        documentContainer.innerHTML = renderFileTree(result.files, 0);
        attachFileTreeEvents();
      }
    } catch (error) {
      console.error("加载文件树失败:", error);
    }
  };

  // 渲染文件树
  // const renderFileTree = (files, indentLevel) => {
  //   return files
  //     .map((file) => {
  //       const indent = indentLevel * 20;
  //       return `
  //         <div class="document-item ${file.type}" data-file-id="${
  //         file.id
  //       }" style="padding-left: ${indent}px">
  //           <div class="message">
  //             ${
  //               file.type === "folder"
  //                 ? `<span class="arrow">${
  //                     file.children && file.children.length ? "▼" : "▶"
  //                   }</span>`
  //                 : `
  //                 <svg class="icon" width="20" height="20">
  //                   <path d="M851.2 32H198.4c-38.4 0-64 25.6-64 64v844.8c0 32 32 64 64 64h409.6c38.4 0 64-25.6 64-64v-134.4c0-32 32-64 64-64h108.8c38.4 0 64-25.6 64-64V89.6c12.8-32-19.2-57.6-57.6-57.6zM640 556.8c0 19.2-12.8 32-32 32H320c-19.2 0-32-12.8-32-32v-6.4c0-19.2 12.8-32 32-32h288c19.2 0 32 12.8 32 38.4zM780.8 384c0 19.2-12.8 32-32 32H320c-19.2-6.4-38.4-19.2-38.4-32v-6.4c0-19.2 12.8-32 32-32h428.8c25.6 0 38.4 12.8 38.4 38.4z m0-172.8c0 19.2-12.8 32-32 32H320c-19.2 0-32-12.8-32-32v-6.4c0-19.2 12.8-32 32-32h428.8c19.2 0 32 12.8 32 38.4z" fill="#8a8a8a"/>
  //                   <path d="M716.8 851.2v89.6c0 32 38.4 44.8 57.6 25.6l128-128c19.2-19.2 6.4-57.6-25.6-57.6h-89.6c-38.4 0-70.4 32-70.4 70.4z" fill="#8a8a8a"/>
  //                 </svg>
  //                 `
  //             }
  //             <span class="name">${file.name}</span>
  //           </div>
  //           ${
  //             file.children
  //               ? `<div class="children" style="display: ${
  //                   file.children.length ? "block" : "none"
  //                 }">
  //                   ${renderFileTree(file.children, indentLevel + 1)}
  //                 </div>`
  //               : ""
  //           }
  //         </div>
  //       `;
  //     })
  //     .join("");
  // };
  const renderFileTree = (files, indentLevel) => {
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.warn("文件列表为空或无效:", files);
      return "<div>暂无文件</div>";
    }

    return files
      .map((file) => {
        const indent = indentLevel * 20;
        const hasChildren =
          file.children &&
          Array.isArray(file.children) &&
          file.children.length > 0;
        console.log(
          `渲染文件: ${file.name}, 层级: ${indentLevel}, 子节点:`,
          file.children,
          "内容:",
          file.content
        );
        return `
          <div class="document-item ${file.type}" data-file-id="${
          file.id
        }" data-content="${
          file.content ? escapeHtml(file.content) : ""
        }" style="padding-left: ${indent}px">
            <div class="message">
              ${
                file.type === "folder"
                  ? `<span class="arrow">${hasChildren ? "▼" : "▶"}</span>`
                  : `
                  <svg class="icon" width="20" height="20">
                    <path d="M851.2 32H198.4c-38.4 0-64 25.6-64 64v844.8c0 32 32 64 64 64h409.6c38.4 0 64-25.6 64-64v-134.4c0-32 32-64 64-64h108.8c38.4 0 64-25.6 64-64V89.6c12.8-32-19.2-57.6-57.6-57.6zM640 556.8c0 19.2-12.8 32-32 32H320c-19.2 0-32-12.8-32-32v-6.4c0-19.2 12.8-32 32-32h288c19.2 0 32 12.8 32 38.4zM780.8 384c0 19.2-12.8 32-32 32H320c-19.2-6.4-38.4-19.2-38.4-32v-6.4c0-19.2 12.8-32 32-32h428.8c25.6 0 38.4 12.8 38.4 38.4z m0-172.8c0 19.2-12.8 32-32 32H320c-19.2 0-32-12.8-32-32v-6.4c0-19.2 12.8-32 32-32h428.8c19.2 0 32 12.8 32 38.4z" fill="#8a8a8a"/>
                    <path d="M716.8 851.2v89.6c0 32 38.4 44.8 57.6 25.6l128-128c19.2-19.2 6.4-57.6-25.6-57.6h-89.6c-38.4 0-70.4 32-70.4 70.4z" fill="#8a8a8a"/>
                  </svg>
                  `
              }
              <span class="name">${file.name || "未命名"}</span>
            </div>
            ${
              file.type === "folder"
                ? `<div class="children" style="display: ${
                    hasChildren ? "block" : "none"
                  }">
                    ${
                      hasChildren
                        ? renderFileTree(file.children, indentLevel + 1)
                        : ""
                    }
                  </div>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  };

  // 转义 HTML 字符
  const escapeHtml = (str) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // 文件树事件（展开/折叠、右键菜单、点击打开文件）
  const attachFileTreeEvents = () => {
    document
      .querySelectorAll(".document-item.folder .message .arrow")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const folder = item.closest(".document-item.folder");
          const children = folder.querySelector(".children");

          if (!children) {
            console.warn("文件夹没有 .children 元素:", folder);
            return;
          }

          if (children.style.display === "block") {
            children.style.display = "none";
            item.textContent = "▶";
          } else {
            children.style.display = "block";
            item.textContent = "▼";
          }
        });
      });

    // 右键菜单;
    document.querySelectorAll(".document-item").forEach((item) => {
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fileId = item.dataset.fileId;
        const type = item.classList.contains("folder") ? "folder" : "file";

        let contextMenu = document.createElement("div");
        contextMenu.className = "context-menu";
        contextMenu.style.position = "absolute";
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.style.background = "white";
        contextMenu.style.border = "1px solid #ddd";
        contextMenu.style.padding = "5px";
        contextMenu.style.zIndex = "1000";

        contextMenu.innerHTML = `
          <div class="menu-item" data-action="add-file">添加文件</div>
          <div class="menu-item" data-action="add-folder">添加文件夹</div>
          <div class="menu-item" data-action="delete">删除</div>
        `;

        document.body.appendChild(contextMenu);

        contextMenu.addEventListener("click", async (event) => {
          const action = event.target.dataset.action;
          if (action === "add-file" || action === "add-folder") {
            const name = prompt(
              `请输入${action === "add-file" ? "文件" : "文件夹"}名称`
            );
            if (name) {
              try {
                const response = await fetch(
                  "http://localhost:3000/files/add",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      projectId,
                      branchId: currentBranchId,
                      parentId: type === "folder" ? fileId : null,
                      name,
                      type: action === "add-file" ? "file" : "folder",
                    }),
                  }
                );
                const result = await response.json();
                if (result.success) {
                  loadFiles();
                }
              } catch (error) {
                console.error("添加失败:", error);
              }
            }
          } else if (action === "delete") {
            if (confirm("确定删除吗？")) {
              try {
                const response = await fetch(
                  `http://localhost:3000/files/delete/${fileId}`,
                  {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                const result = await response.json();
                if (result.success) {
                  loadFiles();
                  if (currentFileId === parseInt(fileId)) {
                    clearEditor();
                  }
                }
              } catch (error) {
                console.error("删除失败:", error);
              }
            }
          }
          contextMenu.remove();
        });

        document.addEventListener("click", () => contextMenu.remove(), {
          once: true,
        });
      });
    });
    // 文件点击事件：打开编辑
    document
      .querySelectorAll(
        ".main .main-contain > [data-box='work'] > .nav .top .document-item.file"
      )
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation(); // 防止冒泡到父文件夹
          // console.log("点击文件，打开编辑:", item.dataset.fileId); // 添加日志
          document.querySelector(
            ".main .main-contain > [data-box='work'] > .edit .tip"
          ).innerHTML = "未保存";
          currentFileId = parseInt(item.dataset.fileId);
          const name = item.querySelector(".name").textContent;
          const content = item.dataset.content || "";
          const editor = document.querySelector(".edit");
          editor.querySelector("input").value = name;
          editor.querySelector("textarea").value = content;
        });
      });
  };

  // 清除编辑器
  const clearEditor = () => {
    currentFileId = null;
    const editor = document.querySelector(".edit");
    editor.querySelector("input").value = "";
    editor.querySelector("textarea").value = "";
  };

  // 实时保存文件
  const titleInput = document.querySelector(".edit input");
  const contentTextarea = document.querySelector(".edit textarea");

  const saveFile = async () => {
    if (!currentFileId) return;

    const content = contentTextarea.value;
    try {
      const response = await fetch(`${API_BASE_URL}/files/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId: currentFileId, content }),
      });
      const result = await response.json();
      if (result.success) {
        console.log("文件已保存");
        document.querySelector(
          ".main .main-contain > [data-box='work'] > .edit .tip"
        ).innerHTML = "文件已保存";

        // 更新文件树
        const fileElement = document.querySelector(
          `.document-item.file[data-file-id="${currentFileId}"]`
        );
        if (fileElement) {
          fileElement.dataset.content = content;
          console.log(
            `更新 data-content: fileId=${currentFileId}, content=${content}`
          );
        } else {
          console.warn(`未找到文件元素: fileId=${currentFileId}`);
        }
      }
    } catch (error) {
      console.error("保存文件失败:", error);
    }
  };

  contentTextarea.addEventListener("input", () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveFile, 2000);
  });

  // 删除文件（编辑区）
  document
    .querySelector(
      ".main .main-contain > [data-box='work'] > .edit .head .icon:first-child"
    )
    .addEventListener("click", async () => {
      if (!currentFileId) return;
      if (confirm("确定删除当前文件吗？")) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/files/delete/${currentFileId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const result = await response.json();
          if (result.success) {
            loadFiles();
            clearEditor();
          }
        } catch (error) {
          console.error("删除文件失败:", error);
        }
      }
    });

  // 提交（上传）
  document
    .querySelector(
      ".main .main-contain > [data-box='work'] > .nav .commit-record .icon-list .icon:first-child"
    )
    .addEventListener("click", async () => {
      const description =
        document.querySelector(".edit textarea").value || "提交更新";
      try {
        const response = await fetch(`${API_BASE_URL}/files/commit`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            branchId: currentBranchId,
            userId,
            description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          alert("提交成功");
          loadCommits();
        }
      } catch (error) {
        console.error("提交失败:", error);
      }
    });

  // 加载提交记录
  const recordBox = document.querySelector(".commit-record .record-box");
  const loadCommits = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/commits?projectId=${projectId}&branchId=${currentBranchId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        recordBox.innerHTML = result.commits
          .map(
            (commit) => `
              <div class="item" data-version-id="${commit.id}">
                <div class="title">${commit.version_number}: ${commit.description}</div>
                <div class="status">
                  <div class="circle" style="border: 2px solid #007bff"></div>
                </div>
              </div>
            `
          )
          .join("");
        attachCommitEvents();
      }
    } catch (error) {
      console.error("加载提交记录失败:", error);
    }
  };

  // 提交记录事件
  const attachCommitEvents = () => {
    document
      .querySelectorAll(".commit-record .record-box .item")
      .forEach((item) => {
        item.addEventListener("click", () => {
          document
            .querySelectorAll(".commit-record .record-box .item")
            .forEach((i) => {
              i.classList.remove("active");
            });
          item.classList.add("active");
        });
      });
  };

  // 拉取历史版本
  document
    .querySelector(".commit-record .icon:last-child")
    .addEventListener("click", async () => {
      const activeItem = document.querySelector(
        ".commit-record .record-box .item.active"
      );
      if (!activeItem) {
        alert("请选择一个版本");
        return;
      }

      const versionId = parseInt(activeItem.dataset.versionId);
      try {
        const response = await fetch(
          `${API_BASE_URL}/files/version/${versionId}?projectId=${projectId}&branchId=${currentBranchId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const result = await response.json();
        console.log("拉取历史版本结果:", result);
        if (result.success) {
          alert("历史版本已拉取");
          documentContainer.innerHTML = renderFileTree(result.files, 0);
          attachFileTreeEvents();
          clearEditor();
        }
      } catch (error) {
        console.error("拉取历史版本失败:", error);
      }
    });

  // 初始加载
  loadBranches();
}

// 不自动执行，等待 item.js 调用
// document.addEventListener("DOMContentLoaded", () => {
//   initFileWorkspace();
// });

// const urlParams = new URLSearchParams(window.location.search);
// const projectId = urlParams.get("id");

// 绑定点击事件
const generateReportBtn = document.getElementById("generate-report-btn");
generateReportBtn.addEventListener("click", async () => {
  try {
    // 获取 DOM 元素
    const reportContainer = document.getElementById("report-container");
    const reportContent = document.getElementById("report-content");
    const reportLoading = document.getElementById("report-loading");

    // 确保元素存在
    if (!reportContainer || !reportContent || !reportLoading) {
      throw new Error("页面元素缺失，请检查 HTML 结构");
    }

    // 显示加载提示
    reportContent.textContent = "正在生成报告，请稍候...";
    reportContainer.classList.remove("visible");
    reportLoading.classList.add("visible");
    generateReportBtn.style.display = "none";

    const response = await fetch(
      `${API_BASE_URL}/project/generate-report/${projectId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("token") || "your-token"
          }`, // 确保 token 正确
        },
      }
    );

    if (!response.ok) {
      throw new Error(`请求失败，状态码: ${response.status}`);
    }

    const result = await response.json();

    // 隐藏加载提示
    reportLoading.classList.remove("visible");
    generateReportBtn.style.display = "block";

    if (result.success) {
      // 显示报告
      reportContainer.classList.add("visible");
      reportContainer.style.display = "flex";
      reportContent.textContent = result.report;
    } else {
      reportContent.textContent = "生成报告失败：" + result.error;
      reportContainer.classList.add("visible");
    }
  } catch (error) {
    console.error("生成报告失败:", error);
    const reportContent = document.getElementById("report-content");
    const reportLoading = document.getElementById("report-loading");
    const generateReportBtn = document.getElementById("generate-report-btn");

    if (reportContent) {
      reportContent.textContent = "生成报告时出错：" + error.message;
    }
    if (reportLoading) {
      reportLoading.classList.remove("visible");
    }
    if (generateReportBtn) {
      generateReportBtn.style.display = "block";
    }
    if (reportContent && reportContent.parentElement) {
      reportContent.parentElement.classList.add("visible");
    }
  }
});
