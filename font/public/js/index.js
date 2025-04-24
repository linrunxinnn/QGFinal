function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

token = localStorage.getItem("token");
const urlParams = new URLSearchParams(window.location.search);
const SelfId = urlParams.get("id");
//获取头像
function getSelftImg(id) {
  return fetch(`${API_BASE_URL}/user/getSelfImg?id=${id}`, {
    headers: {
      Authorization: `Bearer ${token}`, // 确保 token 已定义
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP错误: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => data.avatar_url) // 返回 avatar_url
    .catch((error) => {
      console.error("获取头像失败:", error);
      throw error; // 抛出错误以便调用者处理
    });
}
let SelfImg;
getSelftImg(SelfId)
  .then((avatarUrl) => {
    SelfImg = avatarUrl;
    document.querySelector("nav > .head > .img-box img").src = `${SelfImg}`;
    document.querySelector(
      "nav > .head .img-box .drop-down img"
    ).src = `${SelfImg}`;
  })
  .catch((error) => {
    console.error("错误:", error);
  });
//获取名字
function getSelfName(id) {
  return fetch(`${API_BASE_URL}/user/getSelfName?id=${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => data.name)
    .catch((error) => {
      console.error("获取名字失败:", error);
      throw error;
    });
}

getSelfName(SelfId)
  .then((name) => {
    document.querySelector("nav > .head  .name").textContent = `${name}`;
  })
  .catch((error) => {
    console.error("错误:", error);
  });

//socket.io 初始化
const socket = io(`${API_BASE_URL}`, {
  query: { userId: getQueryParam("id") },
});

// nav控制
const navList = document.querySelectorAll("nav > .nav-list .item");
const mainItem = document.querySelectorAll(".main > .main-contain > .item");
navList.forEach((item) => {
  item.addEventListener("click", () => {
    const id = item.dataset.box;
    console.log(id);
    navList.forEach((x) => {
      if (x.dataset.box === id) x.classList.add("active");
      else x.classList.remove("active");
    });
    mainItem.forEach((x) => {
      if (x.dataset.box === id && id === "message") x.style.display = "grid";
      else if (x.dataset.box === id) x.style.display = "flex";
      else x.style.display = "none";
    });
  });
});

//添加好友
// 导航栏添加功能
const navAddIcon = document.querySelector("nav > .head > .add > .nav-icon");
const navAddIconDrop = document.querySelector(
  "nav > .head > .add > .drop-down"
);
const overlay = document.querySelector(".overlay");
const addModal = document.querySelector("body > .add");
const friendModal = document.querySelector("body > .add .fried");
const friendSearchInput = document.querySelector(
  "body > .add .fried .input-box input"
);
const friendSearchResult = document.querySelector("body > .add .fried .result");

// 点击导航栏“添加”图标，显示下拉菜单
navAddIcon.addEventListener("click", (e) => {
  e.stopPropagation();
  navAddIconDrop.style.display = "block";
  navAddIconDrop.style.opacity = "1";
});

// 点击其他地方关闭下拉菜单
document.addEventListener("click", (e) => {
  if (!navAddIcon.contains(e.target) && !navAddIconDrop.contains(e.target)) {
    navAddIconDrop.style.display = "none";
    navAddIconDrop.style.opacity = "0";
  }
});

// 点击“添加好友”选项，显示好友搜索弹窗
document
  .querySelector("nav .head .add .drop-down .item[data-box='add-friend']")
  .addEventListener("click", (e) => {
    e.stopPropagation();
    navAddIconDrop.style.display = "none";
    overlay.style.display = "block";
    addModal.style.display = "block";
    friendModal.style.display = "block";
    friendSearchResult.innerHTML = ""; // 清空搜索结果
  });

// 点击遮罩层关闭弹窗
overlay.addEventListener("click", () => {
  overlay.style.display = "none";
  addModal.style.display = "none";
  friendModal.style.display = "none";
});

// 搜索好友（防抖）
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

friendSearchInput.addEventListener(
  "input",
  debounce(async () => {
    const account = friendSearchInput.value.trim();
    if (!account) {
      friendSearchResult.innerHTML = "";
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/user/search?account=${account}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (!data.success) {
        friendSearchResult.innerHTML = `<div class="error">搜索失败：${data.error}</div>`;
        return;
      }

      // 渲染搜索结果
      friendSearchResult.innerHTML = "";
      if (data.users.length === 0) {
        friendSearchResult.innerHTML = `<div class="no-result">未找到用户</div>`;
        return;
      }

      data.users.forEach((user) => {
        const item = document.createElement("div");
        item.classList.add("item");
        item.innerHTML = `
          <div class="message">
            <div class="img-box">
              <img src="${
                user.avatar_url || "../img/default-avatar.jpg"
              }" alt="" />
            </div>
            <div class="name">${user.name}</div>
          </div>
          <div class="icon" data-user-id="${user.id}">
            <div class="add-icon">添加</div>
            <div class="already-icon" style="display: none">已添加</div>
          </div>
        `;
        friendSearchResult.appendChild(item);

        // 添加好友
        item.querySelector(".add-icon").addEventListener("click", async (e) => {
          const userId = item.querySelector(".icon").dataset.userId;
          try {
            const response = await fetch(`${API_BASE_URL}/user/add`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ friendId: userId }),
            });
            const result = await response.json();
            if (result.success) {
              e.target.style.display = "none";
              item.querySelector(".already-icon").style.display = "block";
            } else {
              alert("添加失败：" + result.error);
            }
          } catch (error) {
            console.error("添加好友失败:", error);
            alert("添加好友失败：" + error.message);
          }
        });
      });
    } catch (error) {
      console.error("搜索好友失败:", error);
      friendSearchResult.innerHTML = `<div class="error">搜索失败：${error.message}</div>`;
    }
  }, 500)
);

// 修改用户名
const personInfo = document.querySelector(".person-info");
const nameInput = personInfo.querySelector(".name input");
const nameSubmit = personInfo.querySelector(".name .submit");

document
  .querySelector("nav .drop-down .info .name")
  .addEventListener("click", () => {
    personInfo.style.display = "block";
    nameInput.style.display = "flex";
    personInfo.querySelector(".email").style.display = "none";
    document.querySelector(".overlay").style.display = "block";
  });

nameSubmit.addEventListener("click", async () => {
  const newName = nameInput.value.trim();
  if (!newName) {
    alert("请输入姓名");
    return;
  }

  userId = SelfId;

  try {
    const response = await fetch(`${API_BASE_URL}/user/update`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, name: newName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "修改用户名失败");
    }

    const result = await response.json();
    if (result.success) {
      alert("用户名修改成功");
      document.querySelector(".head .name").textContent = newName;
      personInfo.style.display = "none";
    }
  } catch (error) {
    console.error("修改用户名出错:", error);
    alert("修改用户名失败：" + error.message);
  }
});

// // 修改邮箱
// const emailSection = personInfo.querySelector(".email");
// const emailInput = emailSection.querySelector(".email input");
// const emailSubmit = emailSection.querySelector(".email .submit");

// document.querySelector(".email").addEventListener("click", () => {
//   personInfo.style.display = "block";
//   emailSection.style.display = "flex";
//   personInfo.querySelector(".name").style.display = "none";
//   document.querySelector(".overlay").style.display = "block";
// });

// emailSubmit.addEventListener("click", async () => {
//   const newEmail = emailInput.value.trim();
//   if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
//     alert("请输入有效的邮箱地址");
//     return;
//   }

//   try {
//     const response = await fetch(`${API_BASE_URL}/user/update`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ userId, email: newEmail }),
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(errorData.error || "修改邮箱失败");
//     }

//     const result = await response.json();
//     if (result.success) {
//       alert("邮箱修改成功");
//       personInfo.style.display = "none";
//       emailSection.style.display = "none";
//       document.querySelector(".overlay").style.display = "none";
//     }
//   } catch (error) {
//     console.error("修改邮箱出错:", error);
//     alert("修改邮箱失败：" + error.message);
//   }
// });

// 退出登录
document
  .querySelector(".leave.icon:last-child")
  .addEventListener("click", () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    alert("已退出登录");
    window.location.href = "/font/public/html/login.html"; // 重定向到登录页面
  });

// 上传头像
const fileInput = document.querySelector(
  "nav .head .img-box .drop-down #file-input"
);
document
  .querySelector("nav .head .img-box .drop-down img")
  .addEventListener("click", () => {
    fileInput.click();
  });

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("userId", SelfId);

  try {
    const response = await fetch(`${API_BASE_URL}/user/uploadAvatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "上传头像失败");
    }

    const result = await response.json();
    if (result.success) {
      const avatarPath = result.avatarPath; // 直接使用 /img/<filename>
      document.querySelectorAll("nav .head img").forEach((img) => {
        img.src = avatarPath;
        document.querySelector("nav .head .img-box .drop-down img").src =
          avatarPath;
      });
      alert("头像上传成功");
    }
  } catch (error) {
    console.error("上传头像出错:", error);
    alert("上传头像失败：" + error.message);
  }
});

// 点击遮罩层关闭弹窗
document.querySelector(".overlay").addEventListener("click", () => {
  personInfo.style.display = "none";
  emailSection.style.display = "none";
  personInfo.querySelector(".name").style.display = "none";
  document.querySelector(".overlay").style.display = "none";
});

//初始化消息列表
(function initialize() {
  const messageList = document.querySelector(
    ".main .main-contain > [data-box='message'] > .left > .message-list"
  );

  if (!messageList) {
    console.error("未找到 .message-list 元素");
    return;
  }

  const token = localStorage.getItem("token");
  const userId = SelfId;

  fetch(`${API_BASE_URL}/user/initialize/messageList?id=${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errorData) => {
          throw new Error(
            errorData.error || `HTTP error! status: ${res.status}`
          );
        });
      }
      return res.json();
    })
    .then((friends) => {
      console.log("好友列表数据:", friends);
      if (!Array.isArray(friends) || friends.length === 0) {
        messageList.innerHTML = "<p>暂无好友</p>";
        return;
      }

      messageList.innerHTML = friends
        .map(
          (f) => `
          <div class="item" data-id="${f.friend_id}" onclick="openChat(${
            f.friend_id
          }, '${f.friend_name.replace(/'/g, "\\'")}')">
            <div class="primary">
              <div class="img-box">
                <img src="${
                  f.friend_src || "../img/default-avatar.jpg"
                }" alt="${f.friend_name}" />
              </div>
              <div class="text-box">
                <div class="name">${f.friend_name}</div>
                <div class="text">${f.last_message || "暂无消息"}</div>
              </div>
            </div>
            <div class="last-time">
              <div class="time">${
                f.last_time ? new Date(f.last_time).toLocaleString() : ""
              }</div>
            </div>
          </div>
        `
        )
        .join("");
    })
    .catch((error) => {
      console.error("加载好友列表出错:", error);
      messageList.innerHTML = `<p class="error">加载失败：${error.message}</p>`;
    });
})();

function openChat(friendId, friendName) {
  console.log(`打开与 ${friendName} 的聊天框，ID: ${friendId}`);
  // 在这里添加打开聊天框的代码逻辑
}
//打开聊天框
document
  .querySelector(
    ".main .main-contain > [data-box='message'] > .left > .message-list"
  )
  .addEventListener("click", (e) => {
    const item = e.target.closest(".item"); // 找到被点击的最近的 .item
    if (!item) return; // 不是点击在 .item 或其内部就跳过

    const id = item.dataset.id;
    const name = item.querySelector(".name").textContent;

    document.querySelectorAll(".message-list .item").forEach((x) => {
      if (x.dataset.id === id) x.classList.add("active");
      else x.classList.remove("active");
    });

    //right-contain部分display，向数据库获取获取聊天记录并渲染，head渲染
    const rightContain = document.querySelector(
      ".main .main-contain > [data-box='message'] > .right > .right-contain"
    );
    rightContain.style.display = "block";
    rightContain.querySelector(
      ".head > .message > .text-box"
    ).textContent = `${name}`;
    const userId = SelfId;
    rightContain.querySelector(".head > .message .img-box img").src =
      document.querySelector(
        ".main .main-contain > [data-box='message'] > .left > .message-list .item.active .img-box img"
      ).src;
    fetch(
      `${API_BASE_URL}/user/initialize/rightBox?userid=${userId}&friendid=${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        // const { selfAvatar, friendAvatar, messages } = data;
        const {
          selfAvatar,
          friendAvatar,
          messages,
          friendStatus,
          needsApproval,
        } = data;

        console.log(needsApproval, friendStatus);
        const messageList = document.querySelector(
          ".main .main-contain > [data-box='message'] > .right > .right-contain > .show-box"
        );

        messageList.innerHTML = messages
          .map((m) => {
            const avatar = m.sender_id == userId ? selfAvatar : friendAvatar;
            return `
              <div class="text-item">
                <div class="img-box">
                  <img src="${avatar}" />
                </div>
                <div class="message-box">
                  <div class="text">${m.content}</div>
                </div>
              </div>
            `;
          })
          .join("");
        //将聊天记录滚动到底部
        messageList.scrollTop = messageList.scrollHeight;

        // 处理好友状态
        const headMessage = rightContain.querySelector(".head > .message");
        const iconDiv = headMessage.querySelector(".icon");
        if (iconDiv) {
          iconDiv.remove(); // 移除旧的 icon 元素
        }

        // 禁用消息发送功能
        const messageInput = rightContain.querySelector(
          ".input-wrapper textarea"
        ); // 假设有一个输入框
        const sendButton = rightContain.querySelector(".send-button"); // 假设有一个发送按钮
        if (friendStatus !== "accepted") {
          messageInput.disabled = true;
          messageInput.placeholder = "请先成为好友才能发送消息";
        } else {
          messageInput.disabled = false;
          messageInput.placeholder = "输入消息...";
        }

        if (friendStatus === "pending" && needsApproval.toString() === userId) {
          // 当前用户需要通过好友请求
          const pendingIcon = document.createElement("div");
          pendingIcon.className = "icon";
          pendingIcon.textContent = "未添加为好友";
          headMessage.appendChild(pendingIcon);

          pendingIcon.addEventListener("click", async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/user/accept`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ friendId: id, userId: userId }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "接受好友请求失败");
              }

              const result = await response.json();
              if (result.success) {
                pendingIcon.remove(); // 移除按钮
                messageInput.disabled = false;
                messageInput.placeholder = "输入消息...";

                // 刷新聊天记录
                const refreshResponse = await fetch(
                  `${API_BASE_URL}/user/initialize/rightBox?userid=${userId}&friendid=${id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                const refreshedData = await refreshResponse.json();
                messageList.innerHTML = refreshedData.messages
                  .map((m) => {
                    const avatar =
                      m.sender_id == userId
                        ? refreshedData.selfAvatar
                        : refreshedData.friendAvatar;
                    return `
                      <div class="text-item">
                        <div class="img-box">
                          <img src="${avatar}" />
                        </div>
                        <div class="message-box">
                          <div class="text">${m.content}</div>
                        </div>
                      </div>
                    `;
                  })
                  .join("");

                //将聊天记录滚动到底部
                messageList.scrollTop = messageList.scrollHeight;
              }
            } catch (error) {
              console.error("接受好友请求出错:", error);
              alert("接受好友请求失败：" + error.message);
            }
          });
        }
      })
      .catch((error) => console.error("加载聊天记录出错:", error));
  });

//发送消息
// 实时消息接收
//消息弹窗
const popUp = document.querySelector(".main .main-contain .pop-up");
socket.on("new_message", (message) => {
  const rightContain = document.querySelector(
    ".main .main-contain > [data-box='message'] > .right > .right-contain > .show-box"
  );
  const senderId = String(message.sender_id);
  const selfId = String(SelfId);
  const newMessage = document.createElement("div");
  newMessage.className = "text-item";
  newMessage.innerHTML = `
    <div class="img-box">
      <img src="${
        senderId === SelfId
          ? SelfImg
          : document.querySelector(
              ".main .main-contain > [data-box='message'] > .left > .message-list .item.active .img-box img"
            ).src
      }" />
    </div>
    <div class="message-box">
      <div class="text">${message.content}</div>
    </div>
  `;
  rightContain.appendChild(newMessage);
  rightContain.scrollTop = rightContain.scrollHeight;

  //弹窗
  if (senderId !== selfId) {
    // 设置弹出框内容
    const friendImg = "../img/春物壁纸.jpg";
    getSelftImg(senderId)
      .then((avatarUrl) => {
        popUp.querySelector(".left .img-box img").src = `${avatarUrl}`;
      })
      .catch((error) => {
        console.error("错误:", error);
      });
    const friendName = "friendsName";
    getSelfName(senderId)
      .then((name) => {
        popUp.querySelector(".left .name").textContent = `${name}`;
      })
      .catch((error) => {
        console.error("错误:", error);
      });

    popUp.querySelector(".right .message").textContent = message.content;

    // 显示弹出框
    popUp.style.display = "flex";

    // 5秒后隐藏
    setTimeout(() => {
      popUp.style.opacity = "0";
      setTimeout(() => {
        popUp.style.display = "none";
        popUp.style.opacity = "1";
      }, 300);
    }, 5000);

    // 点击弹出框时，跳转到对应的聊天界面
    popUp.addEventListener("click", () => {
      const messageList = document.querySelector(
        ".main .main-contain > [data-box='message'] > .left > .message-list"
      );
      const item = Array.from(messageList.children).find(
        (x) => x.dataset.id === senderId
      );
      if (item) {
        item.click(); // 触发点击事件
        //将聊天记录滚动到底部
        messageList.scrollTop = messageList.scrollHeight;
      }
    });
  }
});
const sendTextArea = document.querySelector(
  ".main .main-contain > [data-box='message'] > .right > .right-contain > .input-box textarea"
);
const sendButton = document.querySelector(
  ".main .main-contain > [data-box='message'] > .right > .right-contain > .input-box .icon .send-icon"
);
sendTextArea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // 阻止换行
    const message = sendTextArea.value.trim();
    sendTextArea.value = "";

    // 从 URL 中获取 userId 示例代码
    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }
    fetch(`${API_BASE_URL}/user/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: getQueryParam("id"),
        friendId: document.querySelector(
          ".main .main-contain > [data-box='message'] > .left > .message-list .item.active"
        ).dataset.id,
        message,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("消息发送成功:", data);
      })
      .catch((error) => console.error("发送消息出错:", error));
  }
});

// ----------------------------------------------------------------------
//工作台

//进度条
function setProgress(percent) {
  const bar = document.querySelector(".progress-bar");
  bar.style.width = percent + "%";
}

//初始化项目列表（全部和已完成）
//获取项目列表
function getProjectList(statusFilter = "") {
  const url = statusFilter
    ? `${API_BASE_URL}/user/initialize/projectList?id=${SelfId}&status=${statusFilter}`
    : `${API_BASE_URL}/user/initialize/projectList?id=${SelfId}`;

  fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errorData) => {
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        });
      }
      return res.json();
    })
    .then((data) => {
      const targetList = document.querySelector(
        `.main .main-contain > [data-box='work'] > .project > [data-data='${
          statusFilter || "all"
        }']`
      );
      console.log("获取项目列表成功:", targetList);
      if (!Array.isArray(data)) {
        throw new Error("后端返回的数据不是数组");
      }

      if (data.length === 0) {
        const message =
          statusFilter === "doing" ? "暂无进行中项目" : "暂无项目";
        targetList.innerHTML = `<p>${message}</p>`;
        return;
      }

      targetList.innerHTML = data
        .map(
          (p) => `
            <div class="item" data-id="${p.project_id}">
              <h3 class="project-name">${p.project_name}</h3>
              <p class="project-intro">${p.project_description || "无描述"}</p>
              <div class="fake-range">
                <div class="progress-bar" style="width: ${p.progress}%"></div>
              </div>
              <div class="message">
                <div class="tag">
                  ${p.tags
                    .map(
                      (tag) => `
                    <div class="tag-item" style="background-color: ${tag.color}">${tag.name}</div>
                  `
                    )
                    .join("")}
                </div>
                <div class="time">${p.created_at}</div>
              </div>
            </div>
          `
        )
        .join("");

      // 更新项目计数
      if (statusFilter === "" || statusFilter === "all") {
        document.querySelector(
          ".main .main-contain > [data-box='work'] > .project > .head > .data [data-data='all'] .data-number"
        ).textContent = targetList.childElementCount;
      } else if (statusFilter === "doing") {
        document.querySelector(
          ".main .main-contain > [data-box='work'] > .project > .head > .data [data-data='doing'] .data-number"
        ).textContent = targetList.childElementCount;
      }
    })
    .catch((error) => {
      console.error("加载项目列表出错:", error);
      const targetList = document.querySelector(
        `.main .main-contain > [data-box='work'] > .project > [data-data='${
          statusFilter || "all"
        }']`
      );
      targetList.innerHTML = `<p class="error-message">加载失败：${error.message}</p>`;
    });
}

// 获取进行中项目（复用 getProjectList）
function initialProjectList() {
  getProjectList();

  // 添加选项卡切换事件监听
  document.querySelectorAll(".project .data [data-data]").forEach((item) => {
    item.addEventListener("click", () => {
      const status = item.dataset.data;
      getProjectList(status === "all" ? "" : status);

      // 更新活动选项卡样式和显示对应容器
      document.querySelectorAll(".project .data [data-data]").forEach((x) => {
        x.classList.toggle("active", x.dataset.data === status);
      });

      // 显示对应状态的容器，隐藏另一个
      document.querySelectorAll(".project-box").forEach((box) => {
        box.style.display = box.dataset.data === status ? "grid" : "none";
      });
    });
  });
}
initialProjectList();

//创建项目
const createProjectBox = document.querySelector("body > .add-project");
const createProjectButton = document.querySelector(
  ".main > .main-contain > [data-box='work'] > .head > .function .icon"
);
//获取好友信息
async function fetchFriends() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/friends/${SelfId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error("获取好友列表失败");
    }
  } catch (error) {
    console.error("获取好友列表失败:", error);
    return [];
  }
}
// 渲染好友到列表（避免重复）
function renderFriendList(listElement, friends) {
  listElement.innerHTML = ""; // 清空
  if (friends.length === 0) {
    listElement.innerHTML = "<p>暂无好友</p>";
    return;
  }
  friends.forEach((friend) => {
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.id = friend.id;
    item.innerHTML = `
      <div class="left">
        <div class="img-box"><img src="${friend.avatar_url}" alt=""></div>
        <div class="name">${friend.name}</div>
      </div>
      <input type="checkbox" class="checkbox">
    `;
    listElement.appendChild(item);
  });
}
createProjectButton.addEventListener("click", async () => {
  overlay.style.display = "block";
  createProjectBox.style.display = "flex";
  //点击其他地方时关闭弹窗
  overlay.addEventListener("click", () => {
    overlay.style.display = "none";
    createProjectBox.style.display = "none";
  });

  //将用户的好友渲染到manager-list和group-list中
  const managerList = document.querySelector(
    ".add-project .message-box .manager-list"
  );
  const groupList = document.querySelector(
    ".add-project .message-box .group-list"
  );
  const friends = await fetchFriends();
  console.log("好友列表:", friends);

  renderFriendList(managerList, friends);
  renderFriendList(groupList, friends);

  //创建任务
  //tag-list中的标签点击后则添加到input-tag；input-tag中的标签点击后则删除
  const tagList = document.querySelector(
    ".add-project > .message-box .tag-list"
  );
  const inputTag = document.querySelector(
    ".add-project > .message-box .input-tag"
  );
  const availableTags = new Map(); // 保存所有可用标签
  const tagItems = tagList.querySelectorAll(".add-project .tag-box span");
  tagItems.forEach((tag) => {
    availableTags.set(tag.dataset.id, {
      name: tag.textContent,
      color: tag.style.backgroundColor,
      element: tag.cloneNode(true),
    });
    tag.addEventListener("click", handleTagAdd);
  });
  function handleTagAdd(e) {
    const tag = e.target;
    const tagId = tag.dataset.id;
    const tagInfo = availableTags.get(tagId);

    const newTag = document.createElement("span");
    newTag.dataset.id = tagId;
    newTag.className = "tag-item";
    newTag.textContent = tagInfo.name;
    newTag.style.backgroundColor = tagInfo.color;
    newTag.style.borderRadius = "5px";
    newTag.style.padding = "5px 10px";
    newTag.style.color = "#fff";
    inputTag.appendChild(newTag);
    tag.remove();
  }

  inputTag.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-item")) {
      const tagId = e.target.dataset.id;
      const tagInfo = availableTags.get(tagId);
      const newTag = tagInfo.element.cloneNode(true);
      newTag.addEventListener("click", handleTagAdd);
      tagList.appendChild(newTag);
      e.target.remove();
    }
  });

  //点击提交按钮后，获取标题、描述、标签和进度，并发送到后端
  const commitButton = document.querySelector(".add-project > .head .submit");
  commitButton.addEventListener("click", async () => {
    const title = document.querySelector(
      ".add-project > .message-box .input-title input"
    ).value;
    const description = document.querySelector(
      ".add-project > .message-box .input-message textarea"
    ).value;
    const tags = Array.from(inputTag.querySelectorAll(".tag-item")).map(
      (tag) => ({
        id: tag.dataset.id,
        name: tag.textContent,
      })
    );
    const admins = Array.from(
      document.querySelector(".add-project .manager-list .checkbox:checked")
    ).map((cb) => ({ id: parseInt(cb.closest(".item").dataset.id) }));
    const members = Array.from(
      document.querySelector(".add-project .group-list .checkbox:checked")
    ).map((cb) => ({ id: parseInt(cb.closest(".item").dataset.id) }));

    if (!title || !tags.length) {
      alert("标题和至少一个标签是必填的！");
      return;
    }

    const projectData = {
      title,
      description,
      tags,
      admins: admins.map((a) => a.id), // 不需要包含创建者，后端会自动添加
      members: members.map((m) => m.id),
      status:
        tags.find((t) => ["doing", "over", "wait"].includes(t.id))?.id ||
        "wait",
    };

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("请先登录");
        window.location.href = "/login.html";
        return;
      }

      const response = await fetch(`${API_BASE_URL}/project/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const data = await response.json();
        const projectId = data.projectId; // 提取 projectId

        alert("项目创建成功！");
        overlay.style.display = "none";
        createProjectBox.style.display = "none";
        //重置表单
        document.querySelector(
          ".add-project > .message-box .input-title input"
        ).value = "";
        document.querySelector(
          ".add-project > .message-box .input-message textarea"
        ).value = "";
        inputTag.innerHTML = ""; // 清空标签
        tagList.innerHTML = ""; // 清空标签列表
        tagItems.forEach((tag) => {
          const newTag = tag.cloneNode(true);
          newTag.addEventListener("click", handleTagAdd);
          tagList.appendChild(newTag);
        });
        initialProjectList(); // 重新加载项目列表
        redirectToProjectDetail(projectId); // 跳转到项目详情页
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "创建失败");
      }
    } catch (error) {
      console.error("创建项目失败:", error);
      alert(`创建项目失败：${error.message}`);
    }
  });
});

//项目成功创建后跳转到项目详情页
function redirectToProjectDetail(projectId) {
  const newWindow = window.open("", "_blank");
  newWindow.location.href = `${LocalAPI}/font/public/html/item.html?id=${projectId}&userId=${SelfId}`;
}

//工作台的小卡片点击后跳转到对应的项目详情页
(function projectOpenNewWindow() {
  const workContainer = document.querySelector(
    ".main .main-contain > [data-box='work'] > .project"
  );

  workContainer.addEventListener("click", async (event) => {
    const item = event.target.closest(".project-box .item");
    if (!item) return;

    event.preventDefault();
    console.log("点击了项目卡片:", item);
    const id = item.dataset.id;

    try {
      const response = await fetch(
        `${API_BASE_URL}/project/updateprojectStatus/${id}`,
        {
          method: "post",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error("更新项目状态失败");
      }

      console.log("项目更新为doing");
    } catch (error) {
      console.error(error);
    }

    redirectToProjectDetail(id);
  });
})();
