const express = require("express");
const cors = require("cors");
const YTMusic = require("ytmusic-api");
const play = require("play-dl");

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());

// Initialize YTMusic client
const ytmusic = new YTMusic();
let isInitialized = false;

async function initClient() {
  if (!isInitialized) {
    await ytmusic.initialize();
    isInitialized = true;
    console.log("YTMusic client initialized successfully.");
  }
}

// Duration formatter helper
function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Middleware to ensure client is initialized
app.use(async (req, res, next) => {
  try {
    await initClient();
    next();
  } catch (error) {
    console.error("Failed to initialize YTMusic:", error);
    res.status(500).json({ error: "Music Engine not initialized" });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ name: "NexTune Music Engine API (Node.js)", status: "running" });
});

// GET /search?q={query}
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const results = await ytmusic.search(query);
    const formatted = results
      .map((item) => {
        let type = "song";
        if (item.type === "SONG" || item.type === "VIDEO") type = "song";
        else if (item.type === "ALBUM") type = "album";
        else if (item.type === "ARTIST") type = "artist";
        else if (item.type === "PLAYLIST") type = "playlist";
        else return null; // Skip unsupported types

        const coverUrl =
          item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : "";

        const artistName = item.artist
          ? typeof item.artist === "object"
            ? item.artist.name
            : item.artist
          : "Unknown Artist";

        const albumName = item.album
          ? typeof item.album === "object"
            ? item.album.name
            : item.album
          : "";

        const id = item.videoId || item.albumId || item.artistId || item.playlistId;

        return {
          id,
          title: item.name || "Unknown",
          type,
          artist: artistName,
          album: albumName,
          coverUrl,
          duration: item.duration ? formatDuration(item.duration) : "",
          durationSeconds: item.duration || 0,
        };
      })
      .filter(Boolean);

    res.json({ query, results: formatted });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /song/{videoId}
app.get("/song/:videoId", async (req, res) => {
  const { videoId } = req.params;
  try {
    const song = await ytmusic.getSong(videoId);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    const coverUrl =
      song.thumbnails && song.thumbnails.length > 0
        ? song.thumbnails[song.thumbnails.length - 1].url
        : "";

    res.json({
      id: videoId,
      title: song.name || "Unknown",
      artist: song.artist ? song.artist.name : "Unknown Artist",
      coverUrl,
      durationSeconds: song.duration || 0,
      views: "0",
    });
  } catch (error) {
    console.error("Get song error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /playlist/{playlistId}
app.get("/playlist/:playlistId", async (req, res) => {
  const { playlistId } = req.params;
  try {
    // We try to fetch the playlist metadata first, fallback if it errors (e.g. charts)
    let playlistInfo = {};
    try {
      playlistInfo = await ytmusic.getPlaylist(playlistId);
    } catch (e) {
      console.warn("getPlaylist failed, relying on getPlaylistVideos or empty metadata:", e.message);
      playlistInfo = { name: "Playlist Curation", description: "", thumbnails: [] };
    }

    const videos = await ytmusic.getPlaylistVideos(playlistId);

    const tracks = videos.map((track) => {
      const coverUrl =
        track.thumbnails && track.thumbnails.length > 0
          ? track.thumbnails[track.thumbnails.length - 1].url
          : "";

      return {
        id: track.videoId,
        title: track.name || "Unknown",
        artist: track.artist ? track.artist.name : "Unknown Artist",
        album: track.album ? track.album.name : "",
        coverUrl,
        duration: track.duration ? formatDuration(track.duration) : "",
        durationSeconds: track.duration || 0,
      };
    });

    const coverUrl =
      playlistInfo.thumbnails && playlistInfo.thumbnails.length > 0
        ? playlistInfo.thumbnails[playlistInfo.thumbnails.length - 1].url
        : tracks.length > 0
        ? tracks[0].coverUrl
        : "";

    res.json({
      id: playlistId,
      title: playlistInfo.name || "Playlist",
      description: playlistInfo.description || "",
      coverUrl,
      tracks,
      trackCount: tracks.length,
    });
  } catch (error) {
    console.error("Get playlist error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /artist/{artistId}
app.get("/artist/:artistId", async (req, res) => {
  const { artistId } = req.params;
  try {
    const artist = await ytmusic.getArtist(artistId);

    const coverUrl =
      artist.thumbnails && artist.thumbnails.length > 0
        ? artist.thumbnails[artist.thumbnails.length - 1].url
        : "";

    const songs = (artist.topSongs || []).map((song) => {
      const sCoverUrl =
        song.thumbnails && song.thumbnails.length > 0
          ? song.thumbnails[song.thumbnails.length - 1].url
          : coverUrl;

      return {
        id: song.videoId,
        title: song.name,
        artist: artist.name,
        album: song.album ? song.album.name : "",
        coverUrl: sCoverUrl,
        duration: song.duration ? formatDuration(song.duration) : "",
        durationSeconds: song.duration || 0,
      };
    });

    const albums = (artist.topAlbums || []).map((album) => {
      const aCoverUrl =
        album.thumbnails && album.thumbnails.length > 0
          ? album.thumbnails[album.thumbnails.length - 1].url
          : coverUrl;

      return {
        id: album.albumId,
        title: album.name,
        coverUrl: aCoverUrl,
        year: album.year || "",
      };
    });

    res.json({
      id: artistId,
      name: artist.name,
      photoUrl: coverUrl,
      description: "",
      songs,
      albums,
    });
  } catch (error) {
    console.error("Get artist error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /home
app.get("/home", async (req, res) => {
  try {
    const sections = await ytmusic.getHomeSections();
    
    let trendingSongs = [];
    let popularArtists = [];
    let popularAlbums = [];

    sections.forEach((section) => {
      const title = (section.title || "").toLowerCase();
      const contents = section.contents || [];

      contents.forEach((item) => {
        const coverUrl =
          item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : "";

        if (item.type === "SONG" || item.type === "VIDEO") {
          trendingSongs.push({
            id: item.videoId,
            title: item.name,
            artist: item.artist ? (typeof item.artist === "object" ? item.artist.name : item.artist) : "Unknown Artist",
            album: item.album ? (typeof item.album === "object" ? item.album.name : item.album) : "",
            coverUrl,
          });
        } else if (item.type === "ARTIST") {
          popularArtists.push({
            id: item.artistId,
            name: item.name,
            photoUrl: coverUrl,
          });
        } else if (item.type === "ALBUM" || item.type === "PLAYLIST") {
          popularAlbums.push({
            id: item.albumId || item.playlistId,
            title: item.name,
            artist: item.artist ? (typeof item.artist === "object" ? item.artist.name : item.artist) : "Various Artists",
            coverUrl,
          });
        }
      });
    });

    // Fallback if home feed returns empty categories
    if (trendingSongs.length === 0) {
      // Fetch some charts or default songs using search as fallback
      const searchRes = await ytmusic.searchSongs("Hits");
      trendingSongs = searchRes.slice(0, 12).map((s) => ({
        id: s.videoId,
        title: s.name,
        artist: s.artist?.name || "Unknown Artist",
        album: s.album?.name || "",
        coverUrl: s.thumbnails && s.thumbnails.length > 0 ? s.thumbnails[s.thumbnails.length - 1].url : "",
      }));
    }

    if (popularAlbums.length === 0) {
      const searchAlbums = await ytmusic.searchAlbums("Hits");
      popularAlbums = searchAlbums.slice(0, 8).map((a) => ({
        id: a.albumId,
        title: a.name,
        artist: a.artist || "Various Artists",
        coverUrl: a.thumbnails && a.thumbnails.length > 0 ? a.thumbnails[a.thumbnails.length - 1].url : "",
      }));
    }

    if (popularArtists.length === 0) {
      const searchArtists = await ytmusic.searchArtists("Pop");
      popularArtists = searchArtists.slice(0, 8).map((art) => ({
        id: art.artistId,
        name: art.name,
        photoUrl: art.thumbnails && art.thumbnails.length > 0 ? art.thumbnails[art.thumbnails.length - 1].url : "",
      }));
    }

    res.json({
      trendingSongs: trendingSongs.slice(0, 12),
      popularArtists: popularArtists.slice(0, 8),
      popularAlbums: popularAlbums.slice(0, 8),
    });
  } catch (error) {
    console.error("Get home feed error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /stream/{videoId}
app.get("/stream/:videoId", async (req, res) => {
  const { videoId } = req.params;
  try {
    const stream = await play.stream("https://www.youtube.com/watch?v=" + videoId);
    res.json({ streamUrl: stream.url });
  } catch (error) {
    console.error("Stream extraction error:", error);
    
    // As a robust fallback, try executing python yt-dlp module in case pip version is newer or has cookies
    const { exec } = require("child_process");
    exec(`python -c "import yt_dlp; ydl = yt_dlp.YoutubeDL({'format': 'bestaudio', 'quiet': True}); info = ydl.extract_info('https://www.youtube.com/watch?v=${videoId}', download=False); print(info.get('url'))"`, (err, stdout, stderr) => {
      if (err || !stdout.trim()) {
        console.error("Python stream fallback extraction failed:", stderr || err);
        return res.status(500).json({ error: "Failed to extract stream: " + error.message });
      }
      res.json({ streamUrl: stdout.trim() });
    });
  }
});

app.listen(PORT, () => {
  console.log(`NexTune Music Engine (Node.js) is running on port ${PORT}`);
});
