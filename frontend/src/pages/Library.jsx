import React, { useState, useEffect } from 'react'
import { Plus, Play, Disc, Heart, Clock, Trash2, Share2, Edit3, Music } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'

export default function Library({ onOpenAuth }) {
  const { user } = useAuthStore()
  const { playSong } = usePlayerStore()

  const [activeTab, setActiveTab] = useState("playlists") // 'playlists' | 'favorites' | 'history'
  const [playlists, setPlaylists] = useState([])
  const [favorites, setFavorites] = useState([])
  const [playHistory, setPlayHistory] = useState([])
  const [loading, setLoading] = useState(false)

  // Modal Create Playlist States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState("")
  const [playlistDesc, setPlaylistDesc] = useState("")

  // Fetch library data from Supabase
  const fetchLibraryData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch Playlists
      const { data: playlistsData } = await supabase
        .from('playlists')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      
      setPlaylists(playlistsData || [])

      // 2. Fetch Favorites (joining with songs)
      const { data: favsData } = await supabase
        .from('favorites')
        .select(`
          id,
          songs (
            id, title, artist, cover_url, audio_url, is_youtube, video_id, duration_seconds
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const mappedFavs = (favsData || []).map(f => f.songs).filter(Boolean)
      setFavorites(mappedFavs)

      // 3. Fetch Play History
      const { data: historyData } = await supabase
        .from('play_history')
        .select(`
          id,
          songs (
            id, title, artist, cover_url, audio_url, is_youtube, video_id, duration_seconds
          )
        `)
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(20)

      const mappedHistory = (historyData || []).map(h => h.songs).filter(Boolean)
      setPlayHistory(mappedHistory)
    } catch (err) {
      console.error("Error fetching library data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchLibraryData()
    } else {
      // Offline fallback mockups
      setPlaylists([
        { id: "mock-p1", name: "Lagu Santai Kerja", description: "Playlist musik akustik tenang", cover_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80" },
        { id: "mock-p2", name: "Workout Hits", description: "Lagu penambah energi olahraga", cover_url: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&q=80" }
      ])
      setFavorites([
        { id: "J2X5mJ3HDYE", title: "Lagu Santai Senja", artist: "Senja Musik", coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80" }
      ])
      setPlayHistory([
        { id: "kJQP7kiw5Fk", title: "Harmoni Alam", artist: "Rileksasi Project", coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80" }
      ])
    }
  }, [user])

  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault()
    if (!playlistName.trim()) return

    if (!user) {
      onOpenAuth('login')
      return
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: playlistName,
          description: playlistDesc,
          created_by: user.id,
          cover_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"
        })
        .select()
        .single()

      if (error) throw error
      
      setPlaylists([data, ...playlists])
      setIsModalOpen(false)
      setPlaylistName("")
      setPlaylistDesc("")
    } catch (err) {
      alert("Gagal membuat playlist: " + err.message)
    }
  }

  const handleDeletePlaylist = async (playlistId, e) => {
    e.stopPropagation()
    if (!confirm("Apakah Anda yakin ingin menghapus playlist ini?")) return

    if (!user) {
      setPlaylists(playlists.filter(p => p.id !== playlistId))
      return
    }

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)

      if (error) throw error
      setPlaylists(playlists.filter(p => p.id !== playlistId))
    } catch (err) {
      alert("Gagal menghapus playlist: " + err.message)
    }
  }

  const handleSharePlaylist = (playlist, e) => {
    e.stopPropagation()
    const shareUrl = `${window.location.origin}/playlist/${playlist.id}`
    navigator.clipboard.writeText(shareUrl)
    alert("Tautan playlist berhasil disalin ke papan klip!")
  }

  return (
    <div className="pb-32 px-4 sm:px-6 pt-4 max-w-5xl mx-auto space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-border/50 pb-2">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Disc className="w-6 h-6 text-primary" />
          Koleksi Saya
        </h2>
        
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 bg-background-card p-1 rounded-xl border border-gray-border/40">
          <button
            onClick={() => setActiveTab("playlists")}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${activeTab === 'playlists' ? 'bg-primary text-white' : 'text-gray-text hover:text-white'}`}
          >
            Playlist
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${activeTab === 'favorites' ? 'bg-primary text-white' : 'text-gray-text hover:text-white'}`}
          >
            Favorit
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-primary text-white' : 'text-gray-text hover:text-white'}`}
          >
            Riwayat
          </button>
        </div>
      </div>

      {/* 1. PLAYLIST TAB CONTENT */}
      {activeTab === "playlists" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-text font-medium">{playlists.length} Playlist Tersimpan</p>
            <button
              onClick={() => user ? setIsModalOpen(true) : onOpenAuth('login')}
              className="flex items-center gap-1 text-xs font-bold text-primary-light hover:underline"
            >
              <Plus className="w-4 h-4" />
              Buat Playlist
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((playlist, idx) => (
              <div
                key={playlist.id || idx}
                className="p-3 bg-background-card border border-gray-border/50 rounded-2xl hover:bg-background-hover cursor-pointer group relative transition-all"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden mb-3 relative border border-gray-border/50">
                  <img src={playlist.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"} alt={playlist.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white truncate">{playlist.name}</h4>
                <p className="text-xs text-gray-text truncate mt-1">{playlist.description || "Tidak ada deskripsi"}</p>
                
                {/* Overlay Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleSharePlaylist(playlist, e)}
                    className="w-7 h-7 bg-background-card/90 rounded-full flex items-center justify-center hover:text-primary-light"
                    title="Bagikan Playlist"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                    className="w-7 h-7 bg-background-card/90 rounded-full flex items-center justify-center hover:text-accent"
                    title="Hapus Playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. FAVORITES TAB CONTENT */}
      {activeTab === "favorites" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-accent fill-accent" />
            <span className="text-sm font-bold text-white">Lagu yang Disukai</span>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16 bg-background-card rounded-2xl border border-gray-border/30">
              <Heart className="w-8 h-8 text-gray-muted mx-auto mb-2" />
              <p className="text-sm text-gray-text">Belum ada lagu favorit</p>
              <p className="text-xs text-gray-muted mt-1">Sukai lagu saat memutar musik untuk menambahkannya di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {favorites.map((song, idx) => (
                <div
                  key={song.id || idx}
                  onClick={() => playSong(song, favorites)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-background-card hover:bg-background-hover cursor-pointer transition-colors"
                >
                  <img src={song.coverUrl || song.cover_url} alt={song.title} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                    <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                  </div>
                  <Heart className="w-4 h-4 text-accent fill-accent mr-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. HISTORY TAB CONTENT */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-white">Terakhir Diputar</span>
          </div>

          {playHistory.length === 0 ? (
            <div className="text-center py-16 bg-background-card rounded-2xl border border-gray-border/30">
              <Clock className="w-8 h-8 text-gray-muted mx-auto mb-2" />
              <p className="text-sm text-gray-text">Riwayat putar kosong</p>
              <p className="text-xs text-gray-muted mt-1">Lagu yang Anda putar akan terekam di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playHistory.map((song, idx) => (
                <div
                  key={song.id || idx}
                  onClick={() => playSong(song, playHistory)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-background-card hover:bg-background-hover cursor-pointer transition-colors"
                >
                  <img src={song.coverUrl || song.cover_url} alt={song.title} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                    <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-background-card border border-gray-border rounded-2xl w-full max-w-sm p-6 shadow-2xl z-10">
            <h3 className="text-lg font-bold text-white mb-4">Buat Playlist Baru</h3>
            <form onSubmit={handleCreatePlaylistSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Nama Playlist</label>
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Misal: Rock Klasik Terpopuler"
                  className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Deskripsi (Opsional)</label>
                <textarea
                  value={playlistDesc}
                  onChange={(e) => setPlaylistDesc(e.target.value)}
                  placeholder="Ceritakan tentang playlist ini..."
                  className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary h-20 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-border hover:bg-background transition-colors text-white font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg"
                >
                  Buat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
