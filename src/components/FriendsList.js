// src/components/FriendsList.js
import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Button, Typography, message, Spin, Popconfirm } from 'antd';
import { UserOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { collection, query, where, onSnapshot, doc, deleteDoc, or } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { Text } = Typography;

const FriendsList = () => {
  const [user] = useAuthState(auth);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Query friendships where current user is either user1 or user2
    const friendshipsQuery = query(
      collection(db, 'friendships'),
      or(
        where('user1Id', '==', user.uid),
        where('user2Id', '==', user.uid)
      )
    );

    const unsubscribe = onSnapshot(friendshipsQuery, (snapshot) => {
      const friendships = snapshot.docs.map(doc => {
        const data = doc.data();
        // Determine which user is the friend (not the current user)
        const friend = data.user1Id === user.uid 
          ? { id: data.user2Id, email: data.user2Email }
          : { id: data.user1Id, email: data.user1Email };
        
        return {
          id: doc.id,
          friendshipId: doc.id,
          ...friend,
          createdAt: data.createdAt
        };
      });
      
      setFriends(friendships);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeFriend = async (friendshipId, friendEmail) => {
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      message.success(`Removed ${friendEmail} from your friends list`);
    } catch (error) {
      console.error('Error removing friend:', error);
      message.error('Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card title={`Your Friends (${friends.length})`}>
      {friends.length > 0 ? (
        <List
          dataSource={friends}
          renderItem={(friend) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="Remove friend?"
                  description={`Are you sure you want to remove ${friend.email} from your friends list?`}
                  onConfirm={() => removeFriend(friend.friendshipId, friend.email)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    danger
                    icon={<UserDeleteOutlined />}
                    size="small"
                  >
                    Remove
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={friend.email}
                description={`Friends since ${friend.createdAt?.toDate()?.toLocaleDateString() || 'recently'}`}
              />
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Text type="secondary">
            No friends yet. Search for users to send friend requests!
          </Text>
        </div>
      )}
    </Card>
  );
};

export default FriendsList;
