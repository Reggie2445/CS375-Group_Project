// src/components/CreatePost.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, Rate, message, Space } from 'antd';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { TextArea } = Input;

const CreatePost = ({ onPostCreated }) => {
  const [user] = useAuthState(auth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (!user) {
      message.error('You must be logged in to create a post');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        songTitle: values.songTitle,
        artist: values.artist,
        album: values.album || '',
        review: values.review,
        rating: values.rating || 0,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: []
      };

      await addDoc(collection(db, 'posts'), postData);
      
      message.success('Song recommendation posted successfully!');
      form.resetFields();
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      message.error('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Share a Song Recommendation" style={{ marginBottom: 20 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item
            name="songTitle"
            label="Song Title"
            rules={[{ required: true, message: 'Please enter the song title!' }]}
            style={{ flex: 1, marginRight: 8 }}
          >
            <Input placeholder="Enter song title" />
          </Form.Item>
          
          <Form.Item
            name="artist"
            label="Artist"
            rules={[{ required: true, message: 'Please enter the artist name!' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter artist name" />
          </Form.Item>
        </Space.Compact>

        <Form.Item
          name="album"
          label="Album (Optional)"
        >
          <Input placeholder="Enter album name" />
        </Form.Item>

        <Form.Item
          name="rating"
          label="Rating"
        >
          <Rate allowHalf />
        </Form.Item>

        <Form.Item
          name="review"
          label="Your Review/Recommendation"
          rules={[{ required: true, message: 'Please write your review!' }]}
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
