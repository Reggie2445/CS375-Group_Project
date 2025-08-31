// src/pages/RecommendationsPage.js
import React from 'react';
import { Layout, Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RecommendationsDashboard from '../components/RecommendationsDashboard';

const { Content, Header } = Layout;
const { Title } = Typography;

const RecommendationsPage = () => {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/main')}
            >
              Back to Feed
            </Button>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              🎵 Discover Music
            </Title>
          </Space>
        </div>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <RecommendationsDashboard />
      </Content>
    </Layout>
  );
};

export default RecommendationsPage;
