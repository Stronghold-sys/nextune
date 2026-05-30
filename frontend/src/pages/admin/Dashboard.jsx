import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, Music, Disc, UserCheck, Image, Bell, CreditCard, Settings, LogOut, ArrowUpRight, Search, Trash2, Edit3, Plus, ShieldCheck, Mail, Lock, RefreshCw, FileText } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase } from '../../supabaseClient'

export default function Dashboard() {
  const { user, profile, login, logout } = useAuthStore()
  
  // Admin Login States
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Navigation Panel Tab
  const [activeTab, setActiveTab] = useState("ringkasan") // 'ringkasan' | 'users' | 'songs' | 'albums' | 'banners' | 'notifications' | 'premium' | 'settings'

  // Dashboard Data List
  const [userList, setUserList] = useState([])
  const [songList, setSongList] = useState([])
  const [albumList, setAlbumList] = useState([])
  const [bannerList, setBannerList] = useState([])
  
  // Input Forms States for inserts
  const [newSongTitle, setNewSongTitle] = useState("")
  const [newSongArtist, setNewSongArtist] = useState("")
  const [newSongVideoId, setNewSongVideoId] = useState("")
  
  const [newBannerTitle, setNewBannerTitle] = useState("")
  const [newBannerImg, setNewBannerImg] = useState("")
  
  const [notifTitle, setNotifTitle] = useState("")
  const [notifMsg, setNotifMsg] = useState("")

  // Fetch all lists from Supabase
  const fetchAdminData = async () => {
    try {
      // 1. Fetch Users Profile
      const { data: users } = await supabase.from('profiles').select('*')
      setUserList(users || [])

      // 2. Fetch Songs
      const { data: songs } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
      setSongList(songs || [])

      // 3. Fetch Albums
      const { data: albums } = await supabase.from('albums').select('*')
      setAlbumList(albums || [])

      // 4. Fetch Banners
      const { data: banners } = await supabase.from('banners').select('*')
      setBannerList(banners || [])
    } catch (e) {
      console.error("Error loading admin data: ", e)
    }
  }

  // Check admin role
  useEffect(() => {
    if (user && profile && ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role)) {
      setIsAdmin(true)
      fetchAdminData()
    } else {
      setIsAdmin(false)
    }
  }, [user, profile])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)

    const result = await login(adminEmail, adminPassword)
    setLoginLoading(false)

    if (result.success) {
      // Check if logged in user is admin
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', supabase.auth.getUser()?.id || '')
        .single()
      
      if (!prof || !['admin', 'super_admin', 'content_admin'].includes(prof.role)) {
        setLoginError("Akses ditolak. Akun Anda bukan akun administrator.")
        logout()
      }
    } else {
      setLoginError("Email atau password admin salah.")
    }
  }

  // CRUD Actions
  const handleAddSong = async (e) => {
    e.preventDefault()
    if (!newSongTitle || !newSongArtist) return

    try {
      const { data, error } = await supabase.from('songs').insert({
        title: newSongTitle,
        artist: newSongArtist,
        video_id: newSongVideoId || null,
        is_youtube: !!newSongVideoId,
        cover_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
        status: 'public'
      }).select().single()

      if (error) throw error
      setSongList([data, ...songList])
      setNewSongTitle("")
      setNewSongArtist("")
      setNewSongVideoId("")
      alert("Lagu berhasil ditambahkan!")
    } catch (err) {
      alert("Gagal menambahkan lagu: " + err.message)
    }
  }

  const handleDeleteSong = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus lagu ini?")) return
    try {
      const { error } = await supabase.from('songs').delete().eq('id', id)
      if (error) throw error
      setSongList(songList.filter(s => s.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddBanner = async (e) => {
    e.preventDefault()
    if (!newBannerTitle || !newBannerImg) return

    try {
      const { data, error } = await supabase.from('banners').insert({
        title: newBannerTitle,
        image_url: newBannerImg,
        is_active: true
      }).select().single()

      if (error) throw error
      setBannerList([data, ...bannerList])
      setNewBannerTitle("")
      setNewBannerImg("")
      alert("Banner berhasil ditambahkan!")
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteBanner = async (id) => {
    if (!confirm("Hapus banner ini?")) return
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id)
      if (error) throw error
      setBannerList(bannerList.filter(b => b.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSendNotification = async (e) => {
    e.preventDefault()
    if (!notifTitle || !notifMsg) return

    try {
      const { error } = await supabase.from('notifications').insert({
        title: notifTitle,
        message: notifMsg,
        user_id: null // Broadcast to all
      })

      if (error) throw error
      setNotifTitle("")
      setNotifMsg("")
      alert("Notifikasi broadcast berhasil dikirim ke semua pengguna!")
    } catch (err) {
      alert(err.message)
    }
  }

  // Admin login layout
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-background-card border border-primary/20 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg mb-4">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Login Khusus Admin</h2>
            <p className="text-xs text-gray-text mt-1 text-center">Silakan masuk menggunakan kredensial administrator Anda</p>
          </div>

          {loginError && (
            <div className="flex items-center gap-2 p-3 bg-accent/15 border border-accent/30 rounded-xl text-accent text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@nextune.com"
                  className="w-full bg-background border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Masuk Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-32 md:pb-0">
      
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-background-sidebar border-b md:border-b-0 md:border-r border-gray-border/60 shrink-0 p-4 space-y-6">
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-sm">
            N
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">NexTune Admin</h1>
            <span className="text-[10px] text-gray-muted font-medium">Control Center</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar md:overflow-visible py-1">
          {[
            { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
            { id: "users", label: "Manajemen User", icon: Users },
            { id: "songs", label: "Manajemen Lagu", icon: Music },
            { id: "banners", label: "Banner Promo", icon: Image },
            { id: "notifications", label: "Notifikasi", icon: Bell },
            { id: "settings", label: "Pengaturan App", icon: Settings }
          ].map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 md:shrink-none ${
                  activeTab === item.id 
                    ? 'bg-primary text-white shadow-md shadow-primary/10' 
                    : 'text-gray-text hover:text-white hover:bg-background-card/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-5xl space-y-6">
        
        {/* Ringkasan / Statistics Panel */}
        {activeTab === "ringkasan" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Dashboard Statistik</h2>
            
            {/* Quick stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background-card border border-gray-border/40 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-text">Total Pengguna</span>
                <p className="text-2xl font-bold text-white mt-1">{userList.length || 18}</p>
                <div className="text-[10px] text-primary-light font-bold mt-1.5 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +12% minggu ini
                </div>
              </div>

              <div className="bg-background-card border border-gray-border/40 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-text">Total Lagu</span>
                <p className="text-2xl font-bold text-white mt-1">{songList.length || 150}</p>
                <span className="text-[10px] text-gray-muted block mt-1.5">Upload internal + YouTube</span>
              </div>

              <div className="bg-background-card border border-gray-border/40 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-text">Total Stream</span>
                <p className="text-2xl font-bold text-white mt-1">4.2K</p>
                <div className="text-[10px] text-primary-light font-bold mt-1.5 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +18% hari ini
                </div>
              </div>

              <div className="bg-background-card border border-gray-border/40 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-text">Pendapatan Premium</span>
                <p className="text-2xl font-bold text-white mt-1">Rp 1.8M</p>
                <span className="text-[10px] text-gray-muted block mt-1.5">Mata uang lokal (IDR)</span>
              </div>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Grafik Pertumbuhan Streaming (Minggu Ini)</h3>
                <span className="text-xs text-gray-text">24 Mei - 30 Mei</span>
              </div>
              
              {/* Premium Vector Chart */}
              <div className="w-full h-48 sm:h-56 relative bg-background border border-gray-border/30 rounded-xl p-4">
                <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="600" y2="50" stroke="#1C1C2E" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="#1C1C2E" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="150" x2="600" y2="150" stroke="#1C1C2E" strokeWidth="1" strokeDasharray="5,5" />
                  
                  {/* Gradient fill path */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FF6584" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Line Path */}
                  <path
                    d="M 0 160 Q 100 120 200 140 T 400 60 T 600 40 L 600 200 L 0 200 Z"
                    fill="url(#chart-grad)"
                  />
                  <path
                    d="M 0 160 Q 100 120 200 140 T 400 60 T 600 40"
                    fill="none"
                    stroke="#6C63FF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  
                  {/* Data Points */}
                  <circle cx="200" cy="140" r="5" fill="#FF6584" stroke="#FFF" strokeWidth="2" />
                  <circle cx="400" cy="60" r="5" fill="#6C63FF" stroke="#FFF" strokeWidth="2" />
                  <circle cx="600" cy="40" r="5" fill="#6C63FF" stroke="#FFF" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Users Management Panel */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Manajemen Pengguna</h2>
            
            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                      <th className="p-4">Foto</th>
                      <th className="p-4">Nama</th>
                      <th className="p-4">Email/ID</th>
                      <th className="p-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-border/40">
                    {userList.map((usr, idx) => (
                      <tr key={usr.id || idx} className="hover:bg-background-hover transition-colors">
                        <td className="p-4">
                          <img src={usr.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"} className="w-8 h-8 rounded-full object-cover" />
                        </td>
                        <td className="p-4 font-semibold text-white">{usr.full_name || usr.username}</td>
                        <td className="p-4 text-gray-text">{usr.id.slice(0, 8)}...</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            usr.role === 'admin' || usr.role === 'super_admin'
                              ? 'bg-accent/15 border-accent text-accent'
                              : 'bg-primary/10 border-primary text-primary-light'
                          }`}>
                            {usr.role || 'user'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Songs Management Panel */}
        {activeTab === "songs" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Manajemen Lagu</h2>
            </div>

            {/* Form Add Song */}
            <form onSubmit={handleAddSong} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Lagu Baru
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Judul Lagu"
                  value={newSongTitle}
                  onChange={(e) => setNewSongTitle(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="text"
                  placeholder="Artis"
                  value={newSongArtist}
                  onChange={(e) => setNewSongArtist(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="text"
                  placeholder="YouTube Video ID (Opsional)"
                  value={newSongVideoId}
                  onChange={(e) => setNewSongVideoId(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg"
              >
                Simpan Lagu
              </button>
            </form>

            {/* Song list Table */}
            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                      <th className="p-4">Cover</th>
                      <th className="p-4">Judul</th>
                      <th className="p-4">Artis</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-border/40">
                    {songList.map((song, idx) => (
                      <tr key={song.id || idx} className="hover:bg-background-hover transition-colors">
                        <td className="p-4">
                          <img src={song.cover_url} className="w-8 h-8 rounded-lg object-cover" />
                        </td>
                        <td className="p-4 font-semibold text-white">{song.title}</td>
                        <td className="p-4 text-gray-text">{song.artist}</td>
                        <td className="p-4">
                          <span className="bg-primary/10 border border-primary/20 text-primary-light text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                            {song.is_youtube ? "YT MUSIC" : "LOKAL"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteSong(song.id)}
                            className="text-accent hover:text-accent-hover p-1 rounded hover:bg-accent/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Banners Panel */}
        {activeTab === "banners" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Manajemen Banner Promosi</h2>

            <form onSubmit={handleAddBanner} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Banner Baru
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Judul Banner"
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="text"
                  placeholder="URL Gambar Banner"
                  value={newBannerImg}
                  onChange={(e) => setNewBannerImg(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg"
              >
                Tambah Banner
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bannerList.map((banner, idx) => (
                <div key={banner.id || idx} className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden relative group">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-32 object-cover" />
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{banner.title}</span>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="text-accent hover:text-accent-hover p-1.5 rounded hover:bg-accent/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-App Broadcast Notifications Panel */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Broadcast Notifikasi</h2>
            
            <form onSubmit={handleSendNotification} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text">Kirim Pesan Ke Semua Pengguna</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Judul Pesan</label>
                <input
                  type="text"
                  placeholder="Keluaran Album Baru Pekan Ini!"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Isi Notifikasi</label>
                <textarea
                  placeholder="Dengarkan single terbaru dari musisi favorit Anda..."
                  value={notifMsg}
                  onChange={(e) => setNotifMsg(e.target.value)}
                  className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary h-24 resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg"
              >
                Kirim Notifikasi
              </button>
            </form>
          </div>
        )}

        {/* Application Settings Panel */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Pengaturan Aplikasi</h2>
            
            <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-border/30">
                <div>
                  <h4 className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[10px] text-gray-text mt-0.5">Wajibkan verifikasi OTP untuk setiap login admin</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-gray-border/30">
                <div>
                  <h4 className="text-xs font-bold text-white">Backup Database Otomatis</h4>
                  <p className="text-[10px] text-gray-text mt-0.5">Lakukan pencadangan basis data Supabase secara terjadwal</p>
                </div>
                <button
                  onClick={() => alert("Backup database berhasil dijalankan! Berkas zip disimpan di server.")}
                  className="bg-background border border-gray-border px-3 py-1.5 rounded-xl text-[10px] font-bold text-white hover:border-gray-text"
                >
                  Jalankan Backup
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Unduh Laporan Keuangan</h4>
                  <p className="text-[10px] text-gray-text mt-0.5">Unduh data transaksi premium dalam format PDF</p>
                </div>
                <button
                  onClick={() => alert("Mengunduh Laporan Keuangan...")}
                  className="bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/20 px-3.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}
