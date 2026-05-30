// api/lyrics.js - Endpoint pencarian lirik otomatis dari beberapa sumber
// Sumber: lyrics.ovh (gratis, no key), lrclib.net (synced lyrics, gratis)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { title, artist, duration } = req.query;

  if (!title || !artist) {
    return res.status(400).json({ error: "Parameter 'title' dan 'artist' wajib diisi" });
  }

  // Bersihkan judul lagu dari karakter non-esensial (ft., feat., (official), dll)
  const cleanTitle = title
    .replace(/\s*[\(\[].+?[\)\]]/g, '')
    .replace(/\bft\.?\s.+/i, '')
    .replace(/\bfeat\.?\s.+/i, '')
    .replace(/\bofficial\b/i, '')
    .replace(/\blyrics?\b/i, '')
    .replace(/\baudio\b/i, '')
    .replace(/\bvideo\b/i, '')
    .trim();

  const cleanArtist = artist
    .replace(/\s*,.*/, '')  // Ambil artis pertama jika ada koma
    .replace(/\s*&.*/, '')
    .replace(/\s*x\s.*/i, '')
    .trim();

  // ================================================================
  // SUMBER 1: lrclib.net - Lirik tersinkronisasi (LRC format, GRATIS)
  // ================================================================
  try {
    const lrclibUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}${duration ? `&duration=${duration}` : ''}`;
    const lrclibRes = await fetch(lrclibUrl, {
      headers: { 'Lrclib-Client': 'NexTune/1.0 (https://nextune.pages.dev)' },
      signal: AbortSignal.timeout(5000)
    });

    if (lrclibRes.ok) {
      const lrclibData = await lrclibRes.json();

      // Gunakan synced lyrics (LRC) jika tersedia
      if (lrclibData.syncedLyrics) {
        return res.json({
          source: 'lrclib',
          synced: true,
          lyrics: lrclibData.syncedLyrics,
          plainLyrics: lrclibData.plainLyrics || null
        });
      }

      // Gunakan plain lyrics jika LRC tidak ada
      if (lrclibData.plainLyrics) {
        return res.json({
          source: 'lrclib',
          synced: false,
          lyrics: null,
          plainLyrics: lrclibData.plainLyrics
        });
      }
    }
  } catch (e) {
    console.warn('lrclib.net failed:', e.message);
  }

  // ================================================================
  // SUMBER 2: lyrics.ovh - Plain lyrics (GRATIS, no key)
  // ================================================================
  try {
    const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    const ovhRes = await fetch(ovhUrl, { signal: AbortSignal.timeout(5000) });

    if (ovhRes.ok) {
      const ovhData = await ovhRes.json();
      if (ovhData.lyrics && ovhData.lyrics.trim()) {
        return res.json({
          source: 'lyrics.ovh',
          synced: false,
          lyrics: null,
          plainLyrics: ovhData.lyrics.trim()
        });
      }
    }
  } catch (e) {
    console.warn('lyrics.ovh failed:', e.message);
  }

  // ================================================================
  // SUMBER 3: lrclib.net pencarian fuzzy (judul berbeda/variasi)
  // ================================================================
  try {
    const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Lrclib-Client': 'NexTune/1.0 (https://nextune.pages.dev)' },
      signal: AbortSignal.timeout(5000)
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        const best = searchData[0];
        if (best.syncedLyrics) {
          return res.json({
            source: 'lrclib-search',
            synced: true,
            lyrics: best.syncedLyrics,
            plainLyrics: best.plainLyrics || null
          });
        }
        if (best.plainLyrics) {
          return res.json({
            source: 'lrclib-search',
            synced: false,
            lyrics: null,
            plainLyrics: best.plainLyrics
          });
        }
      }
    }
  } catch (e) {
    console.warn('lrclib search failed:', e.message);
  }

  // Tidak ada lirik ditemukan dari semua sumber
  return res.status(404).json({
    source: null,
    synced: false,
    lyrics: null,
    plainLyrics: null,
    error: 'Lirik tidak ditemukan'
  });
};
