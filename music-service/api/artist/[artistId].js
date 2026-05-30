const { getClient, formatDuration } = require('../../lib/ytmusic');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { artistId } = req.query;
  try {
    const ytmusic = await getClient();
    const artist = await ytmusic.getArtist(artistId);
    const coverUrl = artist.thumbnails?.length > 0 ? artist.thumbnails[artist.thumbnails.length - 1].url : '';

    const songs = (artist.topSongs || []).map((song) => {
      const sCoverUrl = song.thumbnails?.length > 0 ? song.thumbnails[song.thumbnails.length - 1].url : coverUrl;
      return {
        id: song.videoId,
        title: song.name,
        artist: artist.name,
        album: song.album ? song.album.name : '',
        coverUrl: sCoverUrl,
        duration: song.duration ? formatDuration(song.duration) : '',
        durationSeconds: song.duration || 0,
      };
    });

    const albums = (artist.topAlbums || []).map((album) => {
      const aCoverUrl = album.thumbnails?.length > 0 ? album.thumbnails[album.thumbnails.length - 1].url : coverUrl;
      return {
        id: album.albumId,
        title: album.name,
        coverUrl: aCoverUrl,
        year: album.year || '',
      };
    });

    res.json({ id: artistId, name: artist.name, photoUrl: coverUrl, description: '', songs, albums });
  } catch (error) {
    console.error('Get artist error:', error);
    res.status(500).json({ error: error.message });
  }
};
