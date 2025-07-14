import React from "react";
import { Tabs, theme } from "antd";
import StickyBox from "react-sticky-box";
import "../sign-page/sign.page.css";
import LoginForm from "../sign/login.jsx";
import RegisterForm from "../sign/register.jsx";
import ResetForm from "../sign/reset.jsx";
const items = [
  {
    label: "登录",
    key: "login",
    children: <LoginForm />,
  },
  {
    label: "注册",
    key: "register",
    children: <RegisterForm />,
  },
  {
    label: "重置密码",
    key: "reset",
    children: <ResetForm />,
  },
];
const Sign = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const renderTabBar = (props, DefaultTabBar) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{ zIndex: 1 }}>
      <DefaultTabBar
        className="tabs"
        {...props}
        style={{
          background: colorBgContainer,
          padding: "10px",
        }}
      />
    </StickyBox>
  );
  return (
    <div className="sign-page page">
      <div className="sign-container">
        <Tabs
          defaultActiveKey="login"
          renderTabBar={renderTabBar}
          items={items}
        />
      </div>
    </div>
  );
};
export default Sign;
