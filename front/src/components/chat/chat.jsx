import ChatHead from "../../components/chat/chat-component/chat-head/chat-head.jsx";
import React from "react";
import { useRef } from "react";
import ChatContent from "../../components/chat/chat-component/chat-content/chat-content.jsx";
import ChatInput from "../../components/chat/chat-component/chat-input/chat-input.jsx";
import "./chat.css";

export default function ChatModule() {
  const chatContentRef = useRef(null);

  return (
    <div className="chat-module">
      <ChatHead
        ref={chatContentRef}
        name="John Doe"
        avatar="https://api.dicebear.com/7.x/miniavs/svg?seed=1"
      />
      <ChatContent
        data={{
          selfAvatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
          otherAvatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=2",
        }}
      />
      <ChatInput />
    </div>
  );
}
