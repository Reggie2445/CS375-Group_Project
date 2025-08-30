// src/components/CreatePost.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Rate,
  message,
  Space,
  AutoComplete,
  Select,
} from "antd";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";

const { TextArea } = Input;

const API_BASE = "http://127.0.0.1:8080";

const SHARE_TYPES = {
  SONG: "song",
  ALBUM: "album",
  PLAYLIST: "playlist",
};

const CreatePost = ({ onPostCreated }) => {
  const [user] = useAuthState(auth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [songOptions, setSongOptions] = useState([]);
  const [setIsAuthenticated] = useState(false);
  const [shareType, setShareType] = useState(SHARE_TYPES.SONG);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  const searchItems = async (query) => {
    if (!query) return;
    try {
      const res = await fetch(
        `${API_BASE}/search?type=${shareType === SHARE_TYPES.SONG ? "track" : shareType}&q=${encodeURIComponent(
          query
        )}`,
        { credentials: "include" }
      );

      const data = await res.json();

      let options = [];
      if (shareType === SHARE_TYPES.SONG) {
        const items = data.tracks?.items || [];
        options = items.map((t) => ({
          value: t.id,
          label: `${t.name} — ${t.artists?.map((a) => a.name).join(", ")} — ${t.album?.name}`,
          meta: {
            id: t.id,
            type: "track",
            title: t.name,
            artists: t.artists?.map((a) => a.name) || [],
            album: t.album?.name || "",
            url: t.external_urls?.spotify,
            image: t.album?.images?.[0]?.url || "",
          },
        }));
      } else if (shareType === SHARE_TYPES.ALBUM) {
        const items = data.albums?.items || [];
        options = items.map((a) => ({
          value: a.id,
          label: `${a.name} — ${a.artists?.map((ar) => ar.name).join(", ")}`,
          meta: {
            id: a.id,
            type: "album",
            title: a.name,
            artists: a.artists?.map((ar) => ar.name) || [],
            url: a.external_urls?.spotify,
            image: a.images?.[0]?.url || "",
          },
        }));
      } else if (shareType === SHARE_TYPES.PLAYLIST) {
        const items = (data.playlists?.items || [])
          .filter(Boolean)
          .filter((p) => p?.id && p?.name);
        options = items.map((p) => ({
          value: String(p.id),
          label: `${p.name} — by ${p.owner?.display_name ?? "Unknown"}`,
          meta: {
            id: p.id,
            type: "playlist",
            title: p.name,
            owner: p.owner?.display_name ?? "",
            url: p.external_urls?.spotify ?? "",
            image: p.images?.[0]?.url ?? "",
          },
        }));
      }


      setSongOptions(options);
    } catch (err) {
      console.error("Spotify search failed:", err);
    }
  };

  const selectFromSearch = (selectedId) => {
    const opt = songOptions.find((o) => o.value === selectedId);
    if (!opt) return;
    const { meta } = opt;

    if (shareType === SHARE_TYPES.SONG) {
      form.setFieldsValue({
        songTitle: meta.title,
        artist: meta.artists?.join(", "),
        album: meta.album || "",
        spotifyId: meta.id,
        spotifyUrl: meta.url || "",
      });
    } else if (shareType === SHARE_TYPES.ALBUM) {
      form.setFieldsValue({
        albumTitle: meta.title,
        albumArtist: meta.artists?.join(", "),
        spotifyId: meta.id,
        spotifyUrl: meta.url || "",
      });
    } else if (shareType === SHARE_TYPES.PLAYLIST) {
      form.setFieldsValue({
        playlistName: meta.title,
        playlistOwner: meta.owner || "",
        spotifyId: meta.id,
        spotifyUrl: meta.url || "",
      });
    }
  };

  const handleTypeChange = (val) => {
    setShareType(val);
    setSongOptions([]);
    form.resetFields([
      "songTitle",
      "artist",
      "album",
      "albumTitle",
      "albumArtist",
      "playlistName",
      "playlistOwner",
      "spotifyId",
      "spotifyUrl",
    ]);
  };

  const placeholder = useMemo(() => {
    if (shareType === SHARE_TYPES.SONG) return "Search songs by title or artist…";
    if (shareType === SHARE_TYPES.ALBUM) return "Search albums by title or artist…";
    return "Search playlists by name…";
  }, [shareType]);

  const onFinish = async (values) => {
    if (!user) {
      message.error("You must be logged in to create a post");
      return;
    }

    setLoading(true);
    try {
      const base = {
        shareType,
        review: values.review,
        rating: values.rating || 0,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: [],
        spotify: {
          id: values.spotifyId || null,
          url: values.spotifyUrl || null,
          meta:
            shareType === SHARE_TYPES.SONG
              ? {
                title: values.songTitle,
                artists: values.artist,
                album: values.album || "",
              }
              : shareType === SHARE_TYPES.ALBUM
                ? {
                  title: values.albumTitle,
                  artists: values.albumArtist,
                }
                : {
                  title: values.playlistName,
                  owner: values.playlistOwner || "",
                },
        },
      };
      const postData =
        shareType === SHARE_TYPES.SONG
          ? {
            ...base,
            songTitle: values.songTitle,
            artist: values.artist,
            album: values.album || "",
          }
          : shareType === SHARE_TYPES.ALBUM
            ? {
              ...base,
              albumTitle: values.albumTitle,
              albumArtist: values.albumArtist,
            }
            : {
              ...base,
              playlistName: values.playlistName,
              playlistOwner: values.playlistOwner || "",
            };

      await addDoc(collection(db, "posts"), postData);

      form.resetFields();
      setSongOptions([]);

      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      message.error("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Share a Recommendation" style={{ marginBottom: 20 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item label="I'm sharing a…" required>
          <Select
            value={shareType}
            onChange={handleTypeChange}
            options={[
              { label: "Song", value: SHARE_TYPES.SONG },
              { label: "Album", value: SHARE_TYPES.ALBUM },
              { label: "Playlist", value: SHARE_TYPES.PLAYLIST },
            ]}
          />
        </Form.Item>
        {shareType === SHARE_TYPES.SONG && (
          <>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item
                name="songTitle"
                label="Song"
                rules={[{ required: true, message: "Please select a song!" }]}
                style={{ flex: 1, marginRight: 8 }}
              >
                <AutoComplete
                  options={songOptions}
                  onSearch={searchItems}
                  onSelect={selectFromSearch}
                  placeholder={placeholder}
                  filterOption={false}
                >
                  <Input />
                </AutoComplete>
              </Form.Item>

              <Form.Item
                name="artist"
                label="Artist(s)"
                rules={[{ required: true, message: "Please add the artist(s)!" }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="Artist names (comma-separated OK)" />
              </Form.Item>
            </Space.Compact>

            <Form.Item name="album" label="Album (Optional)">
              <Input placeholder="Album name" />
            </Form.Item>
          </>
        )}

        {shareType === SHARE_TYPES.ALBUM && (
          <>
            <Form.Item
              name="albumTitle"
              label="Album"
              rules={[{ required: true, message: "Please select an album!" }]}
            >
              <AutoComplete
                options={songOptions}
                onSearch={searchItems}
                onSelect={selectFromSearch}
                placeholder={placeholder}
                filterOption={false}
              >
                <Input />
              </AutoComplete>
            </Form.Item>

            <Form.Item
              name="albumArtist"
              label="Artist(s)"
              rules={[{ required: true, message: "Please add the artist(s)!" }]}
            >
              <Input placeholder="Artist names (comma-separated OK)" />
            </Form.Item>
          </>
        )}

        {shareType === SHARE_TYPES.PLAYLIST && (
          <>
            <Form.Item
              name="playlistName"
              label="Playlist"
              rules={[{ required: true, message: "Please select a playlist!" }]}
            >
              <AutoComplete
                options={songOptions}
                onSearch={searchItems}
                onSelect={selectFromSearch}
                placeholder={placeholder}
                filterOption={false}
              >
                <Input />
              </AutoComplete>
            </Form.Item>

            <Form.Item name="playlistOwner" label="Creator (Optional)">
              <Input placeholder="Playlist owner/creator" />
            </Form.Item>
          </>
        )}

        <Form.Item name="spotifyId" hidden><Input /></Form.Item>
        <Form.Item name="spotifyUrl" hidden><Input /></Form.Item>

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
            placeholder="Why do you recommend this?"
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
