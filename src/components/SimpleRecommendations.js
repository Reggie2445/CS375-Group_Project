// src/components/SimpleRecommendations.js
import React, { useState, useEffect } from 'react';
import { List, Avatar, Button, Typography, Spin, Empty, Space } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
const { Text } = Typography;
const API_BASE = "http://127.0.0.1:8080";

const SimpleRecommendations = () => {
  const [user] = useAuthState(auth);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAlternativeRecommendations = async () => {
      try {
        setLoading(true);
        
        // Use the new alternative-recommendations endpoint
        const response = await fetch(`${API_BASE}/alternative-recommendations?limit=15`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        
        const data = await response.json();
        setRecommendations(data.tracks || []);
        
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlternativeRecommendations();
  }, [user]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Finding music based on your taste...</Text>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Empty 
        description="No recommendations available. Try listening to more music on Spotify!"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: 20 }}
      />
    );
  }

  return (
    <div>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        Based on your favorite artists • {recommendations.length} tracks found
      </Text>
      
      <List
        itemLayout="horizontal"
        dataSource={recommendations}
        renderItem={(track) => (
          <List.Item
            actions={[
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                href={track.external_urls?.spotify}
                target="_blank"
                size="small"
              >
                Play
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar 
                  shape="square" 
                  size={48}
                  src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url} 
                  alt={track.name}
                />
              }
              title={
                <Space direction="vertical" size={2}>
                  <Text strong>{track.name}</Text>
                  <Text type="secondary">
                    {track.artists?.map(a => a.name).join(', ')}
                  </Text>
                </Space>
              }
              description={
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {track.album?.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                    {track.recommendationReason}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default SimpleRecommendations;
