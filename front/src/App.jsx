//创建一个APP
import React from "react";
import { Layout, Menu, theme } from "antd";
import { Outlet } from "react-router-dom";
import "./App.css";
const { Header, Content, Footer } = Layout;
const App = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  return (
    <Layout className="app">
      <Outlet className="outlet" style={{ flex: 1 }} />
      <Footer style={{ textAlign: "center" }}>
        @2025 QGFinal. All rights reserved.
      </Footer>
    </Layout>
  );
};
export default App;
