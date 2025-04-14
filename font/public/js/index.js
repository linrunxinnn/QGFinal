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

//消息
const messageList = document.querySelectorAll(
  ".main-contain > [data-box='message'] > .left > .message-list > .item"
);
const messageBox = document.querySelector(
  ".main-contain > [data-box='message'] > .right "
);
messageList.forEach((item) => {
  item.addEventListener("click", () => {});
});

//进度条
function setProgress(percent) {
  const bar = document.querySelector(".progress-bar");
  bar.style.width = percent + "%";
}
// 示例用法
setProgress(20); // 设置到 80%
