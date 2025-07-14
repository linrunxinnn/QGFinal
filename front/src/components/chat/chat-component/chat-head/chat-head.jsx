//聊天页面的顶部
//显示聊天对象，扩展键（点击以后可以展开更多信息）

import React from "react";
import { Avatar, Button, Dropdown, Space } from "antd";
import "./chat-head.css";

const ChatHead = React.forwardRef(({ name, avatar }, ref) => {
  return (
    <div className="chat-head" ref={ref}>
      <Space>
        <Avatar src={avatar} />
        <span>{name}</span>
      </Space>
      <Button>...</Button>
    </div>
  );
});

export default ChatHead;
