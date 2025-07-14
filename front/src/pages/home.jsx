import React, { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  DesktopOutlined,
  FileOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
  PlusOutlined,
  DownOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Layout,
  Menu,
  theme,
  Avatar,
  Dropdown,
  Button,
} from "antd";
const { Header, Content, Footer, Sider } = Layout;
function getItem(label, key, icon, path) {
  return {
    key,
    icon,
    label,
    path,
  };
}
const items = [
  getItem("消息", "1", <UserOutlined />, "/home/chat"),
  getItem("工作台", "2", <DesktopOutlined />, "/home/manage"),
];

const Home = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  //加号功能
  const plusMenuItems = [
    {
      key: "add-friend",
      label: "添加好友",
      onClick: () => console.log("添加好友"),
    },
    {
      key: "create-group",
      label: "创建群组",
      onClick: () => console.log("创建群组"),
    },
  ];

  //头像功能
  const avatarMenuItems = [
    {
      key: "my-name",
      label: "我的昵称",
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "change-avatar",
      label: "更换头像",
      onClick: () => console.log("更换头像"),
    },
    {
      key: "change-name",
      label: "更改昵称",
      onClick: () => console.log("更改昵称"),
    },
    {
      key: "logout",
      label: "退出登录",
      onClick: () => console.log("退出登录"),
    },
  ];
  const navigate = useNavigate();

  return (
    <Layout className="page" style={{ maxHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          padding: "15px 0",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: collapsed ? "center" : "space-between",
            alignItems: "center",
            padding: "0 10px",
            marginBottom: "10px",
            transition: "all 0.3s ease-in-out",
          }}
        >
          <Dropdown menu={{ items: avatarMenuItems }}>
            <Avatar
              size={32}
              src="../public/头像.jpg"
              style={{ cursor: "pointer" }}
            />
          </Dropdown>
          {!collapsed && (
            <Dropdown trigger={["click"]} menu={{ items: plusMenuItems }}>
              <Button
                type="text"
                icon={<PlusOutlined />}
                style={{ color: "#fff", fontSize: "16px" }}
              />
            </Dropdown>
          )}
        </div>
        <Menu
          theme="dark"
          defaultSelectedKeys={["1"]}
          mode="inline"
          items={items}
          onClick={({ key }) => {
            const item = items.find((item) => item.key === key);
            navigate(item.path);
          }}
        />
      </Sider>
      <Layout style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Content
          style={{
            margin: "10px 16px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: "100%",
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
export default Home;
