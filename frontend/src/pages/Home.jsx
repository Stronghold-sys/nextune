import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Flame, User, Disc, Compass, Music, Sparkles } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore, checkIsPremium } from '../store/useAuthStore'
import { supabase } from '../supabaseClient'
import { CardSkeleton, SongSkeleton, BannerSkeleton } from '../components/Skeleton/SkeletonLoader'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

const MOCK_GENRES = ["Pop", "Rock", "Hip Hop", "Jazz", "R&B", "K-Pop", "EDM", "Indie", "Akustik", "Dangdut"]

export default function Home({ onOpenAuth }) {
  const { user, profile } = useAuthStore()
  const { playSong } = usePlayerStore()
  const [data, setData] = useState({ 
    trendingSongs: [], 
    popularArtists: [], 
    popularAlbums: [],
    latestSongs: [],
    recommendations: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState("Pop")
  const [activeBanner, setActiveBanner] = useState(0)

  const [genreSongs, setGenreSongs] = useState([])
  const [genreLoading, setGenreLoading] = useState(false)
  
  const [banners, setBanners] = useState([
    {
      title: "NexTune Premium",
      desc: "Nikmati musik tanpa iklan dengan kualitas audio FLAC kualitas studio.",
      bg: "from-primary to-accent",
      cta: "Gabung Sekarang"
    },
    {
      title: "Tangga Lagu Global",
      desc: "Dengarkan hits terpanas dari seluruh penjuru dunia minggu ini.",
      bg: "from-accent to-purple-800",
      cta: "Putar Sekarang"
    }
  ])

  const isPremium = checkIsPremium(profile)

  const displayBanners = banners.filter(b => {
    // Jika user sudah premium, hilangkan banner "NexTune Premium"
    if (isPremium && (b.title === "NexTune Premium" || b.cta === "Gabung Sekarang")) {
      return false
    }
    return true
  })

  const currentBannerIdx = activeBanner >= displayBanners.length ? 0 : activeBanner

  const fetchHomeData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch banners from DB
      try {
        const { data: dbBanners } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
        if (dbBanners && dbBanners.length > 0) {
          setBanners(dbBanners.map(b => ({
            title: b.title,
            desc: b.link_url || "Konten Spesial Unggulan untuk Anda.",
            bg: "from-primary to-accent",
            cta: "Mulai Dengar",
            cover: b.image_url
          })))
        }
      } catch (e) {
        console.warn("DB banners load failed:", e)
      }

      // Fetch latest songs
      let dbLatest = []
      try {
        const { data: songs } = await supabase
          .from('songs')
          .select('*')
          .eq('status', 'public')
          .order('created_at', { ascending: false })
          .limit(6)
        dbLatest = songs || []
      } catch (e) {
        console.warn("DB latest songs load failed:", e)
      }

      // Fetch personalized recommendations
      let dbRecs = []
      try {
        if (user) {
          const { data: favs } = await supabase
            .from('favorites')
            .select('songs(*)')
            .eq('user_id', user.id)
            .limit(6)
          
          if (favs && favs.length > 0) {
            dbRecs = favs.map(f => f.songs).filter(Boolean)
          }
        }
        
        if (dbRecs.length < 6) {
          const { data: randSongs } = await supabase
            .from('songs')
            .select('*')
            .eq('status', 'public')
            .limit(10)
          
          const existingIds = new Set(dbRecs.map(s => s.id))
          const additional = (randSongs || []).filter(s => !existingIds.has(s.id))
          dbRecs = [...dbRecs, ...additional].slice(0, 6)
        }
      } catch (e) {
        console.warn("DB recommendations load failed:", e)
      }

      const res = await fetch(`${MUSIC_SERVICE_URL}/home`)
      if (!res.ok) throw new Error("Gagal mengambil data")
      const json = await res.json()
      
      setData({
        ...json,
        latestSongs: dbLatest.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          coverUrl: s.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
          audioUrl: s.audio_url,
          is_youtube: s.is_youtube,
          videoId: s.video_id
        })),
        recommendations: dbRecs.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          coverUrl: s.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
          audioUrl: s.audio_url,
          is_youtube: s.is_youtube,
          videoId: s.video_id
        }))
      })
    } catch (err) {
      console.warn("FastAPI home service unavailable, using rich local fallback.", err)
      
      setData({
        trendingSongs: [
          { id: "J2X5mJ3HDYE", title: "Lagu Santai Malam", artist: "Senja Musik", coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80" },
          { id: "kJQP7kiw5Fk", title: "Harmoni Alam", artist: "Rileksasi Project", coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80" },
          { id: "9bZkp7q19f0", title: "Energi Pagi", artist: "Beat Boosters", coverUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&q=80" },
          { id: "abc123song1", title: "Langkah Baru", artist: "Dika Pratama", coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80" }
        ],
        popularArtists: [
          { id: "UC2Xy...", name: "Pamungkas", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80" },
          { id: "UC3Yx...", name: "Tulus", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80" },
          { id: "UC4Zx...", name: "Isyana Sarasvati", photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80" },
          { id: "UC5Yx...", name: "Hindia", photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&q=80" }
        ],
        popularAlbums: [
          { id: "album1", title: "Menari Dengan Bayangan", artist: "Hindia", coverUrl: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=300&q=80" },
          { id: "album2", title: "Walk the Talk", artist: "Pamungkas", coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80" }
        ],
        latestSongs: [],
        recommendations: []
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchGenreSongs = useCallback(async () => {
    if (!selectedGenre) return
    setGenreLoading(true)
    try {
      // Coba cari dari DB songs yang memiliki genre tersebut
      const { data: dbSongs } = await supabase
        .from('songs')
        .select('*')
        .eq('status', 'public')
        .eq('genre', selectedGenre)
        .limit(6)

      let results = dbSongs ? dbSongs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        coverUrl: s.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
        audioUrl: s.audio_url,
        is_youtube: s.is_youtube,
        videoId: s.video_id,
        genre: s.genre
      })) : []

      // Panggil API search dari YT Music untuk melengkapi data agar lebih aktual sesuai genre
      const query = `${selectedGenre} audio`
      const res = await fetch(`${MUSIC_SERVICE_URL}/search?q=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const ytResults = await res.json()
        const ytSongs = (ytResults.results || ytResults || [])
          .filter(s => s.id || s.videoId)
          .map(s => ({
            id: s.videoId || s.video_id || s.id,
            title: s.title,
            artist: s.artist || s.channel || 'YouTube Music',
            coverUrl: s.coverUrl || s.thumbnail || s.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
            video_id: s.videoId || s.video_id || s.id,
            videoId: s.videoId || s.video_id || s.id,
            genre: selectedGenre,
            is_youtube: true
          }))
        
        const existingIds = new Set(results.map(r => r.videoId || r.id || r.video_id))
        const additional = ytSongs.filter(s => !existingIds.has(s.videoId || s.id))
        results = [...results, ...additional].slice(0, 6)
      }
      setGenreSongs(results)
    } catch (err) {
      console.warn("Gagal memuat lagu genre:", err)
    } finally {
      setGenreLoading(false)
    }
  }, [selectedGenre])

  useEffect(() => {
    fetchHomeData()
  }, [fetchHomeData])

  useEffect(() => {
    fetchGenreSongs()
  }, [fetchGenreSongs])

  // Listen to realtime updates for songs and banners to refresh home content instantly
  useEffect(() => {
    const homeChannel = supabase
      .channel('home-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
        fetchHomeData()
        fetchGenreSongs()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        fetchHomeData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(homeChannel)
    }
  }, [fetchHomeData, fetchGenreSongs])

  const handlePlaySong = (song, songsList) => {
    if (!user) {
      onOpenAuth('login')
      return
    }
    playSong(song, songsList)
  }

  const handlePlayAlbum = async (album) => {
    if (!user) {
      onOpenAuth('login')
      return
    }
    setLoading(true)
    try {
      const albumId = album.id || album.browseId
      const res = await fetch(`${MUSIC_SERVICE_URL}/playlist/${albumId}`)
      if (!res.ok) throw new Error("Gagal mengambil data album")
      const data = await res.json()
      if (data.tracks && data.tracks.length > 0) {
        const mappedTracks = data.tracks.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          coverUrl: t.coverUrl || album.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
          audioUrl: t.audioUrl,
          is_youtube: true
        }))
        playSong(mappedTracks[0], mappedTracks)
      } else {
        alert("Album ini kosong atau tidak dapat dimuat.")
      }
    } catch (err) {
      console.error(err)
      alert("Gagal memutar album.")
    } finally {
      setLoading(false)
    }
  }

  const handlePlayArtist = async (artist) => {
    if (!user) {
      onOpenAuth('login')
      return
    }
    setLoading(true)
    try {
      const artistId = artist.id || artist.browseId
      const res = await fetch(`${MUSIC_SERVICE_URL}/artist/${artistId}`)
      if (!res.ok) throw new Error("Gagal mengambil data artis")
      const data = await res.json()
      if (data.songs && data.songs.length > 0) {
        const mappedTracks = data.songs.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist || artist.name,
          coverUrl: t.coverUrl || artist.photoUrl || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80",
          audioUrl: t.audioUrl,
          is_youtube: true
        }))
        playSong(mappedTracks[0], mappedTracks)
      } else {
        alert("Tidak ada lagu populer yang tersedia untuk artis ini.")
      }
    } catch (err) {
      console.error(err)
      alert("Gagal memutar lagu artis.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-32 px-4 sm:px-6 pt-4 max-w-7xl mx-auto space-y-8 select-none">
      {/* 1. HERO BANNER SLIDESHOW */}
      {loading ? (
        <BannerSkeleton />
      ) : displayBanners.length === 0 ? null : (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/30 to-accent/20 border border-gray-border p-6 sm:p-8 md:p-10 flex flex-col justify-center min-h-[160px] sm:min-h-[220px]">
          {displayBanners[currentBannerIdx]?.cover && (
            <div className="absolute inset-0 z-0">
              <img src={displayBanners[currentBannerIdx].cover} alt="" className="w-full h-full object-cover opacity-35" />
            </div>
          )}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
          <div className="max-w-md sm:max-w-lg z-10 space-y-2 sm:space-y-3">
            <span className="bg-primary/20 text-primary-light text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-primary/30">
              Unggulan
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {displayBanners[currentBannerIdx]?.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-text leading-relaxed">
              {displayBanners[currentBannerIdx]?.desc}
            </p>
            <button
              onClick={() => {
                const active = displayBanners[currentBannerIdx];
                if (!active) return;
                if (active.title.toLowerCase().includes("premium") || active.cta === "Gabung Sekarang") {
                  if (!user) {
                    onOpenAuth('login')
                  } else {
                    window.dispatchEvent(new CustomEvent('open-premium-modal'))
                  }
                } else {
                  user ? alert("Fitur Unggulan Aktif!") : onOpenAuth('register')
                }
              }}
              className="mt-2 bg-gradient-to-r from-primary to-accent text-white font-bold text-xs sm:text-sm px-5 py-2 sm:py-2.5 rounded-full shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              {displayBanners[currentBannerIdx]?.cta}
            </button>
          </div>
          
          {/* Banner Dot Indicators */}
          <div className="absolute bottom-4 right-6 flex gap-2 z-10">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`w-2 h-2 rounded-full transition-all ${currentBannerIdx === idx ? 'bg-primary w-4' : 'bg-gray-muted'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. GENRE POPULER (CHIPS) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-white tracking-tight">Jelajahi Genre</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {MOCK_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                selectedGenre === genre
                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                  : 'bg-background-card border-gray-border text-gray-text hover:border-gray-muted'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Songs for selected genre */}
        {genreLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <SongSkeleton key={i} />)}
          </div>
        ) : genreSongs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {genreSongs.map((song, idx) => (
              <motion.div
                whileHover={{ scale: 1.01 }}
                key={song.id || song.videoId || idx}
                onClick={() => handlePlaySong(song, genreSongs)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-background-card border border-gray-border/50 hover:bg-background-hover cursor-pointer group transition-all"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={song.coverUrl || song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">{song.title}</h4>
                  <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                </div>
                {song.genre && (
                  <span className="text-[9px] bg-primary/10 text-primary-light border border-primary/20 px-2 py-0.5 rounded-full shrink-0 mr-2">
                    {song.genre}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-muted py-4">Tidak ada lagu yang ditemukan untuk genre ini.</p>
        )}
      </div>

      {/* 3. PERSONALIZED RECOMMENDATIONS (Rekomendasi Personal) */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-light" />
            <h3 className="text-lg font-bold text-white tracking-tight font-sans">Rekomendasi Personal</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recommendations.map((song, idx) => (
              <motion.div
                whileHover={{ scale: 1.01 }}
                key={song.id || idx}
                onClick={() => handlePlaySong(song, data.recommendations)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-background-card border border-gray-border/50 hover:bg-background-hover cursor-pointer group transition-all"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">{song.title}</h4>
                  <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TRENDING SONGS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-white tracking-tight">Lagu Populer Hari Ini</h3>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <SongSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.trendingSongs.map((song, idx) => (
              <motion.div
                whileHover={{ scale: 1.01 }}
                key={song.id || idx}
                onClick={() => handlePlaySong(song, data.trendingSongs)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-background-card border border-gray-border/50 hover:bg-background-hover cursor-pointer group transition-all"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">{song.title}</h4>
                  <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                </div>
                <div className="text-xs text-gray-muted pr-2 font-mono">
                  #{idx + 1}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 5. LATEST SONGS (Lagu Terbaru dari database) */}
      {data.latestSongs && data.latestSongs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-white tracking-tight">Lagu Terbaru</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.latestSongs.map((song, idx) => (
              <motion.div
                whileHover={{ scale: 1.01 }}
                key={song.id || idx}
                onClick={() => handlePlaySong(song, data.latestSongs)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-background-card border border-gray-border/50 hover:bg-background-hover cursor-pointer group transition-all"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">{song.title}</h4>
                  <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 6. POPULAR ARTISTS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-white tracking-tight">Artis Terpopuler</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 rounded-full bg-gray-border mb-2"></div>
                <div className="h-3 bg-gray-border rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-1 sm:grid sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {data.popularArtists.map((artist, idx) => (
              <div
                key={artist.id || idx}
                onClick={() => handlePlayArtist(artist)}
                className="flex-shrink-0 flex flex-col items-center text-center cursor-pointer group w-20 sm:w-auto"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-2 border border-gray-border group-hover:border-primary transition-all">
                  <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <span className="text-xs font-semibold text-white truncate max-w-full group-hover:text-primary-light transition-colors">
                  {artist.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. POPULAR ALBUMS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Disc className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-white tracking-tight">Album Terpopuler</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.popularAlbums.map((album, idx) => (
              <motion.div
                whileHover={{ y: -4 }}
                key={album.id || idx}
                onClick={() => handlePlayAlbum(album)}
                className="p-3 bg-background-card border border-gray-border/50 rounded-2xl hover:bg-background-hover hover:border-primary/20 cursor-pointer group transition-all"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden mb-3 relative border border-gray-border/50">
                  <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white truncate group-hover:text-primary-light transition-colors">{album.title}</h4>
                <p className="text-xs text-gray-text truncate mt-1">{album.artist}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
