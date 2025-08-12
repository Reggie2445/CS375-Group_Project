// src/components/CreatePost.js
import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Rate,
  message,
  Space,
  AutoComplete,
} from "antd";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";

const { TextArea } = Input;
const API_BASE = "http://127.0.0.1:8080";

const CreatePost = ({ onPostCreated }) => {
  const [user] = useAuthState(auth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [songOptions, setSongOptions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  const token = localStorage.getItem("spotify_access_token");

  const onFinish = async (values) => {
    if (!user) {
      message.error("You must be logged in to create a post");
      return;
    }

    setLoading(true);
    try {
      const postData = {
        songTitle: values.songTitle,
        artist: values.artist,
        album: values.album || "",
        review: values.review,
        rating: values.rating || 0,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      };

      await addDoc(collection(db, "posts"), postData);

      form.resetFields();

      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("Error creating post:", error);
      message.error("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  checkAuthStatus();
}, []);

const checkAuthStatus = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/status`, {
      credentials: "include",
    });
    setIsAuthenticated(res.ok);
  } catch (err) {
    setIsAuthenticated(false);
  }
};

  const searchSongs = async (query) => {
    if (!query) return;

    try {
      const res = await fetch(
        `${API_BASE}/songs?q=${encodeURIComponent(query)}`,
        {
          credentials: "include",
        }
      );

      const data = await res.json();
      const tracks = data.tracks?.items || [];
      const options = tracks.map((track) => ({
        value: track.id,
        label: `${track.name} - ${track.artists
          .map((a) => a.name)
          .join(", ")} - ${track.album.name}`,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        album: track.album.name,
      }));
      setSongOptions(options);
    } catch (err) {
      console.error("Spotify search failed:", err);
    }
  };

  const selectSong = (selectedId) => {
    const track = songOptions.find((option) => option.value === selectedId);
    if (!track) return;
    form.setFieldsValue({
      songTitle: track.title,
      artist: track.artist,
      album: track.album,
    });
  };

  console.log(token);

  return (
    <Card title="Share a Song Recommendation" style={{ marginBottom: 20 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Space.Compact style={{ width: "100%" }}>
          <Form.Item
            name="songTitle"
            label="Song Title"
            rules={[
              { required: true, message: "Please enter the song title!" },
            ]}
            style={{ flex: 1, marginRight: 8 }}
          >
            <AutoComplete
              options={songOptions}
              onSearch={searchSongs}
              onSelect={selectSong}
              placeholder="Enter song title"
            >
              <Input />
            </AutoComplete>
          </Form.Item>

          <Form.Item
            name="artist"
            label="Artist"
            rules={[
              { required: true, message: "Please enter the artist name!" },
            ]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter artist name" />
          </Form.Item>
        </Space.Compact>

        <Form.Item name="album" label="Album (Optional)">
          <Input placeholder="Enter album name" />
        </Form.Item>

        <Form.Item name="rating" label="Rating">
          <Rate allowHalf />
        </Form.Item>

        <Form.Item
          name="review"
          label="Your Review/Recommendation"
          rules={[{ required: true, message: "Please write your review!" }]}
        >
          <TextArea
            rows={4}
            placeholder="Share your thoughts about this song. Why do you recommend it?"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Post Recommendation
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreatePost;
