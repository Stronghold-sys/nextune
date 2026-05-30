const { getClient, formatDuration } = require('../lib/ytmusic');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Query parameter 'q' is required" });

  try {
    const ytmusic = await getClient();
    const results = await ytmusic.search(query);
    const formatted = results.map((item) => {
      let type = 'song';
      if (item.type === 'SONG' || item.type === 'VIDEO') type = 'song';
      else if (item.type === 'ALBUM') type = 'album';
      else if (item.type === 'ARTIST') type = 'artist';
      else if (item.type === 'PLAYLIST') type = 'playlist';
      else return null;

      const coverUrl = item.thumbnails?.length > 0 ? item.thumbnails[item.thumbnails.length - 1].url : '';
      const artistName = item.artist ? (typeof item.artist === 'object' ? item.artist.name : item.artist) : 'Unknown Artist';
      const albumName = item.album ? (typeof item.album === 'object' ? item.album.name : item.album) : '';
      const id = item.videoId || item.albumId || item.artistId || item.playlistId;

      return {
        id,
        title: item.name || 'Unknown',
        type,
        artist: artistName,
        album: albumName,
        coverUrl,
        duration: item.duration ? formatDuration(item.duration) : '',
        durationSeconds: item.duration || 0,
      };
    }).filter(Boolean);

    res.json({ query, results: formatted });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};
