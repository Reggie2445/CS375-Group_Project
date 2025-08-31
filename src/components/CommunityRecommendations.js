// src/components/CommunityRecommendations.js
import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Button, Typography, Spin, Space, Rate, Tag } from 'antd';
import { PlayCircleOutlined, UserOutlined, StarOutlined } from '@ant-design/icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

const { Title, Text } = Typography;

const CommunityRecommendations = () => {
  const [user] = useAuthState(auth);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCommunityRecommendations = async () => {
      try {
        setLoading(true);
        
        // Get highly rated posts from other users
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '!=', user.uid),
          orderBy('userId'), 
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(postsQuery);
        const posts = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Only include posts with good ratings (4+ stars) or high likes
          if ((data.rating && data.rating >= 4) || (data.likes && data.likes >= 3)) {
            posts.push({
              id: doc.id,
              ...data,
              recommendationReason: data.rating >= 4 
                ? `Highly rated (${data.rating}★) by community`
                : `Popular (${data.likes} likes) in community`,
              communityScore: (data.rating || 0) * 2 + (data.likes || 0)
            });
          }
        });
        
        // Sort by community score (rating * 2 + likes)
        posts.sort((a, b) => b.communityScore - a.communityScore);
        
        setRecommendations(posts.slice(0, 10));
        
      } catch (error) {
        console.error('Error fetching community recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityRecommendations();
  }, [user]);

  const searchSpotifyTrack = async (songTitle, artist) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8080/search?q=${encodeURIComponent(`track:"${songTitle}" artist:"${artist}"`)}&type=track&limit=1`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.tracks?.items?.[0] || null;
      }
    } catch (error) {
      console.warn('Failed to search Spotify for track:', error);
    }
    return null;
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Finding community favorites...</Text>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <Text type="secondary">
          No highly-rated posts from the community yet. Be the first to share!
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        Top-rated songs from your community • {recommendations.length} recommendations
      </Text>
      
      <List
        itemLayout="horizontal"
        dataSource={recommendations}
        renderItem={(post) => (
          <List.Item
            actions={[
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={async () => {
                  const track = await searchSpotifyTrack(post.songTitle, post.artist);
                  if (track?.external_urls?.spotify) {
                    window.open(track.external_urls.spotify, '_blank');
                  } else {
                    // Fallback to general search
                    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(post.songTitle + ' ' + post.artist)}`;
                    window.open(searchUrl, '_blank');
                  }
                }}
                size="small"
              >
                Find on Spotify
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar 
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                  size={48}
                />
              }
              title={
                <Space direction="vertical" size={2}>
                  <Text strong>{post.songTitle}</Text>
                  <Text type="secondary">by {post.artist}</Text>
                  {post.album && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      from "{post.album}"
                    </Text>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={4}>
                  <div>
                    {post.rating > 0 && (
                      <Space size={4}>
                        <Rate disabled value={post.rating} style={{ fontSize: 12 }} />
                        <Text style={{ fontSize: 12 }}>({post.rating}/5)</Text>
                      </Space>
                    )}
                    {post.likes > 0 && (
                      <Tag color="red" style={{ marginLeft: 8 }}>
                        ❤️ {post.likes}
                      </Tag>
                    )}
                  </div>
                  
                  <Text style={{ fontSize: 12 }} ellipsis={{ rows: 2 }}>
                    "{post.review}"
                  </Text>
                  
                  <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                    {post.recommendationReason}
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

export default CommunityRecommendations;
