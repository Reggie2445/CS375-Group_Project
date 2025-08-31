// src/components/RecommendationsDashboard.js
import React, { useState } from 'react';
import { Collapse, Typography, Space, Badge } from 'antd';
import { UserOutlined, SearchOutlined, CaretRightOutlined } from '@ant-design/icons';
import SimpleRecommendations from './SimpleRecommendations';
import GenreRecommendations from './GenreRecommendations';

const { Title } = Typography;

const RecommendationsDashboard = () => {
  const [activeKeys, setActiveKeys] = useState(['1']); // Default to first panel open

  const handleCollapseChange = (keys) => {
    setActiveKeys(keys);
  };

  const collapseItems = [
    {
      key: '1',
      label: (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>Personalized For You</span>
        </Space>
      ),
      children: <SimpleRecommendations />,
      style: { marginBottom: 8 }
    },
    {
      key: '2',
      label: (
        <Space>
          <SearchOutlined style={{ color: '#722ed1' }} />
          <span style={{ fontWeight: 500 }}>Explore by Genre</span>
        </Space>
      ),
      children: <GenreRecommendations />,
      style: { marginBottom: 8 }
    }
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <Title level={3} style={{ marginBottom: 20, textAlign: 'center' }}>
        🎵 Discover New Music
      </Title>
      
      <Collapse
        activeKey={activeKeys}
        onChange={handleCollapseChange}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined 
            rotate={isActive ? 90 : 0} 
            style={{ fontSize: 14, color: '#1890ff' }}
          />
        )}
        items={collapseItems}
        size="large"
        ghost={false}
        style={{
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      />
    </div>
  );
};

export default RecommendationsDashboard;
