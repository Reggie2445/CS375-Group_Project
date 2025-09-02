import { Layout, Typography, Button } from "antd";
const { Header, Content } = Layout;
const { Title } = Typography;

export default function SpotifyPage() {
  const handleLogin = () => {
    const API_BASE = process.env.NODE_ENV === "production"
  ? ""
  : "http://127.0.0.1:8080";
    window.location.href = `${API_BASE}/auth/login`;
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ background: "#fff", padding: "0 24px", borderBottom: "1px solid #f0f0f0" }}>
        <Title level={3} style={{ margin: 0, color: "#1890ff" }}>🎵 MusicShare – Spotify Connect</Title>
      </Header>
      <Content style={{ margin: 24, padding: 24, background: "#fff", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Title level={4}>Link your Spotify account</Title>
        <Button type="primary" size="large" onClick={handleLogin}>Login with Spotify</Button>
      </Content>
    </Layout>
  );
}
