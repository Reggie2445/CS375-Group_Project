import express from "express";
import axios from "axios";
import cookieSession from "cookie-session";
import cors from "cors";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import env from "./env.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? true
    : ["http://127.0.0.1:3000"],
  credentials: true
}));

app.use(cookieSession({
  name: "sess",
  keys: [env.SESSION_SECRET || "dev-secret"],
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000,
}));

const SPOTIFY_CLIENT_ID = env.client_id;
const SPOTIFY_CLIENT_SECRET = env.client_secret;
const SPOTIFY_REDIRECT_URI = process.env.NODE_ENV === "production"
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/auth/callback`
  : env.redirect_uri;
const store = new Map();  // sid = { accessToken, refreshToken, expiresAt }
const stateStore = new Map();

function loginScope() {
  return [
    "user-read-email",
    "user-read-private",
    "user-top-read",
    "user-read-recently-played",
  ].join(" ");
}

setInterval(() => {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  for (const [key, value] of stateStore.entries()) {
    if (value.createdAt < fifteenMinutesAgo) {
      stateStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

app.get("/auth/login", (req, res) => {
  console.log("=== AUTH LOGIN ===");
  console.log("Initial session:", req.session);
  
  if (!req.session.sid) {
    req.session.sid = crypto.randomUUID();
  }
  
  const sessionId = req.session.sid;
  const state = crypto.randomBytes(16).toString("hex");
  
  stateStore.set(state, {
    sid: sessionId,
    createdAt: Date.now()
  });
  
  req.session.state = state;

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: loginScope(),
    state,
  }).toString();
  
  console.log("Redirecting to:", authUrl.toString());
  res.redirect(authUrl.toString());
});

app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }
  
  const stateData = stateStore.get(state);
  console.log("State data from memory:", stateData);
  
  if (!stateData) {
    console.log("Available states:", Array.from(stateStore.keys()));
    return res.status(400).send("Invalid or expired state");
  }
  
  // Get session ID from state data
  const sessionId = stateData.sid;
  console.log("Using session ID:", sessionId);
  
  // Clean up used state
  stateStore.delete(state);
  
  try {
    console.log("Exchanging code for tokens...");
    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    console.log("Got tokens, expires in:", expires_in);
    
    // Store tokens using the session ID
    store.set(sessionId, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
    });
    
    req.session.sid = sessionId;
    
    console.log("Tokens stored for session:", sessionId);
    console.log("Token store size:", store.size);
    
    const redirectUrl = process.env.NODE_ENV === "production" 
      ? "/main"
      : "http://127.0.0.1:3000/main";
    res.redirect(redirectUrl);
  } catch (e) {
    console.error("Token exchange failed:", e.response?.data || e.message);
    res.status(500).send("Token exchange failed");
  }
});

async function ensureAccessToken(req) {
  console.log("Session:", req.session);
  console.log("Session ID:", req.session?.sid);
  
  const sessionId = req.session?.sid;
  if (!sessionId) {
    console.log("No session ID found");
    throw new Error("No session ID - not authenticated");
  }
  
  const rec = store.get(sessionId);
  console.log("Token record:", rec ? "Found" : "Not found");
  
  if (!rec) {
    console.log("Available session IDs:", Array.from(store.keys()));
    throw new Error("Not authenticated");
  }

  if (Date.now() >= rec.expiresAt - 5000) {
    console.log("Refreshing access token...");
    try {
      const refreshRes = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: rec.refreshToken,
          client_id: SPOTIFY_CLIENT_ID,
          client_secret: SPOTIFY_CLIENT_SECRET,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      
      rec.accessToken = refreshRes.data.access_token;
      rec.expiresAt = Date.now() + refreshRes.data.expires_in * 1000;
      store.set(sessionId, rec);
      console.log("Token refreshed successfully");
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError.response?.data || refreshError.message);
      throw new Error("Token refresh failed");
    }
  }
  
  return rec.accessToken;
}

app.get("/auth/status", (req, res) => {
  const sessionId = req.session?.sid;
  if (!sessionId) {
    return res.status(401).json({ authenticated: false, reason: "No session ID" });
  }
  
  const rec = store.get(sessionId);
  if (rec && Date.now() < rec.expiresAt - 5000) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authentifcated: false, reason: "No valid token" });
  }
});

app.get("/auth/logout", (req, res) => {
  const sessionId = req.session?.sid;
  if (sessionId) {
    store.delete(sessionId);
    console.log("Logged out session:", sessionId);
  }
  req.session = null;
  res.json({ success: true });
});

app.get("/search", async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    let { q = "", type = "track", limit = "10" } = req.query;

    type = String(type).toLowerCase();
    if (!["track", "album", "playlist"].includes(type)) {
      return res.status(400).json({ error: "Invalid type. Use track|album|playlist" });
    }
    if (!q) return res.status(400).json({ error: "Missing q" });
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${encodeURIComponent(limit)}`;
    const r = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });

    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.message, details: e.response?.data });
  }
});

app.get("/profile", async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    const url = "https://api.spotify.com/v1/me";
    const r = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    res.json(r.data);
    console.log("Profile data:", r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.message, details: e.response?.data });
  
}});


app.get("/spotify/top/:type", async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    const { type } = req.params;
    const { time_range = "short_term", limit = 25, offset = 0 } = req.query;

    if (!["tracks", "artists"].includes(type)) {
      return res.status(400).json({ error: "type must be 'tracks' or 'artists'" });
    }

    const url = `https://api.spotify.com/v1/me/top/${type}?time_range=${encodeURIComponent(time_range)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
    const r = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    res.json(r.data);
    console.log(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.message, details: e.response?.data });
  }


});

app.get("/spotify/recent", async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    const { limit = 50 } = req.query;
    const url = `https://api.spotify.com/v1/me/player/recently-played?limit=${encodeURIComponent(limit)}`;
    const r = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    res.json(r.data);
    console.log(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.message, details: e.response?.data });
  }
});

// Get recommendations based on user's listening history
app.get("/alternative-recommendations", async (req, res) => {
  try {
    const token = await ensureAccessToken(req);
    const { limit = 20 } = req.query;
    
    // Get user's top artists
    const topArtistsUrl = "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=5";
    const topArtistsResponse = await axios.get(topArtistsUrl, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    const topArtists = topArtistsResponse.data.items || [];
    console.log('🎤 Top artists for alternative recommendations:', topArtists.length);
    
    if (topArtists.length === 0) {
      return res.json({ tracks: [], message: "No listening history found" });
    }
    
    const allTracks = [];
    
    // For each top artist, get their albums and tracks
    for (const artist of topArtists.slice(0, 3)) {
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artist.name)}"&type=track&limit=10&market=US`;
        const searchResponse = await axios.get(searchUrl, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        const tracks = searchResponse.data.tracks?.items || [];
        tracks.forEach(track => {
          if (track && track.id) {
            allTracks.push({
              ...track,
              recommendationReason: `More from ${artist.name}`,
              similarity: Math.random() * 0.3 + 0.7
            });
          }
        });
        
        const albumsUrl = `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album&market=US&limit=3`;
        const albumsResponse = await axios.get(albumsUrl, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        const albums = albumsResponse.data.items || [];
        for (const album of albums) {
          try {
            const albumTracksUrl = `https://api.spotify.com/v1/albums/${album.id}/tracks?market=US&limit=5`;
            const albumTracksResponse = await axios.get(albumTracksUrl, { 
              headers: { Authorization: `Bearer ${token}` } 
            });
            
            const albumTracks = albumTracksResponse.data.items || [];
            albumTracks.forEach(track => {
              if (track && track.id) {
                allTracks.push({
                  ...track,
                  album: album,
                  recommendationReason: `From ${album.name} by ${artist.name}`,
                  similarity: Math.random() * 0.2 + 0.8
                });
              }
            });
          } catch (albumError) {
            console.warn('Failed to fetch album tracks:', albumError.message);
          }
        }
        
      } catch (artistError) {
        console.warn(`Failed to get tracks for artist ${artist.name}:`, artistError.message);
      }
    }
    
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );
    
    uniqueTracks.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    
    console.log(`✅ Generated ${uniqueTracks.length} alternative recommendations`);
    res.json({ 
      tracks: uniqueTracks.slice(0, parseInt(limit)),
      method: "artist-based-discovery",
      totalFound: uniqueTracks.length
    });
    
  } catch (error) {
    console.error('❌ Alternative recommendations error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from React build in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));
  
  // Handle React routing - send all non-API requests to React
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../build/index.html"));
  });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));