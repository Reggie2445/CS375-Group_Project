// src/components/UserPosts.js
import React, { useState, useEffect } from 'react';
import { Card, Rate, Button, Space, Typography, message, Spin, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { Text, Paragraph, Title } = Typography;

const UserPosts = () => {
  const [user] = useAuthState(auth);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editForm, setEditForm] = useState({
    songTitle: '',
    artist: '',
    album: '',
    review: '',
    rating: 0
  });

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
      
      postsData.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        
        return bTime.toMillis() - aTime.toMillis();
      });
      
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
      window.location.reload();
    } catch (error) {
      console.error('Error deleting post:', error);
      message.error('Failed to delete post');
    }
  };

  const handleEditClick = (post) => {
    setEditingPostId(post.id);
    setEditForm({
      songTitle: post.songTitle,
      artist: post.artist,
      album: post.album || '',
      review: post.review,
      rating: post.rating || 0
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditRating = (value) => {
    setEditForm(prev => ({
      ...prev,
      rating: value
    }));
  };

  const handleEditSave = async (postId) => {
    try {
      const postRef = doc(db, 'posts', postId);      
      await updateDoc(postRef, {
        songTitle: editForm.songTitle,
        artist: editForm.artist,
        album: editForm.album,
        review: editForm.review,
        rating: editForm.rating,
        updatedAt: new Date()
      });
      
      message.success('Post updated successfully');
      
      window.location.reload();
    } catch (error) {
      console.error('Error updating post:', error);
      message.error('Failed to update post');
    }
  };

  const handleEditCancel = () => {
    setEditingPostId(null);
    setEditForm({
      songTitle: '',
      artist: '',
      album: '',
      review: '',
      rating: 0
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPostTimestamp = (post) => {
    if (post.updatedAt) {
      return `Updated ${formatDate(post.updatedAt)}`;
    }
    return `Posted ${formatDate(post.createdAt)}`;
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
        Your Recommendations ({userPosts.length})
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
              editingPostId === post.id ? null : (
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEditClick(post)}
                >
                  Edit
                </Button>
              ),
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
            {editingPostId === post.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditSave(post.id);
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Editing ({getPostTimestamp(post)})
                  </Text>
                </div>
                
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Song Title:</Text>
                    <input
                      name="songTitle"
                      value={editForm.songTitle}
                      onChange={handleEditChange}
                      placeholder="Song Title"
                      style={{ 
                        width: '100%', 
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Artist:</Text>
                    <input
                      name="artist"
                      value={editForm.artist}
                      onChange={handleEditChange}
                      placeholder="Artist"
                      style={{ 
                        width: '100%', 
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Album (optional):</Text>
                    <input
                      name="album"
                      value={editForm.album}
                      onChange={handleEditChange}
                      placeholder="Album"
                      style={{ 
                        width: '100%', 
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Rating:</Text>
                    <Rate 
                      allowHalf 
                      value={editForm.rating} 
                      onChange={handleEditRating}
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Review:</Text>
                    <textarea
                      name="review"
                      value={editForm.review}
                      onChange={handleEditChange}
                      placeholder="Your review/recommendation"
                      rows={4}
                      style={{ 
                        width: '100%', 
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                      required
                    />
                  </div>
                  
                  <Space>
                    <Button type="primary" htmlType="submit" size="small">
                      Save Changes
                    </Button>
                    <Button onClick={handleEditCancel} size="small">
                      Cancel
                    </Button>
                  </Space>
                </Space>
              </form>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {getPostTimestamp(post)}
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
              </>
            )}
          </Card>
        ))
      )}
    </div>
  );
};

export default UserPosts;
