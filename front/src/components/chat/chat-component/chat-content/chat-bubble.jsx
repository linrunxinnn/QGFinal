//聊天气泡
import React from "react";
import { Avatar } from "antd";
import "./chat-bubble.css";

const ChatBubble = ({ avatar, content }) => {
  return (
    <div className="chat-bubble">
      <Avatar src={avatar} />
      <div className="chat-content-item">{content}</div>
    </div>
  );
};

export default ChatBubble;
