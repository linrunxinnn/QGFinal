function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

token = localStorage.getItem("token");
const urlParams = new URLSearchParams(window.location.search);
const SelfId = urlParams.get("id");
//获取头像
function getSelftImg(id) {
  return fetch(`http://localhost:3000/user/getSelfImg?id=${id}`, {
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
  })
  .catch((error) => {
    console.error("错误:", error);
  });
//获取名字
function getSelfName(id) {
  return fetch(`http://localhost:3000/user/getSelfName?id=${id}`, {
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

//socket.io 初始化
const socket = io("http://localhost:3000", {
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
const navAddIcon = document.querySelector("nav > .head > .add > .nav-icon");
const navAddIconDrop = document.querySelector(
  "nav > .head > .add > .drop-down"
);
navAddIcon.addEventListener("click", (e) => {
  e.stopPropagation(); // 阻止事件冒泡
  navAddIconDrop.style.display = "block";
  navAddIconDrop.style.opacity = "1";
});
// 点击其他地方时关闭下拉菜单
document.addEventListener("click", () => {
  navAddIconDrop.style.display = "none";
});

//进度条
function setProgress(percent) {
  const bar = document.querySelector(".progress-bar");
  bar.style.width = percent + "%";
}
// 示例用法
setProgress(20); // 设置到 80%

//初始化
(function initialize() {
  const messageList = document.querySelector(
    ".main .main-contain > [data-box='message'] > .left > .message-list"
  );

  const token = localStorage.getItem("token");
  const userId = SelfId;

  if (!token || !userId) {
    console.error("缺少token或用户ID");
    return;
  }

  fetch(`http://localhost:3000/user/initialize/messageList?id=${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((friends) => {
      messageList.innerHTML = friends
        .map(
          (f) => `
          <div class="item" data-id="${f.friend_id}" onclick="openChat(${
            f.friend_id
          }, '${f.friend_name}')">
            <div class="primary">
              <div class="img-box">
                <img src="${f.friend_src}" />
              </div>
              <div class="text-box">
                <div class="name">${f.friend_name}</div>
                <div class="text">${f.last_message || ""}</div>
              </div>
            </div>
            <div class="last-time">
              <div class="time">${f.friend_time || ""}</div>
            </div>
          </div>
        `
        )
        .join("");
    })
    .catch((error) => console.error("加载好友列表出错:", error));
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

    openChat(id, name);
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
      `http://localhost:3000/user/initialize/rightBox?userid=${userId}&friendid=${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        const { selfAvatar, friendAvatar, messages } = data;

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
    popUp.style.display = "flex"; // 或 "block"，取决于你的 CSS

    // 5秒后隐藏
    setTimeout(() => {
      popUp.style.display = "none";
    }, 5000);
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
    fetch("http://localhost:3000/user/send-message", {
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
