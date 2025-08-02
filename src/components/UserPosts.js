// src/components/UserPosts.js
import React, { useState, useEffect } from 'react';
import { Card, Rate, Button, Space, Typography, message, Spin, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { Text, Paragraph, Title } = Typography;

const UserPosts = () => {
  const [user] = useAuthState(auth);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const userPostsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(userPostsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user posts:', error);
      message.error('Failed to load your posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (postId) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      message.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      message.error('Failed to delete post');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Text type="secondary">Please log in to view your posts</Text>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 20 }}>
        Your Song Recommendations ({userPosts.length})
      </Title>
      
      {userPosts.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Text type="secondary">You haven't posted any song recommendations yet!</Text>
          </div>
        </Card>
      ) : (
        userPosts.map((post) => (
          <Card
            key={post.id}
            style={{ marginBottom: 16 }}
            actions={[
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => message.info('Edit functionality coming soon')}
              >
                Edit
              </Button>,
              <Popconfirm
                title="Delete this post?"
                description="Are you sure you want to delete this song recommendation?"
                onConfirm={() => handleDelete(post.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            ]}
          >
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Posted {formatDate(post.createdAt)}
              </Text>
            </div>
            
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div>
                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  {post.songTitle}
                </Text>
                <br />
                <Text type="secondary">by {post.artist}</Text>
                {post.album && (
                  <>
                    <br />
                    <Text type="secondary" italic>from "{post.album}"</Text>
                  </>
                )}
              </div>
              
              {post.rating > 0 && (
                <div>
                  <Rate disabled defaultValue={post.rating} allowHalf />
                  <Text style={{ marginLeft: 8 }}>({post.rating}/5)</Text>
                </div>
              )}
              
              <Paragraph style={{ margin: 0 }}>
                {post.review}
              </Paragraph>
              
              <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ❤️ {post.likes || 0} likes
                </Text>
              </div>
            </Space>
          </Card>
        ))
      )}
    </div>
  );
};

export default UserPosts;
