import express from "express";
import axios from "axios";
import cookieSession from "cookie-session";
import cors from "cors";
import crypto from "node:crypto";
import env from "./env.json" with { type: "json" };

const app = express();

app.use(cors({
  origin: ["http://127.0.0.1:3000"],
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
const SPOTIFY_REDIRECT_URI = env.redirect_uri;

const store = new Map();  // sid = { accessToken, refreshToken, expiresAt }
const stateStore = new Map();

function loginScope() {
  return [
    "user-read-email",
    "user-read-private",
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
    
    res.redirect("http://127.0.0.1:3000/main");
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
    res.status(401).json({ authenticated: false, reason: "No valid token" });
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



app.listen(8080, () => console.log("Server running on http://127.0.0.1:8080"));