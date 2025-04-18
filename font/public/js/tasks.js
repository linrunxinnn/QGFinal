let tasks = [];
let groups = [];
// let users = [];
let isAdmin = false;

function initTasks() {
  const taskSection = document.querySelector('.item[data-box="program"]');
  if (!taskSection) {
    console.error("任务页面未找到");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  // 获取用户角色、任务、小组和成员数据
  Promise.all([
    // 检查用户角色
    fetch(`http://localhost:3000/project/members/${projectId}/role`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error("获取用户角色失败");
        isAdmin = data.role === "creator";
      }),
    // 获取任务
    fetch(`http://localhost:3000/tasks/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error("获取任务失败");
        tasks = data.tasks || [];
      }),
    // 获取小组
    fetch(`http://localhost:3000/groups/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error("获取小组失败");
        groups = data.groups || [];
      }),
    // 获取项目成员
    fetch(`http://localhost:3000/project/members/${projectId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error("获取成员失败");
        users = data.members || [];
      }),
  ])
    .then(() => {
      renderTasks();
      initAddTaskForm();
    })
    .catch((error) => {
      console.error("初始化任务页面失败:", error);
      taskSection.innerHTML += `<div class="error">加载失败：${error.message}</div>`;
    });
}

// 渲染任务列表
function renderTasks() {
  const taskSection = document.querySelector('.item[data-box="program"]');
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

  // 清空现有任务
  Object.values(statusLists).forEach((list) => (list.innerHTML = ""));

  // 统计任务数量
  const counts = { wait: 0, doing: 0, over: 0 };
  tasks.forEach((task) => {
    counts[task.status]++;
    const taskElement = document.createElement("div");
    taskElement.className = "item";
    taskElement.dataset.taskId = task.id;
    taskElement.innerHTML = `
      <div class="head">
        <div class="circle" style="border: 2px #ced4da dashed;"></div>
        <div class="icon">
          <svg t="1744895638965" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2522" width="20" height="20"><path d="M97.95349285 509.99901215m-94.17807172 0a94.17807171 94.17807171 0 1 0 188.35614346 0 94.17807171 94.17807171 0 1 0-188.35614346 0Z" fill="#bfbfbf" p-id="2523"></path><path d="M510.81520458 509.99901215m-94.17807172 0a94.17807171 94.17807171 0 1 0 188.35614344 0 94.17807171 94.17807171 0 1 0-188.35614344 0Z" fill="#bfbfbf" p-id="2524"></path><path d="M923.6769163 509.99901215m-94.17807172 0a94.17807171 94.17807171 0 1 0 188.35614343 0 94.17807171 94.17807171 0 1 0-188.35614343 0Z" fill="#bfbfbf" p-id="2525"></path></svg>
        </div>
        <div class="drop-down" style="display: none;">
          ${
            task.status !== "wait"
              ? `
              <div class="item wait">
                <svg t="1744897910864" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6703" width="23" height="23"><path d="M704.13 576.11c42.74 0 82.92 16.64 113.14 46.86s46.86 70.4 46.86 113.14-16.64 82.92-46.86 113.14-70.4 46.86-113.14 46.86-82.91-16.65-113.13-46.87-46.86-70.4-46.86-113.14 16.64-82.92 46.86-113.14c30.22-30.21 70.39-46.85 113.13-46.85m0-64c-123.71 0-224 100.29-224 224s100.29 224 224 224 224-100.29 224-224-100.29-224-224-224zM641.01 223.5h-362c-17.67 0-32 14.33-32 32s14.33 32 32 32h362c17.67 0 32-14.33 32-32s-14.33-32-32-32zM542.77 400.75H279.01c-17.67 0-32 14.33-32 32s14.33 32 32 32h263.76c17.67 0 32-14.33 32-32s-14.33-32-32-32zM369.76 578h-90.75c-17.67 0-32 14.33-32 32s14.33 32 32 32h90.75c17.67 0 32-14.33 32-32s-14.33-32-32-32z" p-id="6704" fill="#8a8a8a"></path><path d="M411.42 960h-198.4c-61.76 0-112-50.24-112-112V176c0-61.76 50.24-112 112-112H707c61.76 0 112 50.24 112 112v242.21c0 17.67-14.33 32-32 32s-32-14.33-32-32V176c0-26.47-21.53-48-48-48H213.02c-26.47 0-48 21.53-48 48v672c0 26.47 21.53 48 48 48h198.4c17.67 0 32 14.33 32 32s-14.33 32-32 32z" p-id="6705" fill="#8a8a8a"></path><path d="M794 804h-93c-28.67 0-52-23.33-52-52v-96c0-17.67 14.33-32 32-32s32 14.33 32 32v84h81c17.67 0 32 14.33 32 32s-14.33 32-32 32z" p-id="6706" fill="#8a8a8a"></path></svg>
                <span>移动到待处理</span>
              </div>
              `
              : ""
          }
          ${
            task.status !== "doing"
              ? `
              <div class="item doing">
                <svg t="1744897910864" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6703" width="23" height="23"><path d="M704.13 576.11c42.74 0 82.92 16.64 113.14 46.86s46.86 70.4 46.86 113.14-16.64 82.92-46.86 113.14-70.4 46.86-113.14 46.86-82.91-16.65-113.13-46.87-46.86-70.4-46.86-113.14 16.64-82.92 46.86-113.14c30.22-30.21 70.39-46.85 113.13-46.85m0-64c-123.71 0-224 100.29-224 224s100.29 224 224 224 224-100.29 224-224-100.29-224-224-224zM641.01 223.5h-362c-17.67 0-32 14.33-32 32s14.33 32 32 32h362c17.67 0 32-14.33 32-32s-14.33-32-32-32zM542.77 400.75H279.01c-17.67 0-32 14.33-32 32s14.33 32 32 32h263.76c17.67 0 32-14.33 32-32s-14.33-32-32-32zM369.76 578h-90.75c-17.67 0-32 14.33-32 32s14.33 32 32 32h90.75c17.67 0 32-14.33 32-32s-14.33-32-32-32z" p-id="6704" fill="#8a8a8a"></path><path d="M411.42 960h-198.4c-61.76 0-112-50.24-112-112V176c0-61.76 50.24-112 112-112H707c61.76 0 112 50.24 112 112v242.21c0 17.67-14.33 32-32 32s-32-14.33-32-32V176c0-26.47-21.53-48-48-48H213.02c-26.47 0-48 21.53-48 48v672c0 26.47 21.53 48 48 48h198.4c17.67 0 32 14.33 32 32s-14.33 32-32 32z" p-id="6705" fill="#8a8a8a"></path><path d="M794 804h-93c-28.67 0-52-23.33-52-52v-96c0-17.67 14.33-32 32-32s32 14.33 32 32v84h81c17.67 0 32 14.33 32 32s-14.33 32-32 32z" p-id="6706" fill="#8a8a8a"></path></svg>
                <span>移动到进行中</span>
              </div>
              `
              : ""
          }
          ${
            task.status !== "over"
              ? `
              <div class="item over">
                <svg t="1744897970047" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8118" width="20" height="20"><path d="M372.893538 1024H94.523077a94.523077 94.523077 0 0 1-94.523077-94.523077V94.523077a94.523077 94.523077 0 0 1 94.523077-94.523077h693.169231a94.523077 94.523077 0 0 1 94.523077 94.523077v236.307692a31.507692 31.507692 0 0 1-63.015385 0V94.523077a31.507692 31.507692 0 0 0-31.507692-31.507692H94.523077a31.507692 31.507692 0 0 0-31.507692 31.507692v834.953846a31.507692 31.507692 0 0 0 31.507692 31.507692h278.370461a31.507692 31.507692 0 0 1 0 63.015385z" fill="#8a8a8a" p-id="8119"></path><path d="M661.661538 283.569231H173.292308a31.507692 31.507692 0 0 1 0-63.015385h488.36923a31.507692 31.507692 0 0 1 0 63.015385zM330.830769 519.876923H173.292308a31.507692 31.507692 0 0 1 0-63.015385h157.538461a31.507692 31.507692 0 0 1 0 63.015385zM267.815385 756.184615h-94.523077a31.507692 31.507692 0 0 1 0-63.015384h94.523077a31.507692 31.507692 0 0 1 0 63.015384zM708.923077 1024a315.076923 315.076923 0 1 1 315.076923-315.076923 315.076923 315.076923 0 0 1-315.076923 315.076923z m0-567.138462a252.061538 252.061538 0 1 0 252.061538 252.061539 252.061538 252.061538 0 0 0-252.061538-252.061539z" fill="#8a8a8a" p-id="8120"></path><path d="M693.169231 850.707692a31.507692 31.507692 0 0 1-22.212923-9.294769l-110.276923-110.276923a31.507692 31.507692 0 0 1 44.425846-44.425846L693.169231 774.616615l158.956307-158.798769a31.507692 31.507692 0 0 1 44.425847 44.425846l-181.169231 181.169231A31.507692 31.507692 0 0 1 693.169231 850.707692z" fill="#8a8a8a" p-id="8121"></path></svg>
                <span>移动到已完成</span>
              </div>
              `
              : ""
          }
          ${
            isAdmin
              ? `
              <div class="item remove">
                <svg t="1744897816015" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3786" width="20" height="20"><path d="M799.2 874.4c0 34.4-28.001 62.4-62.4 62.4H287.2c-34.4 0-62.4-28-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.8 5.6 12.8 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48.001-39.2-87.2-87.2-87.2h-300c-48 0-87.2 39.199-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6c0 76 61.6 137.6 137.6 137.6h449.6c76 0 137.6-61.6 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v-400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6" fill="#8a8a8a" p-id="3787"></path></svg>
                <span>删除</span>
              </div>
              `
              : ""
          }
        </div>
      </div>
      <div class="title">${task.title}</div>
      <div class="message-box">
        <div class="message">${task.description || "无描述"}</div>
        <div class="time">${
          task.due_date
            ? new Date(task.due_date).toLocaleDateString()
            : "无截止日期"
        }</div>
      </div>
    `;
    statusLists[task.status].appendChild(taskElement);
  });

  // 更新任务数量
  taskSection.querySelector(
    '.program-list[data-status="wait"] .item-num'
  ).textContent = counts.wait;
  taskSection.querySelector(
    '.program-list[data-status="doing"] .item-num'
  ).textContent = counts.doing;
  taskSection.querySelector(
    '.program-list[data-status="over"] .item-num'
  ).textContent = counts.over;

  // 初始化交互
  initTaskInteractions();
}

// 初始化任务交互（状态切换、删除）
function initTaskInteractions() {
  const taskSection = document.querySelector('.item[data-box="program"]');

  // 下拉菜单显示/隐藏
  taskSection.querySelectorAll(".item .icon").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = icon.nextElementSibling;
      dropdown.style.display =
        dropdown.style.display === "none" ? "block" : "none";
    });
  });

  // 状态切换和删除
  taskSection.querySelectorAll(".item .drop-down .item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      const taskElement = item.closest(".item");
      const taskId = taskElement.dataset.taskId;
      const action = item.classList[1]; // wait, doing, over, remove
      const dropdown = item.closest(".drop-down");

      try {
        if (action === "remove") {
          if (!confirm("确定要删除此任务吗？")) return;
          const response = await fetch(
            `http://localhost:3000/tasks/delete/${taskId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            }
          );
          const data = await response.json();
          if (!data.success) throw new Error(data.error || "删除任务失败");
          tasks = tasks.filter((task) => task.id !== Number(taskId));
        } else {
          const response = await fetch(
            `http://localhost:3000/tasks/update/${taskId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: action }),
            }
          );
          const data = await response.json();
          if (!data.success) throw new Error(data.error || "更新任务状态失败");
          tasks = tasks.map((task) =>
            task.id === Number(taskId) ? { ...task, status: action } : task
          );
        }
        renderTasks();
      } catch (error) {
        console.error("操作失败:", error);
        alert(`操作失败：${error.message}`);
      } finally {
        dropdown.style.display = "none";
      }
    });
  });

  // 点击空白处关闭下拉菜单
  document.addEventListener("click", () => {
    taskSection.querySelectorAll(".drop-down").forEach((dropdown) => {
      dropdown.style.display = "none";
    });
  });
}

// 初始化添加任务表单
function initAddTaskForm() {
  const taskSection = document.querySelector('.item[data-box="program"]');
  const addProgram = taskSection.querySelector(".add-program");
  const addIcons = taskSection.querySelectorAll(".program-list .add-icon");

  if (!isAdmin) {
    // 普通组员隐藏“添加任务”按钮
    addIcons.forEach((icon) => (icon.style.display = "none"));
    return;
  }

  // 点击“+ 添加任务”显示表单
  addIcons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const status = icon.closest(".program-list").dataset.status;
      addProgram.querySelector("#status").value = status;
      addProgram.style.display = "block";
    });
  });

  // 初始化小组和负责人下拉菜单
  const groupSelect = addProgram.querySelector("#group");
  const managerSelect = addProgram.querySelector("#manager");

  // 动态生成小组选项
  groupSelect.innerHTML = groups
    .map((group) => `<option value="${group.id}">${group.name}</option>`)
    .join("");

  // 动态生成负责人选项
  managerSelect.innerHTML = users
    .map((user) => `<option value="${user.id}">${user.name}</option>`)
    .join("");

  // 提交任务
  const addBtn = addProgram.querySelector(".add-icon");
  addBtn.addEventListener("click", async () => {
    const title = addProgram.querySelector("#programName").value.trim();
    const description = addProgram
      .querySelector("#programMessage")
      .value.trim();
    const status = addProgram.querySelector("#status").value;
    const group_id = addProgram.querySelector("#group").value;
    const assigned_to = addProgram.querySelector("#manager").value;
    const due_date = addProgram.querySelector("#deadline").value;

    if (!title) {
      alert("任务名称是必填的！");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");

    try {
      const response = await fetch(`http://localhost:3000/tasks/create`, {
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
          group_id,
          assigned_to,
          due_date,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "添加任务失败");

      // 清空表单
      addProgram.querySelector("#programName").value = "";
      addProgram.querySelector("#programMessage").value = "";
      addProgram.querySelector("#deadline").value = "";
      addProgram.style.display = "none";

      // 重新获取任务
      const tasksResponse = await fetch(
        `http://localhost:3000/tasks/${projectId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      const tasksData = await tasksResponse.json();
      if (!tasksData.success) throw new Error("获取任务失败");
      tasks = tasksData.tasks || [];
      renderTasks();
    } catch (error) {
      console.error("添加任务失败:", error);
      alert(`添加任务失败：${error.message}`);
    }
  });
}

// 初始化页面
document.addEventListener("DOMContentLoaded", initTasks);
