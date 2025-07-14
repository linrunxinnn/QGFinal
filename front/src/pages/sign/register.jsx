import React from "react";
import { Button, Form, Input, Select, Space, Typography, message } from "antd";
import { useState } from "react";

const { Option } = Select;
const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

//验证码
const onChange = (text) => {
  console.log("onChange:", text);
};
const onInput = (value) => {
  console.log("onInput:", value);
};
const sharedProps = {
  onChange,
  onInput,
};

const RegisterForm = () => {
  //状态和时间控制
  const [countdown, setCountdown] = useState(0);
  console.log("countdown", countdown);
  // React.useEffect(() => {
  //   let timeer;
  //   if (countdown > 0) {
  //     timeer = setInterval(() => {
  //       setCountdown(countdown - 1);
  //     }, 1000);
  //   }
  //   return () => clearInterval(timeer);
  // }, [countdown]);
  React.useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);
  const handlerSendVerificationCode = () => {
    if (countdown > 0) {
      message.warning(`请等待 ${countdown} 秒后重试`);
      return;
    }
    const email = form.getFieldValue("email");
    if (!email) {
      message.warning("请输入邮箱地址");
      return;
    }
    alert(`验证码已发送到 ${email}`);
    setCountdown(60);
  };

  const [form] = Form.useForm();
  const onGenderChange = (value) => {
    switch (value) {
      case "male":
        form.setFieldsValue({ note: "Hi, man!" });
        break;
      case "female":
        form.setFieldsValue({ note: "Hi, lady!" });
        break;
      case "other":
        form.setFieldsValue({ note: "Hi there!" });
        break;
      default:
    }
  };
  const onFinish = (values) => {
    console.log(values);
  };
  const onReset = () => {
    form.resetFields();
  };
  const onFill = () => {
    form.setFieldsValue({ note: "Hello world!", gender: "male" });
  };
  return (
    <div className="login-form">
      <Form
        {...layout}
        form={form}
        name="register"
        onFinish={onFinish}
        style={{
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <Form.Item
          name="email"
          label="邮箱"
          rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item label="验证码" required>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item
              name="verification"
              noStyle
              rules={[{ required: true, message: "请输入验证码" }]}
            >
              <Input.OTP
                formatter={(str) => str.toUpperCase()}
                {...sharedProps}
                style={{ flex: 1 }}
              />
            </Form.Item>
            <Button
              type="link"
              onClick={handlerSendVerificationCode}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${countdown}s后重试` : "发送验证码"}
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item {...tailLayout}>
          <Space>
            <Button type="primary" htmlType="submit">
              注册
            </Button>
            <Button htmlType="button" onClick={onReset}>
              重置
            </Button>
            <Button type="link" htmlType="button" onClick={onFill}>
              填充表单
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
export default RegisterForm;
