import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Home from "./pages/home.jsx";
import Chat from "./pages/home-page/chat.jsx";
import Manage from "./pages/home-page/manage.jsx";
import Login from "./pages/sign/login.jsx";
import Register from "./pages/sign/register.jsx";
import Reset from "./pages/sign/reset.jsx";
import Project from "./pages/project.jsx";
import Main from "./pages/project/main.jsx";
import Pull from "./pages/project/pull.jsx";
import Plan from "./pages/project/plan.jsx";
import Report from "./pages/project/report.jsx";
import Set from "./pages/project/set.jsx";
import Work from "./pages/project/work.jsx";
import Sign from "./pages/sign-page/sign.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="home" element={<Home />}>
            <Route index element={<Chat />} />
            <Route path="chat" element={<Chat />} />
            <Route path="manage" element={<Manage />} />
          </Route>
          <Route path="sign" element={<Sign />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="reset" element={<Reset />} />
          </Route>
          <Route path="project/:projectId" element={<Project />}>
            <Route index element={<Main />} />
            <Route path="main" element={<Main />} />
            <Route path="pull" element={<Pull />} />
            <Route path="plan" element={<Plan />} />
            <Route path="report" element={<Report />} />
            <Route path="set" element={<Set />} />
            <Route path="work" element={<Work />} />
          </Route>
        </Route>
      </Routes>
      {/* <Routes>
        <Route path="/" element={<App />}></Route>
      </Routes> */}
    </BrowserRouter>
  </StrictMode>
);
