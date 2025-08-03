import { Layout, Typography, Button, message } from "antd";
import env from "../env.json";

const { Header, Content } = Layout;
const { Title } = Typography;


const SpotifyPage = () => {
  const redirectUri = env.redirect_uri;
  const clientId = env.client_id;

  const generateRandomString = (length) => {
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  };

  const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
  };

  const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };

  const handleLogin = async () => {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    localStorage.setItem("code_verifier", codeVerifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    const params = {
      response_type: "code",
      client_id: clientId,
      scope: "user-read-private user-read-email",
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      redirect_uri: redirectUri,
    };

    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
          🎵 MusicShare – Spotify Connect
        </Title>
      </Header>

      <Content
        style={{
          margin: "24px",
          padding: 24,
          background: "#fff",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Title level={4}>Link your Spotify account</Title>
        <Button
          type="primary"
          size="large"
          onClick={handleLogin}
          style={{ marginTop: 16 }}
        >
          Login with Spotify
        </Button>
      </Content>
    </Layout>
  );
};

export default SpotifyPage;
