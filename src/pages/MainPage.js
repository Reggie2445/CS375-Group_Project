import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Button, message, Badge } from "antd";
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import CreatePost from "../components/CreatePost";
import PostFeed from "../components/PostFeed";
import UserPosts from "../components/UserPosts";
import FriendsPage from "../components/FriendsPage";

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const MainPage = () => {
  const [user, loading] = useAuthState(auth);
  const [selectedKey, setSelectedKey] = useState("feed");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const friendRequestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(friendRequestsQuery, (snapshot) => {
      setPendingRequestsCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      message.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      message.error("Failed to logout");
    }
  };

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedKey("feed");
  };

  const menuItems = [
    {
      key: "feed",
      icon: <HomeOutlined />,
      label: "Feed",
    },
    {
      key: "create",
      icon: <PlusOutlined />,
      label: "Create Post",
    },
    {
      key: "friends",
      icon: <TeamOutlined />,
      label: (
        <Badge count={pendingRequestsCount} size="small" offset={[10, 0]}>
          Friends
        </Badge>
      ),
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case "feed":
        return <PostFeed refreshTrigger={refreshTrigger} />;
      case "create":
        return <CreatePost onPostCreated={handlePostCreated} />;
      case "friends":
        return <FriendsPage />;
      case "profile":
        return <UserPosts />;
      default:
        return <PostFeed refreshTrigger={refreshTrigger} />;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={200} style={{ background: "#fff" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
          <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            🎵 MusicShare
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onSelect={({ key }) => setSelectedKey(key)}
          style={{ height: "100%", borderRight: 0 }}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            {selectedKey === "feed" && "Your Feed"}
            {selectedKey === "create" && "Create a Post"}
            {selectedKey === "friends" && "Manage Friends"}
            {selectedKey === "profile" && "Your Posts"}
          </Title>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span>Welcome, {user.email}</span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </Header>

        <Content
          style={{
            margin: "24px",
            padding: 24,
            background: "#fff",
            borderRadius: 8,
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainPage;
