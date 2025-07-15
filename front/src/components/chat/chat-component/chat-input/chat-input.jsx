import React, { useState } from "react";
import { Popover, Input, Button, Tooltip, Flex } from "antd";
import EmojiPicker from "emoji-picker-react";
import { SmileOutlined, SendOutlined, UploadOutlined } from "@ant-design/icons";

import "./chat-input.css";
const { TextArea } = Input;

const ChatInput = () => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleEmojiClick = (emojiData) => {
    setInputValue((prev) => prev + emojiData.emoji);
    setOpen(false);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    console.log("发送消息：", inputValue);
    setInputValue("");
  };

  return (
    <div className="chat-input">
      <div className="input-container">
        <TextArea
          className="chat-textarea"
          rows={1}
          placeholder="输入消息"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>
      <Flex gap="small" justify="flex-end" align="center">
        <Tooltip title="发送消息">
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} />
        </Tooltip>
        <Tooltip title="添加表情">
          <Popover
            content={<EmojiPicker onEmojiClick={handleEmojiClick} />}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
          >
            <Button type="default" icon={<SmileOutlined />} />
          </Popover>
        </Tooltip>
        <Tooltip title="上传文件">
          <Button type="default" icon={<UploadOutlined />} />
        </Tooltip>
      </Flex>
    </div>
  );
};

export default ChatInput;
