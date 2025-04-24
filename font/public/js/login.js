if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginButton = document.getElementById("loginButton");
    loginButton.disabled = true;
    loginButton.textContent = "登录中...";
    const phoneNum = document.getElementById("phoneNum").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_BASE_URL}/log/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNum, password }),
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem("token", result.token);
        window.location.href = `index.html?id=${result.user.id}`;
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error("登录错误:", err);
      alert("网络错误，请稍后重试");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "登录";
    }
  });
}

if (document.getElementById("registerForm")) {
  const sendCodeBtn = document.getElementById("sendCode");
  const registerForm = document.getElementById("registerForm");
  let countdown = 60;
  let timer = null;

  sendCodeBtn.addEventListener("click", async () => {
    const phone = document.getElementById("phone").value;
    if (!phone) {
      alert("请输入电话号码");
      return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = "发送中...";

    try {
      const response = await fetch(`${API_BASE_URL}/log/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();

      if (result.success) {
        document.getElementById("code").style.display = "block";
        document.getElementById("newPassword").style.display = "block";
        document.getElementById("confirmPassword").style.display = "block";
        registerForm.querySelector('button[type="submit"]').style.display =
          "block";

        countdown = 60;
        sendCodeBtn.textContent = `重新发送 (${countdown}s)`;
        timer = setInterval(() => {
          countdown--;
          sendCodeBtn.textContent = `重新发送 (${countdown}s)`;
          if (countdown <= 0) {
            clearInterval(timer);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = "发送验证码";
          }
        }, 1000);
      }
      alert(result.message);
    } catch (err) {
      console.error("发送验证码错误:", err);
      alert("网络错误，请稍后重试");
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = "发送验证码";
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "注册中...";

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const phone = document.getElementById("phone").value;
    const code = document.getElementById("code").value;
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("密码不匹配");
      submitButton.disabled = false;
      submitButton.textContent = "注册";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/log/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, code, password }),
      });
      const result = await response.json();
      alert(result.message);
      if (result.success)
        window.location.href = `index.html?id=${result.userId}`;
    } catch (err) {
      console.error("注册错误:", err);
      alert("网络错误，请稍后重试");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "注册";
    }
  });
}

if (document.getElementById("resetForm")) {
  const sendResetCodeBtn = document.getElementById("sendResetCode");
  const resetForm = document.getElementById("resetForm");
  let countdown = 60;
  let timer = null;

  sendResetCodeBtn.addEventListener("click", async () => {
    const phone = document.getElementById("resetPhone").value;
    if (!phone) {
      alert("请输入电话号码");
      return;
    }

    sendResetCodeBtn.disabled = true;
    sendResetCodeBtn.textContent = "发送中...";

    try {
      const response = await fetch(`${API_BASE_URL}/log/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();

      if (result.success) {
        document.getElementById("resetCode").style.display = "block";
        document.getElementById("newResetPassword").style.display = "block";
        document.getElementById("confirmResetPassword").style.display = "block";
        resetForm.querySelector('button[type="submit"]').style.display =
          "block";

        countdown = 60;
        sendResetCodeBtn.textContent = `重新发送 (${countdown}s)`;
        timer = setInterval(() => {
          countdown--;
          sendResetCodeBtn.textContent = `重新发送 (${countdown}s)`;
          if (countdown <= 0) {
            clearInterval(timer);
            sendResetCodeBtn.disabled = false;
            sendResetCodeBtn.textContent = "发送验证码";
          }
        }, 1000);
      }
      alert(result.message);
    } catch (err) {
      console.error("发送验证码错误:", err);
      alert("网络错误，请稍后重试");
      sendResetCodeBtn.disabled = false;
      sendResetCodeBtn.textContent = "发送验证码";
    }
  });

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = resetForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "重置中...";

    const phone = document.getElementById("resetPhone").value;
    const code = document.getElementById("resetCode").value;
    const password = document.getElementById("newResetPassword").value;
    const confirmPassword = document.getElementById(
      "confirmResetPassword"
    ).value;

    if (password !== confirmPassword) {
      alert("密码不匹配");
      submitButton.disabled = false;
      submitButton.textContent = "重置密码";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/log/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, password }),
      });
      const result = await response.json();
      alert(result.message);
      if (result.success) window.location.href = "login.html";
    } catch (err) {
      console.error("重置密码错误:", err);
      alert("网络错误，请稍后重试");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "重置密码";
    }
  });
}

async function getProfile() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }
    const data = await response.json();
    console.log("用户信息:", data);
    return data;
  } catch (err) {
    console.error("获取用户信息错误:", err);
    alert("网络错误，请稍后重试");
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
