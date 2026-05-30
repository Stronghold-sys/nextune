import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, X, Clock, Play, ArrowRight } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { SongSkeleton } from '../components/Skeleton/SkeletonLoader'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

export default function Search({ onOpenAuth }) {
  const { user } = useAuthStore()
  const { playSong } = usePlayerStore()
  
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("all") // 'all' | 'song' | 'album' | 'artist'
  
  // Search history & autocomplete
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("nextune_search_history")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef(null)

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Fetch results based on query
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setSuggestions([])
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`${MUSIC_SERVICE_URL}/search?q=${encodeURIComponent(debouncedQuery)}`)
        if (!res.ok) throw new Error("Gagal melakukan pencarian")
        const json = await res.json()
        setResults(json.results || [])
        
        // Generate autocomplete suggestions based on results
        const items = (json.results || []).slice(0, 5).map(item => item.title)
        setSuggestions([...new Set(items)])
      } catch (err) {
        console.error("FastAPI search service error, using local fallback.", err)
        // Static mockup search fallback
        setResults([
          { id: "J2X5mJ3HDYE", title: "Lagu Santai Senja", type: "song", artist: "Senja Musik", coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80", durationSeconds: 240 },
          { id: "kJQP7kiw5Fk", title: "Harmoni Alam", type: "song", artist: "Rileksasi Project", coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80", durationSeconds: 180 },
          { id: "artist-pamu", title: "Pamungkas", type: "artist", artist: "", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80" },
          { id: "album-hindia", title: "Menari Dengan Bayangan", type: "album", artist: "Hindia", coverUrl: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=300&q=80" }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery])

  // Click outside suggestions close handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchSubmit = (searchTerm) => {
    setQuery(searchTerm)
    setShowSuggestions(false)
    
    // Add to history
    if (searchTerm.trim()) {
      const filtered = history.filter(item => item !== searchTerm)
      const updated = [searchTerm, ...filtered].slice(0, 10)
      setHistory(updated)
      localStorage.setItem("nextune_search_history", JSON.stringify(updated))
    }
  }

  const handleClearHistoryItem = (e, index) => {
    e.stopPropagation()
    const updated = history.filter((_, i) => i !== index)
    setHistory(updated)
    localStorage.setItem("nextune_search_history", JSON.stringify(updated))
  }

  const handleClearAllHistory = () => {
    setHistory([])
    localStorage.removeItem("nextune_search_history")
  }

  const handlePlaySong = (song, list) => {
    if (!user) {
      onOpenAuth('login')
      return
    }
    playSong(song, list)
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

  const filteredResults = results.filter(item => {
    if (filter === "all") return true
    return item.type === filter
  })

  return (
    <div className="pb-32 px-4 sm:px-6 pt-4 max-w-5xl mx-auto space-y-6">
      
      {/* 1. PROMINENT SEARCH BAR */}
      <div ref={searchContainerRef} className="relative w-full">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-muted" />
          <input
            type="text"
            value={query}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(query)}
            placeholder="Cari lagu, artis, album, atau playlist..."
            className="w-full bg-background-card border border-gray-border rounded-2xl pl-12 pr-10 py-3 text-sm sm:text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-lg transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-4 top-3.5 text-gray-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* AUTOCOMPLETE SUGGESTIONS PANEL */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-background-card border border-gray-border rounded-xl shadow-2xl z-20 divide-y divide-gray-border/50 overflow-hidden">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSearchSubmit(item)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-background-hover cursor-pointer text-sm text-white"
              >
                <SearchIcon className="w-4 h-4 text-gray-muted" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SEARCH HISTORY */}
      {!query && history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Riwayat Pencarian
            </h4>
            <button
              onClick={handleClearAllHistory}
              className="text-xs text-accent hover:underline font-semibold"
            >
              Hapus Semua
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSearchSubmit(item)}
                className="flex items-center gap-2 bg-background-card border border-gray-border px-3 py-1.5 rounded-full text-xs text-white hover:border-gray-text cursor-pointer transition-colors"
              >
                <span>{item}</span>
                <button
                  onClick={(e) => handleClearHistoryItem(e, idx)}
                  className="text-gray-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FILTER CHIPS */}
      {query && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: "all", label: "Semua" },
            { id: "song", label: "Lagu" },
            { id: "album", label: "Album" },
            { id: "artist", label: "Artis" }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                filter === btn.id
                  ? 'bg-primary border-primary text-white'
                  : 'bg-background-card border-gray-border text-gray-text hover:border-gray-muted'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* 4. RESULTS SECTION */}
      {query && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Hasil Pencarian</h3>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <SongSkeleton key={i} />)}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-gray-text text-sm">Tidak menemukan hasil untuk "{query}"</p>
              <p className="text-gray-muted text-xs">Coba periksa ejaan atau gunakan kata kunci lain</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((item, idx) => {
                if (item.type === "song") {
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => handlePlaySong(item, filteredResults.filter(r => r.type === "song"))}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-background-card border border-gray-border/50 hover:bg-background-hover cursor-pointer group transition-all"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-border/50">
                        <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">{item.title}</h4>
                        <p className="text-xs text-gray-text truncate mt-0.5">{item.artist}</p>
                      </div>
                      <div className="text-xs text-gray-muted font-mono pr-2">
                        {item.duration || "3:30"}
                      </div>
                    </div>
                  )
                }

                // Artists or Album card rendering
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => item.type === 'artist' ? handlePlayArtist(item) : handlePlayAlbum(item)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-background-card border border-gray-border/50 hover:bg-background-hover cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 overflow-hidden shrink-0 border border-gray-border/50 ${item.type === 'artist' ? 'rounded-full' : 'rounded-lg'}`}>
                        <img src={item.coverUrl || item.photoUrl} alt={item.title || item.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{item.title || item.name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {item.type === 'artist' ? 'Artis' : 'Album'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-muted mr-2" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
