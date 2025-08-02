// src/pages/AuthPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Typography} from "antd";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Alert } from "antd";
const { Title } = Typography;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form] = Form.useForm();  


  const navigate = useNavigate();

  const onFinish = async (values) => {
    const { email, password } = values;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Successfully logged in!");
        navigate("/main");
        setLoading(false);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess("Account created successfully!");
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const changeForm = () =>{
    setIsLogin(!isLogin);
    form.resetFields();
    setError("");
    setSuccess("");
  }

  return (
    <div style={{ maxWidth: 400, margin: "auto", marginTop: "120px" }}>
      <Title level={2}>{isLogin ? "Login" : "Sign Up"}</Title>
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon={true}
          style={{ marginBottom: "1rem" }}
        />
      )}
      {success && (
        <Alert
          message="Success"
          description={success}
          type="success"
          showIcon={true}
          style={{ marginBottom: "1rem" }}
        />
      )}
      <Form name="auth-form" layout="vertical" onFinish={onFinish} form={form}>
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, message: "Please input your email!"}]}
        >
          <Input type="email" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please input your password!"}]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {isLogin ? "Login" : "Sign Up"}
          </Button>
        </Form.Item>
        <Form.Item>
          <Button type="link" onClick={changeForm} block>
            {isLogin ? "No account? Sign Up" : "Have an account? Login"}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AuthPage;
