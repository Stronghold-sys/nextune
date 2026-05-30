const { getClient, formatDuration } = require('../../lib/ytmusic');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  try {
    const ytmusic = await getClient();
    const song = await ytmusic.getSong(videoId);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const coverUrl = song.thumbnails?.length > 0 ? song.thumbnails[song.thumbnails.length - 1].url : '';
    res.json({
      id: videoId,
      title: song.name || 'Unknown',
      artist: song.artist ? song.artist.name : 'Unknown Artist',
      coverUrl,
      durationSeconds: song.duration || 0,
      views: '0',
    });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: error.message });
  }
};
