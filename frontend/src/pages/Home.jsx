import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Flame, User, Disc, Compass, Award } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { CardSkeleton, SongSkeleton, BannerSkeleton } from '../components/Skeleton/SkeletonLoader'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

const MOCK_GENRES = ["Pop", "Rock", "Hip Hop", "Jazz", "R&B", "K-Pop", "EDM", "Indie", "Akustik", "Dangdut"]

export default function Home({ onOpenAuth }) {
  const { user } = useAuthStore()
  const { playSong } = usePlayerStore()
  const [data, setData] = useState({ trendingSongs: [], popularArtists: [], popularAlbums: [] })
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState("Pop")
  const [activeBanner, setActiveBanner] = useState(0)

  const bannerItems = [
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
  ]

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${MUSIC_SERVICE_URL}/home`)
        if (!res.ok) throw new Error("Gagal mengambil data")
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.warn("FastAPI home service unavailable, using rich local fallback.", err)
        // Set beautiful local fallbacks to ensure app never crashes
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
          ]
        })
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  const handlePlaySong = (song, songsList) => {
    if (!user) {
      onOpenAuth('login')
      return
    }
    playSong(song, songsList)
  }

  return (
    <div className="pb-32 px-4 sm:px-6 pt-4 max-w-7xl mx-auto space-y-8">
      {/* 1. HERO BANNER SLIDESHOW */}
      {loading ? (
        <BannerSkeleton />
      ) : (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/30 to-accent/20 border border-gray-border p-6 sm:p-8 md:p-10 flex flex-col justify-center min-h-[160px] sm:min-h-[220px]">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
          <div className="max-w-md sm:max-w-lg z-10 space-y-2 sm:space-y-3">
            <span className="bg-primary/20 text-primary-light text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-primary/30">
              Unggulan
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {bannerItems[activeBanner].title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-text leading-relaxed">
              {bannerItems[activeBanner].desc}
            </p>
            <button
              onClick={() => user ? alert("Fitur Langganan Segera Hadir!") : onOpenAuth('register')}
              className="mt-2 bg-gradient-to-r from-primary to-accent text-white font-bold text-xs sm:text-sm px-5 py-2 sm:py-2.5 rounded-full shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              {bannerItems[activeBanner].cta}
            </button>
          </div>
          
          {/* Banner Dot Indicators */}
          <div className="absolute bottom-4 right-6 flex gap-2">
            {bannerItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`w-2 h-2 rounded-full transition-all ${activeBanner === idx ? 'bg-primary w-4' : 'bg-gray-muted'}`}
              ></button>
            ))}
          </div>
        </div>
      )}

      {/* 2. GENRE POPULER (CHIPS) */}
      <div className="space-y-3">
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
      </div>

      {/* 3. TRENDING SONGS (2-column list on mobile, grid on desktop) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white tracking-tight">Lagu Populer Hari Ini</h3>
          </div>
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

      {/* 4. POPULAR ARTISTS (Horizontal Scroll on Mobile, Grid on Desktop) */}
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

      {/* 5. POPULAR ALBUMS */}
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
