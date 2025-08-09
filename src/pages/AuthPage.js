// src/pages/AuthPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Typography } from "antd";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from "../firebase";
import { Alert } from "antd";
const { Title } = Typography;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form] = Form.useForm();

  const navigate = useNavigate();

  const isSpotifyAuthorized = () => {
    const token = localStorage.getItem("spotify_access_token");
    return !!token;
  };

  const onFinish = async (values) => {
    const { email, password } = values;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Create/update user document in Firestore on login too
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email.toLowerCase(),
          lastLoginAt: serverTimestamp()
        }, { merge: true });
        
        setSuccess("Successfully logged in!");
        if (!isSpotifyAuthorized()) {
          navigate("/spotify-auth");
          setLoading(false);
        } else {
          navigate("/main");
          setLoading(false);
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email.toLowerCase(),
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
        
        setSuccess("Account created successfully!");
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const changeForm = () => {
    setIsLogin(!isLogin);
    form.resetFields();
    setError("");
    setSuccess("");
  };

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
          rules={[{ required: true, message: "Please input your email!" }]}
        >
          <Input type="email" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
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
