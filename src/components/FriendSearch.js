// src/components/FriendSearch.js
import React, { useState } from 'react';
import { Card, Input, Button, List, Avatar, message, Space, Typography } from 'antd';
import { UserOutlined, UserAddOutlined } from '@ant-design/icons';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { Search } = Input;
const { Text } = Typography;

const FriendSearch = () => {
  const [user] = useAuthState(auth);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      console.log('Searching for:', searchTerm.toLowerCase());
      
      // Search by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '>=', searchTerm.toLowerCase()),
        where('email', '<=', searchTerm.toLowerCase() + '\uf8ff')
      );
      
      const snapshot = await getDocs(usersQuery);
      console.log('Found users:', snapshot.docs.length);
      
      const users = snapshot.docs.map(doc => {
        console.log('User doc:', doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        };
      }).filter(u => u.id !== user.uid);

      console.log('Filtered users:', users);
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      message.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId, targetUserEmail) => {
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        toUserId: targetUserId,
        toUserEmail: targetUserEmail,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setSentRequests(prev => new Set([...prev, targetUserId]));
      message.success(`Friend request sent to ${targetUserEmail}`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      message.error('Failed to send friend request');
    }
  };

  return (
    <Card title="Find Friends" style={{ marginBottom: 20 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Search
          placeholder="Search users by email"
          enterButton="Search"
          size="large"
          loading={loading}
          onSearch={searchUsers}
          onChange={(e) => {
            if (!e.target.value.trim()) {
              setSearchResults([]);
            }
          }}
        />


        {searchResults.length > 0 && (
          <List
            dataSource={searchResults}
            renderItem={(foundUser) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => sendFriendRequest(foundUser.id, foundUser.email)}
                    disabled={sentRequests.has(foundUser.id)}
                    size="small"
                  >
                    {sentRequests.has(foundUser.id) ? 'Request Sent' : 'Add Friend'}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={foundUser.email}
                  description={`User since ${foundUser.createdAt?.toDate()?.toLocaleDateString() || 'Recently'}`}
                />
              </List.Item>
            )}
          />
        )}

        {searchResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Text type="secondary">
              Search for users by their email address to send friend requests
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default FriendSearch;
