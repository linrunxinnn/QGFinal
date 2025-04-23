let tasks = [];
let groups = [];
// let users = [];
let isAdmin = false;

function initTasks() {
  const taskSection = document.querySelector(
    '.main .main-contain > .item[data-box="program"]'
  );
  if (!taskSection) {
    console.error("任务页面未找到");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const userId = urlParams.get("userId");

  if (!projectId || !userId) {
    taskSection.innerHTML = `<div class="error">错误：未提供项目ID或用户ID</div>`;
    return;
  }

  // 获取数据
  Promise.all([
    // 用户角色
    fetch(`http://localhost:3000/project/members/${projectId}/role`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`获取用户角色失败: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error || "获取用户角色失败");
        isAdmin = data.role === "creator";
      })
      .catch((error) => {
        console.error("获取用户角色失败:", error);
        return null;
      }),
    // 任务
    fetch(`http://localhost:3000/program/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`获取任务失败: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error || "获取任务失败");
        tasks = data.tasks || [];
      })
      .catch((error) => {
        console.error("获取任务失败:", error);
        tasks = [];
        taskSection.innerHTML += `<div class="error">无法加载任务数据：${error.message}</div>`;
        return null;
      }),
    // 小组
    fetch(`http://localhost:3000/program/groups/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`获取小组失败: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error || "获取小组失败");
        groups = data.groups || [];
      })
      .catch((error) => {
        console.error("获取小组失败:", error);
        groups = [];
        taskSection.innerHTML += `<div class="error">无法加载小组数据：${error.message}</div>`;
        return null;
      }),
    // 成员
    fetch(`http://localhost:3000/project/members/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`获取成员失败: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error || "获取成员失败");
        users = data.members || [];
      })
      .catch((error) => {
        console.error("获取成员失败:", error);
        users = [];
        return null;
      }),
  ])
    .then(() => {
      renderTasks();
      initAddTaskForm();
      initSearch();
    })
    .catch((error) => {
      console.error("初始化任务页面失败:", error);
      taskSection.innerHTML = `<div class="error">加载失败：部分数据不可用</div>`;
      renderTasks();
    });
}

// 渲染任务列表
function renderTasks() {
  // console.log("渲染任务列表...");
  const taskSection = document.querySelector(
    '.main .main-contain > .item[data-box="program"]'
  );
  if (!taskSection) {
    console.error("任务页面未找到，无法渲染任务");
    return;
  }

  const statusLists = {
    wait: taskSection.querySelector(
      '.program-list[data-status="wait"] .item-list'
    ),
    doing: taskSection.querySelector(
      '.program-list[data-status="doing"] .item-list'
    ),
    over: taskSection.querySelector(
      '.program-list[data-status="over"] .item-list'
    ),
  };

  // 检查所有状态的任务列表是否存在
  const missingLists = Object.entries(statusLists).filter(
    ([status, list]) => !list
  );
  if (missingLists.length > 0) {
    console.error(
      "以下状态的任务列表未找到：",
      missingLists.map(([status]) => status)
    );
    taskSection.innerHTML = `<div class="error">页面结构错误：缺少 ${missingLists
      .map(([status]) => status)
      .join(", ")} 任务列表</div>`;
    return;
  }

  // 检查数量显示元素是否存在
  const countElements = {
    wait: taskSection.querySelector(
      '.program-list[data-status="wait"] .item-num'
    ),
    doing: taskSection.querySelector(
      '.program-list[data-status="doing"] .item-num'
    ),
    over: taskSection.querySelector(
      '.program-list[data-status="over"] .item-num'
    ),
  };
  const missingCounts = Object.entries(countElements).filter(
    ([status, element]) => !element
  );
  if (missingCounts.length > 0) {
    console.error(
      "以下状态的任务数量元素未找到：",
      missingCounts.map(([status]) => status)
    );
    taskSection.innerHTML += `<div class="error">页面结构错误：缺少 ${missingCounts
      .map(([status]) => status)
      .join(", ")} 任务数量元素</div>`;
    return;
  }

  // 清空现有任务
  Object.values(statusLists).forEach((list) => (list.innerHTML = ""));

  // 渲染任务
  const counts = { wait: 0, doing: 0, over: 0 };
  tasks.forEach((task) => {
    counts[task.status]++;
    const taskElement = document.createElement("div");
    taskElement.classList.add("item");
    taskElement.setAttribute("data-task-id", task.id);
    taskElement.innerHTML = `
      <div class="head">
        <div class="circle" style="border: 2px #ced4da dashed;"></div>
        <div class="icon">
          <svg t="1744895638965" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2522" width="20" height="20">
            <path d="M97.95349285 509.99901215m-94.17807172 0a94.17807171 94.17807171 0 1 0 188.35614346 0 94.17807171 94.17807171 0 1 0-188.35614346 0Z" fill="#bfbfbf" p-id="2523"></path>
            <path d="M510.81520458 509.99901215m-94.17807172 0a94.17807171 94.17807171 0 1 0 188.35614344 0 94.17807171 94.17807171 0 1 0-188.35614344 0Z" fill="#bfbfbf" p-id="2524"></path>
            <path d="M923.6769163 509.99901215m-94.17807172 0a94.17807171 94.17807171 0 1 0 188.35614343 0 94.17807171 94.17807171 0 1 0-188.35614343 0Z" fill="#bfbfbf" p-id="2525"></path>
          </svg>
        </div>
        <div class="drop-down" style="display: none;">
          <div class="item doing">
            <svg t="1744897910864" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6703" width="23" height="23">
              <path d="M704.13 576.11c42.74 0 82.92 16.64 113.14 46.86s46.86 70.4 46.86 113.14-16.64 82.92-46.86 113.14-70.4 46.86-113.14 46.86-82.91-16.65-113.13-46.87-46.86-70.4-46.86-113.14 16.64-82.92 46.86-113.14c30.22-30.21 70.39-46.85 113.13-46.85m0-64c-123.71 0-224 100.29-224 224s100.29 224 224 224 224-100.29 224-224-100.29-224-224-224zM641.01 223.5h-362c-17.67 0-32 14.33-32 32s14.33 32 32 32h362c17.67 0 32-14.33 32-32s-14.33-32-32-32zM542.77 400.75H279.01c-17.67 0-32 14.33-32 32s14.33 32 32 32h263.76c17.67 0 32-14.33 32-32s-14.33-32-32-32zM369.76 578h-90.75c-17.67 0-32 14.33-32 32s14.33 32 32 32h90.75c17.67 0 32-14.33 32-32s-14.33-32-32-32z" p-id="6704" fill="#8a8a8a"></path>
              <path d="M411.42 960h-198.4c-61.76 0-112-50.24-112-112V176c0-61.76 50.24-112 112-112H707c61.76 0 112 50.24 112 112v242.21c0 17.67-14.33 32-32 32s-32-14.33-32-32V176c0-26.47-21.53-48-48-48H213.02c-26.47 0-48 21.53-48 48v672c0 26.47 21.53 48 48 48h198.4c17.67 0 32 14.33 32 32s-14.33 32-32 32z" p-id="6705" fill="#8a8a8a"></path>
              <path d="M794 804h-93c-28.67 0-52-23.33-52-52v-96c0-17.67 14.33-32 32-32s32 14.33 32 32v84h81c17.67 0 32 14.33 32 32s-14.33 32-32 32z" p-id="6706" fill="#8a8a8a"></path>
            </svg>
            <span>移动到进行中</span>
          </div>
          <div class="item over">
            <svg t="1744897970047" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8118" width="20" height="20">
              <path d="M372.893538 1024H94.523077a94.523077 94.523077 0 0 1-94.523077-94.523077V94.523077a94.523077 94.523077 0 0 1 94.523077-94.523077h693.169231a94.523077 94.523077 0 0 1 94.523077 94.523077v236.307692a31.507692 31.507692 0 0 1-63.015385 0V94.523077a31.507692 31.507692 0 0 0-31.507692-31.507692H94.523077a31.507692 31.507692 0 0 0-31.507692 31.507692v834.953846a31.507692 31.507692 0 0 0 31.507692 31.507692h278.370461a31.507692 31.507692 0 0 1 0 63.015385z" fill="#8a8a8a" p-id="8119"></path>
              <path d="M661.661538 283.569231H173.292308a31.507692 31.507692 0 0 1 0-63.015385h488.36923a31.507692 31.507692 0 0 1 0 63.015385zM330.830769 519.876923H173.292308a31.507692 31.507692 0 0 1 0-63.015385h157.538461a31.507692 31.507692 0 0 1 0 63.015385zM267.815385 756.184615h-94.523077a31.507692 31.507692 0 0 1 0-63.015384h94.523077a31.507692 31.507692 0 0 1 0 63.015384zM708.923077 1024a315.076923 315.076923 0 1 1 315.076923-315.076923 315.076923 315.076923 0 0 1-315.076923 315.076923z m0-567.138462a252.061538 252.061538 0 1 0 252.061538 252.061539 252.061538 252.061538 0 0 0-252.061538-252.061539z" fill="#8a8a8a" p-id="8120"></path>
              <path d="M693.169231 850.707692a31.507692 31.507692 0 0 1-22.212923-9.294769l-110.276923-110.276923a31.507692 31.507692 0 0 1 44.425846-44.425846L693.169231 774.616615l158.956307-158.798769a31.507692 31.507692 0 0 1 44.425847 44.425846l-181.169231 181.169231A31.507692 31.507692 0 0 1 693.169231 850.707692z" fill="#8a8a8a" p-id="8121"></path>
            </svg>
            <span>移动到已完成</span>
          </div>
          <div class="item remove">
            <svg t="1744897816015" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3786" width="20" height="20">
              <path d="M799.2 874.4c0 34.4-28.001 62.4-62.4 62.4H287.2c-34.4 0-62.4-28-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.8 5.6 12.8 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48.001-39.2-87.2-87.2-87.2h-300c-48 0-87.2 39.199-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6c0 76 61.6 137.6 137.6 137.6h449.6c76 0 137.6-61.6 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6" fill="#8a8a8a" p-id="3787"></path>
            </svg>
            <span>删除</span>
          </div>
        </div>
      </div>
      <div class="title">${task.title}</div>
      <div class="message-box">
        <div class="message">${task.description || "无描述"}</div>
        <div class="deadline">ddl:${
          task.due_date
            ? new Date(task.due_date).toISOString().split("T")[0]
            : "未设置"
        }</div>
      </div>
    `;
    statusLists[task.status].appendChild(taskElement);
  });

  // 更新数量显示
  countElements.wait.textContent = counts.wait;
  countElements.doing.textContent = counts.doing;
  countElements.over.textContent = counts.over;

  // 绑定事件：显示/隐藏下拉菜单
  document
    .querySelectorAll(
      ".main .main-contain > [data-box='program'] .program-box .program-list .item-list .item .head > .icon"
    )
    .forEach((icon) => {
      icon.addEventListener("click", (e) => {
        console.log("点击了图标");
        const dropdown = e.target
          .closest(".item")
          .querySelector(".head .drop-down");
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
        //点击其他地方关闭下拉菜单
        document.addEventListener("click", (event) => {
          if (
            !dropdown.contains(event.target) &&
            !icon.contains(event.target)
          ) {
            dropdown.style.display = "none";
          }
        });
        // 阻止事件冒泡，避免点击下拉菜单时触发关闭事件
        e.stopPropagation();
      });
    });

  // 绑定事件：移动任务状态
  document
    .querySelectorAll(
      ".main .main-contain > [data-box='program'] .program-box .program-list .item-list .drop-down .item.doing"
    )
    .forEach((item) => {
      item.addEventListener("click", async (e) => {
        //对应的dropdown关闭
        const dropdown = e.target.closest(".drop-down");
        dropdown.style.display = "none";
        const taskId = e.target.closest(".item[data-task-id]").dataset.taskId;
        await updateTaskStatus(taskId, "doing");
      });
    });
  document
    .querySelectorAll(
      ".main .main-contain > [data-box='program'] .program-box .program-list .item-list .drop-down .item.over"
    )
    .forEach((item) => {
      item.addEventListener("click", async (e) => {
        const taskId = e.target.closest(".item[data-task-id]").dataset.taskId;
        console.log(taskId);
        await updateTaskStatus(taskId, "over");
      });
    });

  // 绑定事件：删除任务
  document
    .querySelectorAll(
      ".main .main-contain > [data-box='program'] .program-box .program-list .item-list .drop-down .item.remove"
    )
    .forEach((item) => {
      item.addEventListener("click", async (e) => {
        const taskId = e.target.closest(".item[data-task-id]").dataset.taskId;
        await deleteTask(taskId);
      });
    });
}

// 全局变量，用于存储事件监听器
let addTaskHandler = null;
// 防抖函数，避免快速点击
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
// 初始化添加任务表单
function initAddTaskForm() {
  const taskSection = document.querySelector(
    '.main .main-contain > .item[data-box="program"]'
  );
  if (!taskSection) {
    console.error("无法找到任务页面元素，无法初始化添加任务表单");
    return;
  }

  const addProgramSection = taskSection.querySelector(".add-program");
  if (!addProgramSection) {
    console.error("无法找到添加任务表单 '.add-program'");
    return;
  }

  const groupSelect = addProgramSection.querySelector("#group");
  const managerSelect = addProgramSection.querySelector("#manager");

  // 填充小组和负责人选项
  groupSelect.innerHTML = groups.length
    ? groups
        .map((group) => `<option value="${group.id}">${group.name}</option>`)
        .join("")
    : '<option value="">无小组</option>';
  managerSelect.innerHTML = users.length
    ? users
        .map((user) => `<option value="${user.id}">${user.name}</option>`)
        .join("")
    : '<option value="">无成员</option>';

  if (isAdmin) {
    taskSection
      .querySelectorAll(".program-list .add-icon")
      .forEach((addIcon) => {
        addIcon.addEventListener("click", (e) => {
          const programList = e.target.closest(".program-list");
          if (!programList) {
            console.error("无法找到 .program-list 元素");
            return;
          }
          const status = programList.dataset.status;
          if (!status) {
            console.error("无法获取 program-list 的 data-status 属性");
            return;
          }
          addProgramSection.querySelector("#status").value = status;
          addProgramSection.style.display = "flex";
          document.querySelector(".overlay").style.display = "block";
          addProgramSection.querySelector("#programName").focus();
          // 点击遮罩层关闭弹窗
          document.querySelector(".overlay").addEventListener("click", () => {
            addProgramSection.style.display = "none";
            document.querySelector(".overlay").style.display = "none";
            addProgramSection.querySelector("#programName").value = "";
            addProgramSection.querySelector("#programMessage").value = "";
          });
        });
      });

    // 移除旧的事件监听器并添加新监听器
    const addButton = addProgramSection.querySelector(".add-icon");
    if (addTaskHandler) {
      addButton.removeEventListener("click", addTaskHandler);
    }

    addTaskHandler = debounce(async () => {
      const projectId = new URLSearchParams(window.location.search).get("id");
      const status = addProgramSection.querySelector("#status").value;
      const groupId = addProgramSection.querySelector("#group").value;
      const title = addProgramSection.querySelector("#programName").value;
      const description =
        addProgramSection.querySelector("#programMessage").value;
      const assignedTo = addProgramSection.querySelector("#manager").value;
      const dueDate = addProgramSection.querySelector("#deadline").value;
      if (!title || !assignedTo) {
        alert("任务名称和负责人是必填的");
        return;
      }

      try {
        const [createResponse] = await Promise.all([
          fetch(`http://localhost:3000/program/create`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              projectId,
              title,
              description,
              status,
              groupId,
              assignedTo,
              dueDate,
            }),
          }).then((response) => response.json()),
        ]);

        if (!createResponse.success) {
          throw new Error(createResponse.error || "创建任务失败");
        }

        // 重新加载任务
        const taskResponse = await fetch(
          `http://localhost:3000/program/${projectId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );
        const taskData = await taskResponse.json();
        if (taskData.success) {
          tasks = taskData.tasks || [];
          renderTasks();
        }

        // 清空表单并隐藏
        addProgramSection.querySelector("#programName").value = "";
        addProgramSection.querySelector("#programMessage").value = "";
        addProgramSection.querySelector("#deadline").value = "";
        addProgramSection.style.display = "none";
        document.querySelector(".overlay").style.display = "none";
      } catch (error) {
        console.error("创建任务失败:", error);
        alert("创建任务失败：" + error.message);
      }
    }, 500); // 防抖 500ms

    addButton.addEventListener("click", addTaskHandler);
  } else {
    taskSection.querySelectorAll(".add-icon").forEach((addIcon) => {
      addIcon.style.display = "none";
    });
  }
}

// 更新任务状态
async function updateTaskStatus(taskId, newStatus) {
  const projectId = new URLSearchParams(window.location.search).get("id");

  try {
    const response = await fetch(
      `http://localhost:3000/program/${taskId}/status?projectId=${projectId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus, projectId: projectId }),
      }
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "更新任务状态失败");
    }

    // 重新加载任务
    const taskResponse = await fetch(
      `http://localhost:3000/program/${projectId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );
    const taskData = await taskResponse.json();
    if (taskData.success) {
      tasks = taskData.tasks || [];
      renderTasks();
    }
  } catch (error) {
    console.error("更新任务状态失败:", error);
    alert("更新任务状态失败：" + error.message);
  }
}

// 删除任务
async function deleteTask(taskId) {
  const projectId = new URLSearchParams(window.location.search).get("id");

  try {
    const response = await fetch(
      `http://localhost:3000/program/${projectId}/${taskId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "删除任务失败");
    }

    // 重新加载任务
    const taskResponse = await fetch(
      `http://localhost:3000/program/${projectId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );
    const taskData = await taskResponse.json();
    if (taskData.success) {
      tasks = taskData.tasks || [];
      renderTasks();
    }
  } catch (error) {
    console.error("删除任务失败:", error);
    alert("删除任务失败：" + error.message);
  }
}

// 初始化搜索功能
function initSearch() {
  const searchInput = document.querySelector(
    '.input-box input[placeholder="搜索任务"]'
  );
  const searchButton = document.querySelector(".search-button");

  searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredTasks = tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm))
    );

    tasks = filteredTasks;
    renderTasks();

    // 清空搜索框后恢复所有任务
    searchInput.addEventListener("input", () => {
      if (!searchInput.value) {
        initTasks();
      }
    });
  });
}

initTasks();
