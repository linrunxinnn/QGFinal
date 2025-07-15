import React, { use } from "react";
import { Button, Form, Input, message, Select, Space } from "antd";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/user";
import { setLogin } from "../../feature/user/userSlice.js";

const { Option } = Select;
const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};
const LoginForm = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigator = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await login(values);
      console.log("登录成功", res);
      const { token, user } = res.data;
      dispatch(setLogin({ token, user }));
      console.log("redux后", user);
      localStorage.setItem("token", token);
      navigator("/home");
    } catch (error) {
      console.log(error.message);
      message.error("登录失败，请检查您的邮箱和密码是否正确");
    }
  };
  const onReset = () => {
    form.resetFields();
  };

  return (
    <div className="login-form">
      <Form
        {...layout}
        form={form}
        name="login"
        onFinish={onFinish}
        style={{
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <Form.Item name="email" label="邮箱" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        {/* <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.gender !== currentValues.gender
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("gender") === "other" ? (
              <Form.Item
                name="customizeGender"
                label="Customize Gender"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            ) : null
          }
        </Form.Item> */}
        <Form.Item {...tailLayout}>
          <Space>
            <Button type="primary" htmlType="submit">
              登录
            </Button>
            <Button htmlType="button" onClick={onReset}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
export default LoginForm;
