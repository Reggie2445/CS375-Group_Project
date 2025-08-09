// src/components/PostFeed.js
import React, { useState, useEffect } from 'react';
import { Card, Rate, Button, Space, Avatar, Typography, message, Spin } from 'antd';
import { HeartOutlined, HeartFilled, UserOutlined } from '@ant-design/icons';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { Text, Paragraph } = Typography;

const PostFeed = ({ refreshTrigger }) => {
  const [user] = useAuthState(auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      message.error('Failed to load posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshTrigger]);

  const handleLike = async (postId, likedBy) => {
    if (!user) {
      message.error('You must be logged in to like posts');
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const isLiked = likedBy.includes(user.uid);

      if (isLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      message.error('Failed to update like');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Text type="secondary">No posts yet. Be the first to share a song recommendation!</Text>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {posts.map((post) => {
        const isLiked = user && post.likedBy && post.likedBy.includes(user.uid);
        
        return (
          <Card
            key={post.id}
            style={{ marginBottom: 16 }}
            actions={[
              <Button
                type="text"
                icon={isLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                onClick={() => handleLike(post.id, post.likedBy || [])}
              >
                {post.likes || 0}
              </Button>
            ]}
          >
            <Card.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <Space direction="vertical" size={0}>
                  <Text strong>{post.userEmail}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatDate(post.createdAt)}
                  </Text>
                </Space>
              }
              description={
                <div style={{ marginTop: 8 }}>
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
                  </Space>
                </div>
              }
            />
          </Card>
        );
      })}
    </div>
  );
};

export default PostFeed;
