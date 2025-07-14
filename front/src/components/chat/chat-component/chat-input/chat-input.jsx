import React from "react";
import { Input, Button, Tooltip, Flex } from "antd";
const { TextArea } = Input;

const ChatInput = () => (
  <div className="chat-input">
    <div className="input-container">
      <TextArea rows={2} placeholder="maxLength is 6" maxLength={6} />
    </div>
    <Flex gap="small" justify="flex-end" align="center">
      <Tooltip title="发送消息">
        <Button type="primary" icon={<i className="icon-send" />} />
      </Tooltip>
      <Tooltip title="添加表情">
        <Button type="default" icon={<i className="icon-smile" />} />
      </Tooltip>
      <Tooltip title="上传文件">
        <Button type="default" icon={<i className="icon-upload" />} />
      </Tooltip>
    </Flex>
  </div>
);

export default ChatInput;
