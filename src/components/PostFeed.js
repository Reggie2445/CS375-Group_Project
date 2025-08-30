// src/components/PostFeed.js
import React, { useState, useEffect } from "react";
import {
  Card,
  Rate,
  Button,
  Space,
  Avatar,
  Typography,
  message,
  Spin,
  Input,
  List,
} from "antd";
import {
  HeartOutlined,
  HeartFilled,
  UserOutlined,
  CommentOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const PostFeed = ({ refreshTrigger }) => {
  const [user] = useAuthState(auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching posts:", error);
        message.error("Failed to load posts");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [refreshTrigger]);

  const handleLike = async (postId, likedBy) => {
    if (!user) {
      message.error("You must be logged in to like posts");
      return;
    }

    try {
      const postRef = doc(db, "posts", postId);
      const isLiked = likedBy.includes(user.uid);

      if (isLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        });
      }
    } catch (error) {
      console.error("Error updating like:", error);
      message.error("Failed to update like");
    }
  };

  const handleComment = async (postId) => {
    const commentText = commentInputs[postId];

    if (!user) {
      message.error("You must be logged in to comment");
      return;
    }

    if (!commentText || commentText.trim() === "") {
      message.error("Please enter a comment");
      return;
    }

    try {
      const postRef = doc(db, "posts", postId);
      const newComment = {
        id: Date.now().toString(),
        userId: user.uid,
        userEmail: user.email,
        text: commentText.trim(),
        createdAt: new Date(),
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
      });

      setCommentInputs((prev) => ({
        ...prev,
        [postId]: "",
      }));

      message.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      message.error("Failed to add comment");
    }
  };

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: value,
    }));
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";

    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 20 }}>
          <Text type="secondary">
            No posts yet. Be the first to share a song recommendation!
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
          size="middle"
        >
          Refresh Feed
        </Button>
      </div>

      {posts.map((post) => {
        console.log("Post Object", post);
        const isLiked = user && post.likedBy && post.likedBy.includes(user.uid);

        return (
          <Card
            key={post.id}
            style={{ marginBottom: 16 }}
            actions={[
              <Button
                type="text"
                icon={
                  isLiked ? (
                    <HeartFilled style={{ color: "#ff4d4f" }} />
                  ) : (
                    <HeartOutlined />
                  )
                }
                onClick={() => handleLike(post.id, post.likedBy || [])}
              >
                {post.likes || 0}
              </Button>,
              <Button
                type="text"
                icon={<CommentOutlined />}
                onClick={() => toggleComments(post.id)}
              >
                {post.comments ? post.comments.length : 0}
              </Button>,
            ]}
          >
            <Card.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <Space direction="vertical" size={0}>
                  <Text strong>{post.userEmail}</Text>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {formatDate(post.createdAt)}
                  </Text>
                </Space>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size={8}
                  >
                    {/* Top right: content type pill only (no timestamp here to avoid duplicate) */}
                    {post.contentType && (
                      <div
                        style={{ display: "flex", justifyContent: "flex-end" }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: "#f0f5ff",
                            color: "#1d39c4",
                          }}
                        >
                          {post.contentType.charAt(0).toUpperCase() +
                            post.contentType.slice(1)}
                        </span>
                      </div>
                    )}

                    <Space align="start" size={12} style={{ width: "100%" }}>
                      {/* Cover art if available */}
                      {post.imageUrl && (
                        <img
                          src={post.imageUrl}
                          alt={
                            post.name ||
                            post.songTitle ||
                            post.album ||
                            post.playlistName ||
                            "cover"
                          }
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            objectFit: "cover",
                          }}
                        />
                      )}

                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        {/* Title with robust fallbacks */}
                        <div>
                          <Text
                            strong
                            style={{ fontSize: 16, color: "#1890ff" }}
                          >
                            {post.name ||
                              post.songTitle ||
                              post.albumTitle ||
                              post.playlistName ||
                              "Untitled"}
                          </Text>
                          <br />

                          {/* Track/album artist (not for playlists) */}
                          {post.contentType !== "playlist" && (post.artist || post.albumArtist) && (
                            <Text type="secondary">by {post.artist || post.albumArtist}</Text>
                          )}

                          {/* Album line (show if album given; for album posts, label it as album) */}
                          {(post.album || post.contentType === "album") && (
                            <>
                              <br />
                              <Text type="secondary" italic>
                                {post.contentType === "album"
                                  ? "album"
                                  : "from"}{" "}
                                "{post.album || post.name}"
                              </Text>
                            </>
                          )}

                          {/* Playlist owner / track count */}
                          {post.contentType === "playlist" && (
                            <>
                              {post.ownerName && (
                                <Text type="secondary">
                                  by {post.ownerName}
                                </Text>
                              )}
                              {typeof post.trackCount === "number" && (
                                <>
                                  <br />
                                  <Text type="secondary">
                                    {post.trackCount} tracks
                                  </Text>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Rating */}
                        {post.rating > 0 && (
                          <div>
                            <Rate disabled value={post.rating} allowHalf />
                            <Text style={{ marginLeft: 8 }}>
                              ({post.rating}/5)
                            </Text>
                          </div>
                        )}

                        {/* Review */}
                        <Paragraph style={{ margin: 0 }}>
                          {post.review}
                        </Paragraph>

                        {/* Spotify link + likes */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {post.spotifyUrl && (
                            <Button
                              size="small"
                              href={post.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open in Spotify
                            </Button>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ❤️ {post.likes || 0} likes
                          </Text>
                        </div>
                      </Space>
                    </Space>
                  </Space>
                </div>
              }
            />

            {/* Comments Section */}
            {showComments[post.id] && (
              <div
                style={{
                  marginTop: 16,
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: 16,
                }}
              >
                {/* Comment Input */}
                <div style={{ marginBottom: 16 }}>
                  <TextArea
                    rows={2}
                    placeholder="Write a comment..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      handleCommentInputChange(post.id, e.target.value)
                    }
                    onPressEnter={(e) => {
                      e.preventDefault();
                      handleComment(post.id);
                    }}
                  />
                  <div style={{ marginTop: 8, textAlign: "right" }}>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleComment(post.id)}
                      disabled={
                        !commentInputs[post.id] ||
                        commentInputs[post.id].trim() === ""
                      }
                    >
                      Comment
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                {post.comments && post.comments.length > 0 && (
                  <List
                    itemLayout="horizontal"
                    dataSource={post.comments.sort((a, b) => {
                      // Sort comments by creation time (newest first)
                      const getTime = (comment) => {
                        if (comment.createdAt instanceof Date) {
                          return comment.createdAt.getTime();
                        } else if (
                          comment.createdAt &&
                          comment.createdAt.seconds
                        ) {
                          return comment.createdAt.seconds * 1000;
                        }
                        return 0;
                      };
                      return getTime(b) - getTime(a);
                    })}
                    renderItem={(comment) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar size="small" icon={<UserOutlined />} />
                          }
                          title={
                            <Space>
                              <Text strong style={{ fontSize: "13px" }}>
                                {comment.userEmail}
                              </Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: "12px" }}
                              >
                                {comment.createdAt instanceof Date
                                  ? formatDate({
                                      toDate: () => comment.createdAt,
                                    })
                                  : comment.createdAt &&
                                    comment.createdAt.seconds
                                  ? formatDate(comment.createdAt)
                                  : "Just now"}
                              </Text>
                            </Space>
                          }
                          description={
                            <Text style={{ fontSize: "14px" }}>
                              {comment.text}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}

                {(!post.comments || post.comments.length === 0) && (
                  <Text type="secondary" style={{ fontSize: "14px" }}>
                    No comments yet. Be the first to comment!
                  </Text>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default PostFeed;
