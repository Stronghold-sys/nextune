const { getClient } = require('../lib/ytmusic');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const ytmusic = await getClient();
    const sections = await ytmusic.getHomeSections();

    let trendingSongs = [];
    let popularArtists = [];
    let popularAlbums = [];

    sections.forEach((section) => {
      const contents = section.contents || [];
      contents.forEach((item) => {
        const coverUrl = item.thumbnails?.length > 0 ? item.thumbnails[item.thumbnails.length - 1].url : '';
        if (item.type === 'SONG' || item.type === 'VIDEO') {
          trendingSongs.push({
            id: item.videoId,
            title: item.name,
            artist: item.artist ? (typeof item.artist === 'object' ? item.artist.name : item.artist) : 'Unknown Artist',
            album: item.album ? (typeof item.album === 'object' ? item.album.name : item.album) : '',
            coverUrl,
          });
        } else if (item.type === 'ARTIST') {
          popularArtists.push({ id: item.artistId, name: item.name, photoUrl: coverUrl });
        } else if (item.type === 'ALBUM' || item.type === 'PLAYLIST') {
          popularAlbums.push({
            id: item.albumId || item.playlistId,
            title: item.name,
            artist: item.artist ? (typeof item.artist === 'object' ? item.artist.name : item.artist) : 'Various Artists',
            coverUrl,
          });
        }
      });
    });

    if (trendingSongs.length === 0) {
      const searchRes = await ytmusic.searchSongs('Hits');
      trendingSongs = searchRes.slice(0, 12).map((s) => ({
        id: s.videoId, title: s.name, artist: s.artist?.name || 'Unknown Artist',
        album: s.album?.name || '', coverUrl: s.thumbnails?.length > 0 ? s.thumbnails[s.thumbnails.length - 1].url : '',
      }));
    }

    if (popularAlbums.length === 0) {
      const searchAlbums = await ytmusic.searchAlbums('Hits');
      popularAlbums = searchAlbums.slice(0, 8).map((a) => ({
        id: a.albumId, title: a.name, artist: a.artist || 'Various Artists',
        coverUrl: a.thumbnails?.length > 0 ? a.thumbnails[a.thumbnails.length - 1].url : '',
      }));
    }

    if (popularArtists.length === 0) {
      const searchArtists = await ytmusic.searchArtists('Pop');
      popularArtists = searchArtists.slice(0, 8).map((art) => ({
        id: art.artistId, name: art.name,
        photoUrl: art.thumbnails?.length > 0 ? art.thumbnails[art.thumbnails.length - 1].url : '',
      }));
    }

    res.json({
      trendingSongs: trendingSongs.slice(0, 12),
      popularArtists: popularArtists.slice(0, 8),
      popularAlbums: popularAlbums.slice(0, 8),
    });
  } catch (error) {
    console.error('Get home feed error:', error);
    res.status(500).json({ error: error.message });
  }
};
