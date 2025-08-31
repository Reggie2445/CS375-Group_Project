// src/components/GenreRecommendations.js
import React, { useState, useEffect } from 'react';
import { List, Avatar, Button, Spin, Tag, Space, Select } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
const { Text } = Typography;
const { Option } = Select;
const API_BASE = "http://127.0.0.1:8080";

// Popular genres to explore
const MUSIC_GENRES = [
  'indie', 'pop', 'rock', 'electronic', 'hip-hop', 'jazz', 'classical', 
  'alternative', 'country', 'folk', 'r&b', 'soul', 'funk', 'blues', 
  'reggae', 'metal', 'punk', 'ambient', 'techno', 'house'
];

const GenreRecommendations = () => {
  const [user] = useAuthState(auth);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('indie');
  // const [availableGenres, setAvailableGenres] = useState(MUSIC_GENRES); // Unused

  const fetchGenreRecommendations = async (genre) => {
    try {
      setLoading(true);
      
      // Search for popular tracks in the selected genre
      const searchQueries = [
        `genre:${genre}`,
        `year:2023 ${genre}`,
        `year:2024 ${genre}`,
        `${genre} popular`
      ];
      
      const allTracks = [];
      
      for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries to avoid rate limits
        try {
          const response = await fetch(
            `${API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
            { credentials: 'include' }
          );
          
          if (response.ok) {
            const data = await response.json();
            const tracks = data.tracks?.items || [];
            
            tracks.forEach(track => {
              if (track && track.id && track.popularity > 20) { // Filter for somewhat popular tracks
                allTracks.push({
                  ...track,
                  recommendationReason: `Popular in ${genre}`,
                  genreTag: genre
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to search for ${query}:`, error);
        }
      }
      
      // Remove duplicates and sort by popularity
      const uniqueTracks = allTracks.filter((track, index, self) => 
        index === self.findIndex(t => t.id === track.id)
      );
      
      uniqueTracks.sort((a, b) => b.popularity - a.popularity);
      
      setRecommendations(uniqueTracks.slice(0, 15));
      
    } catch (error) {
      console.error('Error fetching genre recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchGenreRecommendations(selectedGenre);
  }, [user, selectedGenre]);

  const handleGenreChange = (genre) => {
    setSelectedGenre(genre);
  };

  const handleRefresh = () => {
    fetchGenreRecommendations(selectedGenre);
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      {/* Genre Selection Controls */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Select
            value={selectedGenre}
            onChange={handleGenreChange}
            style={{ width: 120 }}
            size="small"
          >
            {availableGenres.map(genre => (
              <Option key={genre} value={genre}>
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </Option>
            ))}
          </Select>
          <Tag color="blue">{selectedGenre.toUpperCase()}</Tag>
        </Space>
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          size="small"
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Exploring {selectedGenre} music...</Text>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {recommendations.length} tracks found
            </Text>
          </div>
          
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
                      <Space size={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Popularity: {track.popularity}/100
                        </Text>
                        <Tag size="small" color="green">{track.genreTag}</Tag>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );
};

export default GenreRecommendations;
