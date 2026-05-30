import { useState, useEffect, useRef } from 'react'
import { User, Key, BarChart2, LogOut, CheckCircle2, AlertCircle, RefreshCw, Crown, Settings, Music, Clock, Play, Camera, Upload } from 'lucide-react'
import { useAuthStore, checkIsPremium } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { supabase } from '../supabaseClient'

export default function Profile() {
  const { user, profile, logout, updateProfile, updatePassword, uploadAvatar } = useAuthStore()
  const { playSong } = usePlayerStore()
  const fileInputRef = useRef(null)

  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [avatarPreview, setAvatarPreview] = useState(
    profile?.avatar_url || null
  )
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  // Dynamic stats state
  const [stats, setStats] = useState({ totalPlays: 0, topArtist: '-', topGenre: '-' })
  const [recentHistory, setRecentHistory] = useState([])
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadStats = async () => {
      setStatsLoading(true)
      try {
        // Fetch play_history with song details (artist, genre)
        const { data: historyData } = await supabase
          .from('play_history')
          .select(`
            id,
            played_at,
            songs (
              id, title, artist, genre, cover_url, audio_url, is_youtube, video_id, duration_seconds
            )
          `)
          .eq('user_id', user.id)
          .order('played_at', { ascending: false })
          .limit(50)

        if (!historyData || historyData.length === 0) {
          setStatsLoading(false)
          return
        }

        const validEntries = historyData.filter(h => h.songs)
        const totalPlays = validEntries.length

        // Count artist frequency
        const artistCount = {}
        const genreCount = {}
        for (const entry of validEntries) {
          const song = entry.songs
          if (song.artist) {
            artistCount[song.artist] = (artistCount[song.artist] || 0) + 1
          }
          if (song.genre) {
            genreCount[song.genre] = (genreCount[song.genre] || 0) + 1
          }
        }

        const topArtist = Object.entries(artistCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
        const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

        setStats({ totalPlays, topArtist, topGenre })

        // Extract the 5 most recent unique songs
        const seen = new Set()
        const recent = []
        for (const entry of validEntries) {
          const song = entry.songs
          const uniqueKey = song.video_id || song.id
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey)
            recent.push(song)
          }
          if (recent.length >= 5) break
        }
        setRecentHistory(recent)

      } catch (err) {
        console.error('Gagal memuat statistik:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [user])

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'File harus berupa gambar (JPG, PNG, WEBP, dll)' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Ukuran gambar maksimal 5MB' })
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setProfileMsg({ type: '', text: '' })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileMsg({ type: '', text: '' })
    if (!fullName.trim()) return

    setLoading(true)

    // Upload avatar if a new file was selected
    let finalAvatarUrl = profile?.avatar_url || null
    if (avatarFile) {
      setUploadingAvatar(true)
      const uploadResult = await uploadAvatar(avatarFile)
      setUploadingAvatar(false)
      if (!uploadResult.success) {
        setProfileMsg({ type: 'error', text: 'Gagal upload foto: ' + uploadResult.error })
        setLoading(false)
        return
      }
      finalAvatarUrl = uploadResult.url
      setAvatarFile(null)
    }

    const result = await updateProfile(fullName, finalAvatarUrl)
    setLoading(false)

    if (result.success) {
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui!' })
    } else {
      setProfileMsg({ type: 'error', text: result.error })
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordMsg({ type: '', text: '' })

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 8 karakter' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password tidak cocok' })
      return
    }

    setLoading(true)
    const result = await updatePassword(newPassword)
    setLoading(false)

    if (result.success) {
      setPasswordMsg({ type: 'success', text: 'Password berhasil diubah!' })
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPasswordMsg({ type: 'error', text: result.error })
    }
  }

  if (!user) {
    return (
      <div className="pb-32 px-4 pt-12 max-w-sm mx-auto text-center space-y-4">
        <User className="w-12 h-12 text-gray-muted mx-auto" />
        <h3 className="text-lg font-bold text-white">Profil Pengguna</h3>
        <p className="text-sm text-gray-text">Silakan masuk menggunakan akun Anda untuk melihat dan mengatur profil.</p>
      </div>
    )
  }

  const isPremium = checkIsPremium(profile)

  return (
    <div className="pb-32 px-4 sm:px-6 pt-4 max-w-4xl mx-auto space-y-6">

      {/* Profil Header Card */}
      <div className="bg-background-card border border-gray-border/50 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />

        <img src={avatarPreview || profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-lg shadow-primary/10 relative" />

        <div className="flex-1 text-center sm:text-left relative space-y-1">
          <h2 className="text-xl font-bold text-white">{profile?.full_name || "Nama Pengguna"}</h2>
          <p className="text-xs text-gray-text">{user.email}</p>
          <div className="inline-block mt-1 bg-primary/10 border border-primary/20 text-primary-light font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
            Role: {profile?.role || "User"}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-settings-modal'))}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-primary/30 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Pengaturan
          </button>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-accent/30 rounded-xl text-xs font-bold text-accent hover:bg-accent/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar Akun
          </button>
        </div>
      </div>

      {/* STATUS LANGGANAN CARD */}
      <div className="bg-background-card border border-gray-border/50 rounded-2xl p-5 sm:p-6 space-y-4 text-left">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary-light" />
          Status Langganan
        </h3>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background border border-gray-border/30 p-4 rounded-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-text uppercase tracking-wider">Status:</span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                isPremium
                  ? 'bg-primary/10 border-primary/20 text-primary-light'
                  : 'bg-accent/10 border-accent/20 text-accent'
              }`}>
                {isPremium ? 'PREMIUM 💎' : 'FREE 🎵'}
              </span>
            </div>
            {isPremium ? (
              <p className="text-[11px] text-gray-text mt-2 leading-relaxed">
                Akses premium aktif hingga:{' '}
                <span className="font-bold text-white">
                  {profile.premium_until
                    ? new Date(profile.premium_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Selamanya (Administrator)'
                  }
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-gray-text mt-2 leading-relaxed">
                Anda menggunakan akun Free. Pemutaran lagu dibatasi hingga 30 detik dan fitur kustomisasi kecepatan putar serta sleep timer terkunci.
              </p>
            )}
          </div>
          {!isPremium && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-premium-modal'))}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 shrink-0"
            >
              Beli Premium Sekarang
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* EDIT PROFILE FORM */}
        <div className="bg-background-card border border-gray-border/50 rounded-2xl p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Detail Akun
          </h3>

          {profileMsg.text && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${profileMsg.type === 'success' ? 'bg-primary/10 text-primary-light border border-primary/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
              {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Avatar Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-2">Foto Profil</label>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={avatarPreview || profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-border"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors"
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-border rounded-xl text-xs text-gray-text hover:border-primary hover:text-white transition-colors w-full justify-center"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {avatarFile ? avatarFile.name : 'Pilih Foto dari Perangkat'}
                  </button>
                  <p className="text-[10px] text-gray-muted mt-1 text-center">JPG, PNG, WEBP — Maks. 5MB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(loading || uploadingAvatar) && <RefreshCw className="w-4 h-4 animate-spin" />}
              {uploadingAvatar ? 'Mengupload Foto...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD FORM */}
        <div className="bg-background-card border border-gray-border/50 rounded-2xl p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            Ubah Password
          </h3>

          {passwordMsg.text && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${passwordMsg.type === 'success' ? 'bg-primary/10 text-primary-light border border-primary/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Ubah Password
            </button>
          </form>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="bg-background-card border border-gray-border/50 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Statistik Mendengarkan
          </h3>
          {statsLoading && <RefreshCw className="w-4 h-4 text-gray-muted animate-spin" />}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-background border border-gray-border/30 p-3 sm:p-4 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-primary-light">{stats.totalPlays}</p>
            <p className="text-[10px] sm:text-xs text-gray-text mt-1">Lagu Didengar</p>
          </div>
          <div className="bg-background border border-gray-border/30 p-3 sm:p-4 rounded-xl overflow-hidden">
            <p className="text-sm sm:text-base font-bold text-accent truncate" title={stats.topArtist}>{stats.topArtist}</p>
            <p className="text-[10px] sm:text-xs text-gray-text mt-1">Artis Favorit</p>
          </div>
          <div className="bg-background border border-gray-border/30 p-3 sm:p-4 rounded-xl overflow-hidden">
            <p className="text-sm sm:text-base font-bold text-white truncate" title={stats.topGenre}>{stats.topGenre}</p>
            <p className="text-[10px] sm:text-xs text-gray-text mt-1">Genre Teratas</p>
          </div>
        </div>
      </div>

      {/* RIWAYAT MENDENGARKAN TERBARU */}
      <div className="bg-background-card border border-gray-border/50 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Riwayat Mendengarkan Terbaru
        </h3>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-gray-muted animate-spin" />
          </div>
        ) : recentHistory.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Music className="w-8 h-8 text-gray-muted mx-auto" />
            <p className="text-sm text-gray-text">Belum ada riwayat mendengarkan.</p>
            <p className="text-xs text-gray-muted">Mulai memutar lagu untuk merekam riwayat Anda di sini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentHistory.map((song, idx) => (
              <button
                key={song.id || idx}
                onClick={() => playSong(song)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-background hover:bg-background-hover cursor-pointer transition-colors group text-left"
              >
                <div className="relative shrink-0">
                  <img
                    src={song.cover_url || song.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=60'}
                    alt={song.title}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                  <p className="text-xs text-gray-text truncate mt-0.5">{song.artist}</p>
                </div>
                {song.genre && (
                  <span className="hidden sm:inline text-[10px] bg-primary/10 text-primary-light border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                    {song.genre}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
