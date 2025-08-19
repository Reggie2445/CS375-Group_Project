import React, { useEffect, useState } from "react";
import { Card, Avatar, Tag, Typography, Space, Skeleton, Button } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const API_BASE = "http://127.0.0.1:8080";

const SpotifyMiniProfile = () => {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`, {
          credentials: "include",
        });
        if (!res.ok) {
          setMe(null);
        } else {
          const payload = await res.json();
          setMe(payload);
        }
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card
      style={{ marginBottom: 16, borderRadius: 8 }}
      bodyStyle={{ padding: 16 }}
      title={
        <Title level={4} style={{ margin: 0 }}>
          Your Spotify
        </Title>
      }
      extra={
        me?.external_urls?.spotify && (
          <Button
            size="small"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => window.open(me.external_urls.spotify, "_blank")}
          >
            Open
          </Button>
        )
      }
    >
      {loading ? (
        <Skeleton active avatar paragraph={{ rows: 2 }} />
      ) : me ? (
        <Space align="start" size="large" wrap style={{ width: "100%" }}>
          <Avatar
            size={64}
            src={me.images?.[0]?.url}
            style={{ background: "#1890ff" }}
          >
            {me.display_name?.[0] || "U"}
          </Avatar>

          <div style={{ minWidth: 220 }}>
            <Title level={5} style={{ marginBottom: 2 }}>
              {me.display_name || "Spotify User"}
            </Title>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {me.product && <Tag color="blue">{me.product.toUpperCase()}</Tag>}
              {me.country && <Tag>{me.country}</Tag>}
            </div>
          </div>
        </Space>
      ) : (
        <Text type="secondary">No Spotify profile data available.</Text>
      )}
    </Card>
  );
};

export default SpotifyMiniProfile;
