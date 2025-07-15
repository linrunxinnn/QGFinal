import React from "react";
import { Avatar, List } from "antd";
import "./chat.css";
import ChatModule from "../../components/chat/chat";
const data = [
  {
    title: "Ant Design Title 1",
    description: "This is the description of Ant Design Title 1",
  },
  {
    title: "Ant Design Title 2",
    description: "This is the description of Ant Design Title 2",
  },
  {
    title: "Ant Design Title 3",
    description: "This is the description of Ant Design Title 3",
  },
  {
    title: "Ant Design Title 4",
    description: "This is the description of Ant Design Title 4",
  },
];
const Chat = () => {
  return (
    <div className="chat-page">
      <div className="chat-list">
        <List
          itemLayout="horizontal"
          dataSource={data}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                className="chat-list-item"
                avatar={
                  <Avatar
                    src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${index}`}
                  />
                }
                title={<a href="https://ant.design">{item.title}</a>}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </div>
      <div className="chat-box">
        <ChatModule />
      </div>
    </div>
  );
};
export default Chat;
