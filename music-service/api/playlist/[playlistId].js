const { getClient, formatDuration } = require('../../lib/ytmusic');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { playlistId } = req.query;
  try {
    const ytmusic = await getClient();

    // Support album IDs in playlist endpoint
    if (playlistId && (playlistId.startsWith("MPREb_") || playlistId.startsWith("FNDis_MPREb_"))) {
      try {
        const albumInfo = await ytmusic.getAlbum(playlistId);
        const tracks = (albumInfo.songs || []).map((track) => {
          const coverUrl = track.thumbnails?.length > 0 ? track.thumbnails[track.thumbnails.length - 1].url : '';
          return {
            id: track.videoId,
            title: track.name || 'Unknown',
            artist: track.artist ? track.artist.name : 'Unknown Artist',
            album: albumInfo.name,
            coverUrl,
            duration: track.duration ? formatDuration(track.duration) : '',
            durationSeconds: track.duration || 0,
          };
        });

        const coverUrl = albumInfo.thumbnails?.length > 0
          ? albumInfo.thumbnails[albumInfo.thumbnails.length - 1].url
          : tracks.length > 0 ? tracks[0].coverUrl : '';

        return res.json({
          id: playlistId,
          title: albumInfo.name || 'Album',
          description: `Album oleh ${albumInfo.artist?.name || 'Unknown Artist'} (${albumInfo.year || ''})`,
          coverUrl,
          tracks,
          trackCount: tracks.length,
        });
      } catch (albumErr) {
        console.warn("Detected album ID but getAlbum failed, falling back to playlist:", albumErr.message);
      }
    }

    let playlistInfo = {};
    try {
      playlistInfo = await ytmusic.getPlaylist(playlistId);
    } catch (e) {
      playlistInfo = { name: 'Playlist Curation', description: '', thumbnails: [] };
    }

    const videos = await ytmusic.getPlaylistVideos(playlistId);
    const tracks = videos.map((track) => {
      const coverUrl = track.thumbnails?.length > 0 ? track.thumbnails[track.thumbnails.length - 1].url : '';
      return {
        id: track.videoId,
        title: track.name || 'Unknown',
        artist: track.artist ? track.artist.name : 'Unknown Artist',
        album: track.album ? track.album.name : '',
        coverUrl,
        duration: track.duration ? formatDuration(track.duration) : '',
        durationSeconds: track.duration || 0,
      };
    });

    const coverUrl = playlistInfo.thumbnails?.length > 0
      ? playlistInfo.thumbnails[playlistInfo.thumbnails.length - 1].url
      : tracks.length > 0 ? tracks[0].coverUrl : '';

    res.json({
      id: playlistId,
      title: playlistInfo.name || 'Playlist',
      description: playlistInfo.description || '',
      coverUrl,
      tracks,
      trackCount: tracks.length,
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: error.message });
  }
};
