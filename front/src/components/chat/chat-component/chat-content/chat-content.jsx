//聊天记录组件
import React from "react";
import { Avatar, List } from "antd";
import "./chat-content.css";
import ChatBubble from "./chat-bubble.jsx";

const ChatContent = ({ data }) => {
  //解构data中的头像，并设置默认头像
  const defaultAvatar = "https://api.dicebear.com/7.x/miniavs/svg?seed=default";
  const { selfAvatar, otherAvatar } = data;

  return (
    <div className="chat-content">
      <ChatBubble
        avatar={selfAvatar || defaultAvatar}
        content="Hello!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <ChatBubble avatar={otherAvatar || defaultAvatar} content="Hi there!" />
      <ChatBubble
        avatar={selfAvatar || defaultAvatar}
        content="Hello!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <ChatBubble avatar={otherAvatar || defaultAvatar} content="Hi there!" />
      <ChatBubble
        avatar={selfAvatar || defaultAvatar}
        content="Hello!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <ChatBubble avatar={otherAvatar || defaultAvatar} content="Hi there!" />
      <ChatBubble
        avatar={selfAvatar || defaultAvatar}
        content="Hello!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <ChatBubble avatar={otherAvatar || defaultAvatar} content="Hi there!" />
      <ChatBubble
        avatar={selfAvatar || defaultAvatar}
        content="Hello!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <ChatBubble avatar={otherAvatar || defaultAvatar} content="Hi there!" />
      <ChatBubble
        avatar={selfAvatar || defaultAvatar}
        content="Hello!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      />
      <ChatBubble avatar={otherAvatar || defaultAvatar} content="Hi there!" />
    </div>
  );
};

export default ChatContent;
