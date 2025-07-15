import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import Home from "../pages/home.jsx";
import Chat from "../pages/home-page/chat.jsx";
import Manage from "../pages/home-page/manage.jsx";
import Login from "../pages/sign/login.jsx";
import Register from "../pages/sign/register.jsx";
import Reset from "../pages/sign/reset.jsx";
import Sign from "../pages/sign-page/sign.jsx";
import Project from "../pages/project.jsx";
import Main from "../pages/project/main.jsx";
import Pull from "../pages/project/pull.jsx";
import Plan from "../pages/project/plan.jsx";
import Report from "../pages/project/report.jsx";
import Set from "../pages/project/set.jsx";
import Work from "../pages/project/work.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "home",
        element: <Home />,
        children: [
          {
            index: true,
            element: <Chat />,
          },
          {
            path: "manage",
            element: <Manage />,
          },
        ],
      },
      {
        path: "sign",
        element: <Sign />,
        children: [
          {
            path: "login",
            element: <Login />,
          },
          {
            path: "register",
            element: <Register />,
          },
          {
            path: "reset",
            element: <Reset />,
          },
        ],
      },
      {
        path: "project/:projectId",
        element: <Project />,
        children: [
          {
            index: true,
            element: <Main />,
          },
          {
            path: "pull",
            element: <Pull />,
          },
          {
            path: "plan",
            element: <Plan />,
          },
          {
            path: "report",
            element: <Report />,
          },
          {
            path: "set",
            element: <Set />,
          },
          {
            path: "work",
            element: <Work />,
          },
        ],
      },
    ],
  },
]);
