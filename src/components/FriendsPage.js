// src/components/FriendsPage.js
import React, { useState } from 'react';
import { Tabs, Space } from 'antd';
import { UserAddOutlined, TeamOutlined, BellOutlined } from '@ant-design/icons';
import FriendSearch from './FriendSearch';
import FriendRequests from './FriendRequests';
import FriendsList from './FriendsList';

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState('friends');

  const tabItems = [
    {
      key: 'friends',
      label: (
        <Space>
          <TeamOutlined />
          My Friends
        </Space>
      ),
      children: <FriendsList />
    },
    {
      key: 'search',
      label: (
        <Space>
          <UserAddOutlined />
          Find Friends
        </Space>
      ),
      children: <FriendSearch />
    },
    {
      key: 'requests',
      label: (
        <Space>
          <BellOutlined />
          Requests
        </Space>
      ),
      children: <FriendRequests />
    }
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default FriendsPage;
