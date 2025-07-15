import ChatHead from "../../components/chat/chat-component/chat-head/chat-head.jsx";
import React, { useEffect, useState } from "react";
import { Button, Drawer, theme } from "antd";
import { useRef } from "react";
import ChatContent from "../../components/chat/chat-component/chat-content/chat-content.jsx";
import ChatInput from "../../components/chat/chat-component/chat-input/chat-input.jsx";
import "./chat.css";

const ChatDrawer = () => {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };
  const containerStyle = {
    position: "relative",
    height: 200,
    padding: 48,
    overflow: "hidden",
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  };
  return (
    <div style={containerStyle}>
      Render in this
      <div style={{ marginTop: 16 }}>
        <Button type="primary" onClick={showDrawer}>
          Open
        </Button>
      </div>
      <Drawer
        title="Basic Drawer"
        placement="right"
        closable={false}
        onClose={onClose}
        open={open}
        getContainer={false}
      >
        <p>Some contents...</p>
      </Drawer>
    </div>
  );
};

export default function ChatModule() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleHeadButtonClick = () => {
    setDrawerOpen(!drawerOpen);
  };
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <div className="chat-module">
      <ChatHead
        name="John Doe"
        avatar="https://api.dicebear.com/7.x/miniavs/svg?seed=1"
        onMoreClick={handleHeadButtonClick}
      />
      <ChatContent
        data={{
          selfAvatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
          otherAvatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=2",
        }}
      />
      <ChatInput />
      <Drawer
        title="聊天对象信息"
        placement="right"
        onClose={handleDrawerClose}
        open={drawerOpen}
      >
        <p>删除好友</p>
        <p>打电话</p>
        <p>设置免打扰</p>
      </Drawer>
    </div>
  );
}
