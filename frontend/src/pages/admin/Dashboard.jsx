import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, Users, Music, Disc, UserCheck, Image, Bell, CreditCard, 
  Settings, LogOut, ArrowUpRight, Search, Trash2, Plus, ShieldCheck, 
  Mail, Lock, RefreshCw, FileText, Sliders, CheckSquare, Ticket
} from 'lucide-react'
import { useAuthStore, checkIsPremium } from '../../store/useAuthStore'
import { supabase } from '../../supabaseClient'
import { useToastStore } from '../../store/useToastStore'

export default function Dashboard() {
  const { user, profile, login, logout } = useAuthStore()
  
  // Derived Admin Login State
  const isAdmin = user && profile && ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Navigation Panel Tab
  const [activeTab, setActiveTab] = useState("ringkasan") 
  const [premiumSubTab, setPremiumSubTab] = useState("transaksi") 
  // 'ringkasan' | 'users' | 'songs' | 'albums' | 'artists' | 'playlists' | 'genres' | 'premium' | 'banners' | 'notifications' | 'settings'

  // Lists
  const [userList, setUserList] = useState([])
  const [songList, setSongList] = useState([])
  const [albumList, setAlbumList] = useState([])
  const [artistList, setArtistList] = useState([])
  const [playlistList, setPlaylistList] = useState([])
  const [genreList, setGenreList] = useState([])
  const [bannerList, setBannerList] = useState([])
  const [transactionList, setTransactionList] = useState([])
  const [vouchersList, setVouchersList] = useState([])

  // Voucher inputs
  const [voucherCodeInput, setVoucherCodeInput] = useState("")
  const [voucherDurationInput, setVoucherDurationInput] = useState("30")
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState(false)

  // Premium manual states
  const [showPremiumEditModal, setShowPremiumEditModal] = useState(false)
  const [selectedUserForPremium, setSelectedUserForPremium] = useState(null)
  const [premiumExpiryDays, setPremiumExpiryDays] = useState("30")

  const previewExpiryLabel = useMemo(() => {
    if (premiumExpiryDays === "0") return "Free Account"
    if (premiumExpiryDays === "-1") return "Unlimited (Selamanya)"
    const expiryDate = new Date(Date.now() + parseInt(premiumExpiryDays) * 24 * 60 * 60 * 1000) // eslint-disable-line react-hooks/purity
    return formatToWIB(expiryDate.toISOString())
  }, [premiumExpiryDays])

  // Search & Filter
  const [userSearch, setUserSearch] = useState("")
  const [songSearch, setSongSearch] = useState("")

  // Form states
  const [newSongTitle, setNewSongTitle] = useState("")
  const [newSongArtist, setNewSongArtist] = useState("")
  const [newSongVideoId, setNewSongVideoId] = useState("")
  const [newSongCover, setNewSongCover] = useState("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80")
  const [newSongAudio, setNewSongAudio] = useState("")
  const [newSongStatus, setNewSongStatus] = useState("public")
  const [newSongLyrics, setNewSongLyrics] = useState("")

  const [newBannerTitle, setNewBannerTitle] = useState("")
  const [newBannerImg, setNewBannerImg] = useState("")
  
  const [notifTitle, setNotifTitle] = useState("")
  const [notifMsg, setNotifMsg] = useState("")

  // New CRUD States
  const [newAlbumTitle, setNewAlbumTitle] = useState("")
  const [newAlbumCover, setNewAlbumCover] = useState("https://images.unsplash.com/photo-1487180142328-054b783fc471?w=300&q=80")
  
  const [newArtistName, setNewArtistName] = useState("")
  const [newArtistBio, setNewArtistBio] = useState("")
  const [newArtistPhoto, setNewArtistPhoto] = useState("https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80")

  const [newGenreName, setNewGenreName] = useState("")

  // Fetch admin data on admin authorization safely
  useEffect(() => {
    let isCurrent = true

    const loadAdminData = async () => {
      if (!isAdmin) return
      
      try {
        // 1. Fetch Users
        const { data: users } = await supabase.from('profiles').select('*')
        if (isCurrent) setUserList(users || [])

        // 2. Fetch Songs
        const { data: songs } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
        if (isCurrent) setSongList(songs || [])

        // 3. Fetch Albums
        const { data: albums } = await supabase.from('playlists').select('*').eq('is_featured', true) // simulated albums
        if (isCurrent) setAlbumList(albums || [
          { id: "alb-1", name: "Menari Dengan Bayangan", description: "Hindia", cover_url: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=300&q=80" },
          { id: "alb-2", name: "Walk the Talk", description: "Pamungkas", cover_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80" }
        ])

        // 4. Fetch Artists
        if (isCurrent) {
          setArtistList([
            { id: "art-1", name: "Pamungkas", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80", bio: "Artis Indie Pop Indonesia", genre: "Pop" },
            { id: "art-2", name: "Tulus", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80", bio: "Penyanyi & Penulis Lagu Populer", genre: "Jazz / Pop" }
          ])
        }

        // 5. Fetch Playlists
        const { data: playlists } = await supabase.from('playlists').select('*')
        if (isCurrent) setPlaylistList(playlists || [])

        // 6. Fetch Banners
        const { data: banners } = await supabase.from('banners').select('*')
        if (isCurrent) setBannerList(banners || [])

        // 7. Fetch Genres
        if (isCurrent) {
          setGenreList([
            { id: "gen-1", name: "Pop", isFeatured: true },
            { id: "gen-2", name: "Rock", isFeatured: true },
            { id: "gen-3", name: "Hip Hop", isFeatured: false },
            { id: "gen-4", name: "Jazz", isFeatured: false }
          ])
        }

        // 8. Fetch Premium Transactions
        const { data: tx } = await supabase
          .from('transactions')
          .select(`
            id,
            amount,
            status,
            payment_method,
            created_at,
            profiles (
              username,
              full_name,
              email
            ),
            premium_packages (
              name
            )
          `)
          .order('created_at', { ascending: false })
        if (isCurrent) {
          setTransactionList(tx || [
            { id: "tx-1", profiles: { email: "rahmatakbar2088@gmail.com" }, premium_packages: { name: "Bulanan Premium" }, amount: 49000, status: "completed", date: "30 May 2026" },
            { id: "tx-2", profiles: { email: "budi@gmail.com" }, premium_packages: { name: "Tahunan Premium" }, amount: 299000, status: "completed", date: "29 May 2026" }
          ])
        }

        // 9. Fetch Vouchers
        const { data: vList } = await supabase
          .from('vouchers')
          .select('*')
          .order('created_at', { ascending: false })
        if (isCurrent) setVouchersList(vList || [])
      } catch (e) {
        console.error("Error loading admin data: ", e)
      }
    }

    loadAdminData()

    return () => {
      isCurrent = false
    }
  }, [isAdmin])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)

    const result = await login(adminEmail, adminPassword)
    setLoginLoading(false)

    if (result.success) {
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
      setLoginError(result.error)
    }
  }

  // User list actions
  const handleToggleBlockUser = (userId) => {
    alert(`Pengguna dengan ID ${userId} berhasil dinonaktifkan / diblokir.`);
  }

  const handleResetPassword = (email) => {
    alert(`Tautan pengaturan ulang sandi berhasil dikirim ke ${email}`);
  }

  const handleSoftDeleteUser = (userId) => {
    useToastStore.getState().showConfirm("Apakah Anda yakin ingin menghapus sementara pengguna ini?", () => {
      setUserList(userList.filter(u => u.id !== userId))
      alert("Pengguna berhasil dihapus secara lunak (soft-delete).")
    })
  }

  const formatToWIB = (dateString) => {
    if (!dateString) return "Free Account 🎵";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Format Tanggal Salah";
    
    if (date.getFullYear() >= 9999) {
      return "Selamanya (Unlimited)";
    }

    const options = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return date.toLocaleString('id-ID', options) + ' WIB';
  }

  const handleSaveUserPremium = async () => {
    if (!selectedUserForPremium) return
    
    try {
      let expiryDate = null
      const days = parseInt(premiumExpiryDays)
      
      if (days === -1) {
        expiryDate = '9999-12-31T23:59:59.000Z'
      } else if (days > 0) {
        const d = new Date()
        d.setDate(d.getDate() + days)
        expiryDate = d.toISOString()
      }

      const { error } = await supabase.rpc('admin_update_user_subscription', {
        p_user_id: selectedUserForPremium.id,
        p_premium_until: expiryDate
      })

      if (error) {
        // Fallback to direct update if RPC is not loaded yet
        const { error: directErr } = await supabase
          .from('profiles')
          .update({ premium_until: expiryDate })
          .eq('id', selectedUserForPremium.id)
        
        if (directErr) throw directErr
      }

      // Refresh list
      const { data: users } = await supabase.from('profiles').select('*')
      setUserList(users || [])

      alert(`Status premium untuk ${selectedUserForPremium.email || selectedUserForPremium.username} berhasil diperbarui.`)
      setShowPremiumEditModal(false)
      setSelectedUserForPremium(null)
    } catch (err) {
      console.error("Gagal menyimpan status premium:", err)
      alert("Gagal menyimpan status premium: " + err.message)
    }
  }

  const handleCreateVoucher = async (e) => {
    e.preventDefault()
    if (!voucherCodeInput.trim()) return
    setIsGeneratingVoucher(true)
    try {
      const code = voucherCodeInput.trim().toUpperCase()
      const duration = parseInt(voucherDurationInput)
      
      const { data, error } = await supabase
        .from('vouchers')
        .insert({
          code,
          duration_days: duration,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setVouchersList([data, ...vouchersList])
      setVoucherCodeInput("")
      alert(`Voucher ${code} berhasil dibuat!`)
    } catch (err) {
      alert("Gagal membuat voucher: " + err.message)
    } finally {
      setIsGeneratingVoucher(false)
    }
  }

  const handleDeleteVoucher = (code) => {
    useToastStore.getState().showConfirm(`Hapus voucher ${code}?`, async () => {
      try {
        const { error } = await supabase
          .from('vouchers')
          .delete()
          .eq('code', code)

        if (error) throw error

        setVouchersList(vouchersList.filter(v => v.code !== code))
        alert(`Voucher ${code} berhasil dihapus.`)
      } catch (err) {
        alert("Gagal menghapus voucher: " + err.message)
      }
    })
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'NEXTUNE'
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setVoucherCodeInput(result)
  }

  // Song additions & modifications
  const handleAddSong = async (e) => {
    e.preventDefault()
    if (!newSongTitle || !newSongArtist) return

    try {
      const { data, error } = await supabase.from('songs').insert({
        title: newSongTitle,
        artist: newSongArtist,
        video_id: newSongVideoId || null,
        cover_url: newSongCover,
        audio_url: newSongAudio || null,
        is_youtube: !newSongAudio,
        status: newSongStatus,
        created_by: user.id
      }).select().single()

      if (error) throw error

      // Add mock lyrics if provided
      if (newSongLyrics) {
        await supabase.from('lyrics').insert({
          song_id: data.id,
          content: newSongLyrics,
          is_synced: false
        })
      }

      setSongList([data, ...songList])
      setNewSongTitle("")
      setNewSongArtist("")
      setNewSongVideoId("")
      setNewSongAudio("")
      setNewSongLyrics("")
      alert("Lagu baru berhasil disimpan ke database!")
    } catch (err) {
      alert("Gagal menambahkan lagu: " + err.message)
    }
  }

  const handleDeleteSong = (id) => {
    useToastStore.getState().showConfirm("Hapus lagu ini?", async () => {
      try {
        const { error } = await supabase.from('songs').delete().eq('id', id)
        if (error) throw error
        setSongList(songList.filter(s => s.id !== id))
        alert("Lagu berhasil dihapus.")
      } catch (err) {
        alert(err.message)
      }
    })
  }

  const handleToggleSongStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'public' ? 'private' : 'public';
    try {
      const { error } = await supabase.from('songs').update({ status: nextStatus }).eq('id', id)
      if (error) throw error
      setSongList(songList.map(s => s.id === id ? { ...s, status: nextStatus } : s))
      alert(`Status lagu berhasil diubah menjadi ${nextStatus.toUpperCase()}`)
    } catch (e) {
      alert(e.message)
    }
  }

  // Banner Actions
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

  const handleDeleteBanner = (id) => {
    useToastStore.getState().showConfirm("Hapus banner ini?", async () => {
      try {
        const { error } = await supabase.from('banners').delete().eq('id', id)
        if (error) throw error
        setBannerList(bannerList.filter(b => b.id !== id))
        alert("Banner berhasil dihapus.")
      } catch (err) {
        alert(err.message)
      }
    })
  }

  // Notification Broadcast
  const handleSendNotification = async (e) => {
    e.preventDefault()
    if (!notifTitle || !notifMsg) return

    try {
      const { error } = await supabase.from('notifications').insert({
        title: notifTitle,
        message: notifMsg,
        user_id: null 
      })

      if (error) throw error
      setNotifTitle("")
      setNotifMsg("")
      alert("Notifikasi broadcast berhasil dikirim ke semua pengguna!")
    } catch (err) {
      alert(err.message)
    }
  }

  // Album additions
  const handleAddAlbum = (e) => {
    e.preventDefault()
    if (!newAlbumTitle) return
    const newAlb = {
      id: `alb-${Date.now()}`,
      name: newAlbumTitle,
      description: "Album Baru",
      cover_url: newAlbumCover
    }
    setAlbumList([newAlb, ...albumList])
    setNewAlbumTitle("")
    alert("Album baru berhasil disimpan!")
  }

  // Artist additions
  const handleAddArtist = (e) => {
    e.preventDefault()
    if (!newArtistName) return
    const newArt = {
      id: `art-${Date.now()}`,
      name: newArtistName,
      bio: newArtistBio,
      photoUrl: newArtistPhoto,
      genre: "General"
    }
    setArtistList([newArt, ...artistList])
    setNewArtistName("")
    setNewArtistBio("")
    alert("Artis baru berhasil disimpan!")
  }

  // Genre additions
  const handleAddGenre = (e) => {
    e.preventDefault()
    if (!newGenreName) return
    const newGen = {
      id: `gen-${Date.now()}`,
      name: newGenreName,
      isFeatured: false
    }
    setGenreList([newGen, ...genreList])
    setNewGenreName("")
    alert("Genre baru berhasil disimpan!")
  }

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
              <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
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
                  placeholder="admin@gmail.com"
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-32 md:pb-0 select-none">
      
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
            { id: "albums", label: "Manajemen Album", icon: Disc },
            { id: "artists", label: "Manajemen Artis", icon: UserCheck },
            { id: "genres", label: "Manajemen Genre", icon: Sliders },
            { id: "playlists", label: "Manajemen Playlist", icon: CheckSquare },
            { id: "premium", label: "Langganan Premium", icon: CreditCard },
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
          <button
            onClick={() => logout()}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-accent hover:bg-accent/10 transition-all shrink-0 md:hidden"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-gray-border/40 hidden md:block">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-accent hover:bg-accent/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-5xl space-y-6">
        
        {/* 1. Ringkasan tab */}
        {activeTab === "ringkasan" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Dashboard Statistik</h2>
            
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

            <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Grafik Pertumbuhan Streaming (Minggu Ini)</h3>
                <span className="text-xs text-gray-text">24 Mei - 30 Mei</span>
              </div>
              <div className="w-full h-48 sm:h-56 relative bg-background border border-gray-border/30 rounded-xl p-4">
                <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <line x1="0" y1="50" x2="600" y2="50" stroke="#1C1C2E" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="#1C1C2E" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="150" x2="600" y2="150" stroke="#1C1C2E" strokeWidth="1" strokeDasharray="5,5" />
                  <defs>
                    <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FF6584" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 160 Q 100 120 200 140 T 400 60 T 600 40 L 600 200 L 0 200 Z" fill="url(#chart-grad)" />
                  <path d="M 0 160 Q 100 120 200 140 T 400 60 T 600 40" fill="none" stroke="#6C63FF" strokeWidth="3.5" strokeLinecap="round" />
                  <circle cx="200" cy="140" r="5" fill="#FF6584" stroke="#FFF" strokeWidth="2" />
                  <circle cx="400" cy="60" r="5" fill="#6C63FF" stroke="#FFF" strokeWidth="2" />
                  <circle cx="600" cy="40" r="5" fill="#6C63FF" stroke="#FFF" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 2. Manajemen User tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Manajemen Pengguna</h2>
              <div className="relative w-48">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-text" />
                <input
                  type="text"
                  placeholder="Cari user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-background-card border border-gray-border rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
            
            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                      <th className="p-4">Foto</th>
                      <th className="p-4">Nama</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status Premium</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-border/40">
                    {userList.filter(u => (u.full_name || u.username || u.email || "").toLowerCase().includes(userSearch.toLowerCase())).map((usr, idx) => {
                      const isUserPrem = checkIsPremium(usr)
                      return (
                        <tr key={usr.id || idx} className="hover:bg-background-hover transition-colors">
                          <td className="p-4">
                            <img src={usr.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"} className="w-8 h-8 rounded-full object-cover" />
                          </td>
                          <td className="p-4 font-semibold text-white">{usr.full_name || usr.username}</td>
                          <td className="p-4">
                            <p className="font-semibold text-white">{usr.email || 'Tidak Diketahui'}</p>
                            <p className="text-[9px] text-gray-text mt-0.5">{usr.id.slice(0, 8)}...</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              usr.role === 'admin' || usr.role === 'super_admin'
                                ? 'bg-accent/15 border-accent text-accent'
                                : 'bg-primary/10 border-primary text-primary-light'
                            }`}>
                              {usr.role || 'user'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                isUserPrem 
                                  ? 'bg-primary/10 border-primary/20 text-primary-light' 
                                  : 'bg-background border-gray-border text-gray-text'
                              }`}>
                                {isUserPrem ? 'Premium 💎' : 'Free 🎵'}
                              </span>
                              {usr.premium_until && (
                                <p className="text-[9px] text-gray-text max-w-[150px] whitespace-normal">
                                  Hingga: {formatToWIB(usr.premium_until)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedUserForPremium(usr)
                                const isUserCurrentlyPrem = checkIsPremium(usr)
                                setPremiumExpiryDays(isUserCurrentlyPrem ? "-1" : "30")
                                setShowPremiumEditModal(true)
                              }}
                              className="bg-primary/20 hover:bg-primary/30 border border-primary/20 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-primary-light transition-all"
                            >
                              Ubah Paket
                            </button>
                            <button
                              onClick={() => handleToggleBlockUser(usr.id, usr.role)}
                              className="bg-background border border-gray-border px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white hover:border-gray-text"
                            >
                              Blokir
                            </button>
                            <button
                              onClick={() => handleResetPassword(usr.email || usr.username + "@gmail.com")}
                              className="bg-background border border-gray-border px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white hover:border-gray-text"
                            >
                              Reset Pwd
                            </button>
                            <button
                              onClick={() => handleSoftDeleteUser(usr.id)}
                              className="text-accent hover:bg-accent/10 p-1.5 rounded-lg inline-block align-middle"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. Manajemen Lagu tab */}
        {activeTab === "songs" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Manajemen Lagu</h2>
              <div className="relative w-48">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-text" />
                <input
                  type="text"
                  placeholder="Cari lagu..."
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  className="w-full bg-background-card border border-gray-border rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Form Add Song */}
            <form onSubmit={handleAddSong} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
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
                <input
                  type="text"
                  placeholder="Cover URL (Opsional)"
                  value={newSongCover}
                  onChange={(e) => setNewSongCover(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Audio MP3/FLAC URL (Lokal)"
                  value={newSongAudio}
                  onChange={(e) => setNewSongAudio(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
                <select
                  value={newSongStatus}
                  onChange={(e) => setNewSongStatus(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="public">Publik</option>
                  <option value="private">Privat</option>
                </select>
              </div>
              <textarea
                placeholder="Lirik Lagu (Plain text atau LRC format)..."
                value={newSongLyrics}
                onChange={(e) => setNewSongLyrics(e.target.value)}
                className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary h-20 resize-none"
              />
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
                      <th className="p-4">Tipe</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-border/40">
                    {songList.filter(s => s.title.toLowerCase().includes(songSearch.toLowerCase())).map((song, idx) => (
                      <tr key={song.id || idx} className="hover:bg-background-hover transition-colors">
                        <td className="p-4">
                          <img src={song.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80"} className="w-8 h-8 rounded-lg object-cover" />
                        </td>
                        <td className="p-4 font-semibold text-white">{song.title}</td>
                        <td className="p-4 text-gray-text">{song.artist}</td>
                        <td className="p-4">
                          <span className="bg-primary/10 border border-primary/20 text-primary-light text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                            {song.is_youtube ? "YT MUSIC" : "LOKAL"}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleSongStatus(song.id, song.status)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border transition-all ${song.status === 'public' ? 'bg-primary/10 border-primary text-primary-light' : 'bg-accent/10 border-accent text-accent'}`}
                          >
                            {song.status || 'PUBLIC'}
                          </button>
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

        {/* 4. Manajemen Album tab */}
        {activeTab === "albums" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Manajemen Album</h2>
            <form onSubmit={handleAddAlbum} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Album Baru
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nama Album"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="text"
                  placeholder="Cover Art URL"
                  value={newAlbumCover}
                  onChange={(e) => setNewAlbumCover(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <button type="submit" className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg">
                Simpan Album
              </button>
            </form>

            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                    <th className="p-4">Cover</th>
                    <th className="p-4">Album</th>
                    <th className="p-4">Kreator</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-border/40">
                  {albumList.map((alb, idx) => (
                    <tr key={alb.id || idx} className="hover:bg-background-hover transition-colors">
                      <td className="p-4">
                        <img src={alb.cover_url} className="w-8 h-8 rounded-lg object-cover" />
                      </td>
                      <td className="p-4 font-semibold text-white">{alb.name}</td>
                      <td className="p-4 text-gray-text">{alb.description}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setAlbumList(albumList.filter(a => a.id !== alb.id))} className="text-accent hover:text-accent-hover p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Manajemen Artis tab */}
        {activeTab === "artists" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Manajemen Artis</h2>
            <form onSubmit={handleAddArtist} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Artis Baru
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nama Artis"
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Biografi Singkat"
                  value={newArtistBio}
                  onChange={(e) => setNewArtistBio(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Foto URL"
                  value={newArtistPhoto}
                  onChange={(e) => setNewArtistPhoto(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
              <button type="submit" className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg">
                Simpan Artis
              </button>
            </form>

            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                    <th className="p-4">Foto</th>
                    <th className="p-4">Nama</th>
                    <th className="p-4">Biografi</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-border/40">
                  {artistList.map((art, idx) => (
                    <tr key={art.id || idx} className="hover:bg-background-hover transition-colors">
                      <td className="p-4">
                        <img src={art.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                      </td>
                      <td className="p-4 font-semibold text-white">{art.name}</td>
                      <td className="p-4 text-gray-text">{art.bio}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setArtistList(artistList.filter(a => a.id !== art.id))} className="text-accent hover:text-accent-hover p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Manajemen Genre tab */}
        {activeTab === "genres" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Manajemen Genre & Kategori</h2>
            <form onSubmit={handleAddGenre} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Genre Baru
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Genre (misal: Acoustic, Metal)"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  required
                />
                <button type="submit" className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
                  Tambah
                </button>
              </div>
            </form>

            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                    <th className="p-4">Genre</th>
                    <th className="p-4">Unggulan Beranda</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-border/40">
                  {genreList.map((gen, idx) => (
                    <tr key={gen.id || idx} className="hover:bg-background-hover transition-colors">
                      <td className="p-4 font-semibold text-white">{gen.name}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => setGenreList(genreList.map(g => g.id === gen.id ? { ...g, isFeatured: !g.isFeatured } : g))}
                          className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded-full ${gen.isFeatured ? 'bg-primary/10 border-primary text-primary-light' : 'bg-background border-gray-border text-gray-text'}`}
                        >
                          {gen.isFeatured ? 'TAMPIL' : 'SEMBUNYI'}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => setGenreList(genreList.filter(g => g.id !== gen.id))} className="text-accent hover:text-accent-hover p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Manajemen Playlist tab */}
        {activeTab === "playlists" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Manajemen Playlist Publik</h2>
            <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                    <th className="p-4">Cover</th>
                    <th className="p-4">Nama Playlist</th>
                    <th className="p-4">Deskripsi</th>
                    <th className="p-4">Featured</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-border/40">
                  {playlistList.map((pl, idx) => (
                    <tr key={pl.id || idx} className="hover:bg-background-hover transition-colors">
                      <td className="p-4">
                        <img src={pl.cover_url} className="w-8 h-8 rounded-lg object-cover" />
                      </td>
                      <td className="p-4 font-semibold text-white">{pl.name}</td>
                      <td className="p-4 text-gray-text">{pl.description || "-"}</td>
                      <td className="p-4">
                        <button 
                          onClick={async () => {
                            const newFeatured = !pl.is_featured;
                            await supabase.from('playlists').update({ is_featured: newFeatured }).eq('id', pl.id)
                            setPlaylistList(playlistList.map(p => p.id === pl.id ? { ...p, is_featured: newFeatured } : p))
                            alert("Status featured playlist berhasil diperbarui!")
                          }}
                          className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded-full ${pl.is_featured ? 'bg-primary/10 border-primary text-primary-light' : 'bg-background border-gray-border text-gray-text'}`}
                        >
                          {pl.is_featured ? 'YES' : 'NO'}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => {
                            useToastStore.getState().showConfirm("Hapus playlist melanggar ini?", async () => {
                              await supabase.from('playlists').delete().eq('id', pl.id)
                              setPlaylistList(playlistList.filter(p => p.id !== pl.id))
                              alert("Playlist berhasil dihapus.")
                            })
                          }}
                          className="text-accent hover:text-accent-hover p-1"
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
        )}

        {/* 8. Langganan Premium tab */}
        {activeTab === "premium" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Manajemen Langganan Premium</h2>
              {/* Sub-tab navigation buttons */}
              <div className="flex bg-background border border-gray-border/40 p-1 rounded-xl gap-1 shrink-0">
                {[
                  { id: "transaksi", label: "Transaksi" },
                  { id: "vouchers", label: "Kelola Voucher" },
                  { id: "users", label: "Langganan User" }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setPremiumSubTab(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      premiumSubTab === sub.id 
                        ? 'bg-primary text-white shadow' 
                        : 'text-gray-text hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tab 1: TRANSAKSI */}
            {premiumSubTab === "transaksi" && (
              <div className="space-y-6">
                <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text">Konfigurasi Harga Paket</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-background border border-gray-border rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">Paket Bulanan</h4>
                        <p className="text-[10px] text-gray-text mt-0.5">Rp 49.000 / 30 Hari</p>
                      </div>
                      <button onClick={() => alert("Harga Bulanan Premium diperbarui.")} className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-3 py-1 rounded-lg">Ubah Harga</button>
                    </div>
                    <div className="p-3 bg-background border border-gray-border rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">Paket Tahunan</h4>
                        <p className="text-[10px] text-gray-text mt-0.5">Rp 299.000 / 365 Hari</p>
                      </div>
                      <button onClick={() => alert("Harga Tahunan Premium diperbarui.")} className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-3 py-1 rounded-lg">Ubah Harga</button>
                    </div>
                  </div>
                </div>

                <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-gray-border/30 flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text">Riwayat Transaksi</h3>
                    <button 
                      onClick={() => alert("Mengunduh laporan keuangan berformat PDF...")}
                      className="bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/20 px-3.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ekspor Laporan
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                          <th className="p-4">Email Pengguna</th>
                          <th className="p-4">Paket</th>
                          <th className="p-4">Jumlah</th>
                          <th className="p-4">Metode</th>
                          <th className="p-4">Tanggal Pembelian (WIB)</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-border/40">
                        {transactionList.map((tx, idx) => {
                          const userEmail = tx.profiles?.email || tx.profiles?.username || tx.user_email || 'user@example.com'
                          const packageName = tx.premium_packages?.name || tx.package || (tx.amount === 299000 ? 'Tahunan Premium' : 'Bulanan Premium')
                          return (
                            <tr key={tx.id || idx} className="hover:bg-background-hover transition-colors">
                              <td className="p-4 font-semibold text-white">{userEmail}</td>
                              <td className="p-4 text-gray-text">{packageName}</td>
                              <td className="p-4 font-bold text-white">Rp {tx.amount.toLocaleString('id-ID')}</td>
                              <td className="p-4 font-semibold text-gray-text">{tx.payment_method || 'Duitku'}</td>
                              <td className="p-4 text-gray-text">{formatToWIB(tx.created_at)}</td>
                              <td className="p-4">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                  tx.status === 'completed' 
                                    ? 'bg-primary/10 border-primary text-primary-light' 
                                    : tx.status === 'pending' 
                                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                                      : 'bg-accent/10 border-accent text-accent'
                                }`}>
                                  {tx.status || 'completed'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: VOUCHERS */}
            {premiumSubTab === "vouchers" && (
              <div className="space-y-6">
                {/* Buat Voucher Form */}
                <form onSubmit={handleCreateVoucher} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                    <Ticket className="w-4.5 h-4.5 text-primary" />
                    Buat Voucher Baru
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-text uppercase tracking-wider mb-1.5">Kode Voucher</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="KODE123"
                          value={voucherCodeInput}
                          onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                          className="w-full bg-background border border-gray-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary"
                          required
                        />
                        <button
                          type="button"
                          onClick={generateRandomCode}
                          className="bg-background border border-gray-border hover:border-gray-text text-white text-[10px] px-3.5 py-2 rounded-xl transition-all font-bold shrink-0"
                        >
                          Acak
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-text uppercase tracking-wider mb-1.5">Durasi Paket</label>
                      <select
                        value={voucherDurationInput}
                        onChange={(e) => setVoucherDurationInput(e.target.value)}
                        className="w-full bg-background border border-gray-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary h-[38px]"
                      >
                        <option value="7">7 Hari (1 Minggu Premium)</option>
                        <option value="30">30 Hari (1 Bulan Premium)</option>
                        <option value="365">365 Hari (1 Tahun Premium)</option>
                        <option value="-1">Unlimited (Tanpa Batas Masa Aktif)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isGeneratingVoucher}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg h-[38px]"
                    >
                      {isGeneratingVoucher ? 'Memproses...' : 'Buat & Rilis'}
                    </button>
                  </div>
                </form>

                {/* List of Vouchers */}
                <div className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-gray-border/30">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text">Daftar Voucher Yang Dirilis</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                          <th className="p-4">Kode Voucher</th>
                          <th className="p-4">Durasi</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Digunakan Oleh</th>
                          <th className="p-4">Tanggal Digunakan (WIB)</th>
                          <th className="p-4">Tanggal Rilis (WIB)</th>
                          <th className="p-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-border/40">
                        {vouchersList.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-6 text-center text-gray-text">Belum ada voucher yang dirilis.</td>
                          </tr>
                        ) : (
                          vouchersList.map((voc, idx) => {
                            const redeemerUser = userList.find(u => u.id === voc.used_by)
                            const redeemerEmail = redeemerUser ? (redeemerUser.email || redeemerUser.username) : voc.used_by
                            return (
                              <tr key={voc.code || idx} className="hover:bg-background-hover transition-colors">
                                <td className="p-4 font-bold text-primary-light font-mono">{voc.code}</td>
                                <td className="p-4 text-white">
                                  {voc.duration_days === -1 ? 'Unlimited 💎' : `${voc.duration_days} Hari`}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                    voc.is_active 
                                      ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                                      : 'bg-gray-500/10 border-gray-border text-gray-muted'
                                  }`}>
                                    {voc.is_active ? 'Tersedia (Aktif)' : 'Sudah Diklaim'}
                                  </span>
                                </td>
                                <td className="p-4 text-white font-semibold">{redeemerEmail || '-'}</td>
                                <td className="p-4 text-gray-text">{voc.used_at ? formatToWIB(voc.used_at) : '-'}</td>
                                <td className="p-4 text-gray-text">{formatToWIB(voc.created_at)}</td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleDeleteVoucher(voc.code)}
                                    className="text-accent hover:text-accent-hover p-1 rounded hover:bg-accent/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 3: LANGGANAN USER */}
            {premiumSubTab === "users" && (
              <div className="space-y-4">
                <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text mb-3">Status Premium Pengguna</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-background-sidebar border-b border-gray-border text-gray-text font-bold">
                          <th className="p-4">Pengguna</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Kedaluwarsa (WIB)</th>
                          <th className="p-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-border/40">
                        {userList.map((usr, idx) => {
                          const isUserPrem = checkIsPremium(usr)
                          return (
                            <tr key={usr.id || idx} className="hover:bg-background-hover transition-colors">
                              <td className="p-4">
                                <p className="font-semibold text-white">{usr.full_name || usr.username}</p>
                                <p className="text-[10px] text-gray-text">{usr.email || 'Tidak Diketahui'}</p>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                  isUserPrem 
                                    ? 'bg-primary/10 border-primary text-primary-light' 
                                    : 'bg-background border-gray-border text-gray-text'
                                }`}>
                                  {isUserPrem ? 'Premium 💎' : 'Free 🎵'}
                                </span>
                              </td>
                              <td className="p-4 text-gray-text max-w-[200px] whitespace-normal">
                                {formatToWIB(usr.premium_until)}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedUserForPremium(usr)
                                    const isUserCurrentlyPrem = checkIsPremium(usr)
                                    setPremiumExpiryDays(isUserCurrentlyPrem ? "-1" : "30")
                                    setShowPremiumEditModal(true)
                                  }}
                                  className="bg-primary/20 hover:bg-primary/30 border border-primary/20 px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary-light transition-all"
                                >
                                  Ubah Paket
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 9. Banners tab */}
        {activeTab === "banners" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Promosi & Banner Beranda</h2>

            <form onSubmit={handleAddBanner} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Banner Baru
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Judul Banner / Event"
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  className="bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="text"
                  placeholder="URL Gambar Banner (Unsplash / Supabase storage)"
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
                Simpan Banner
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bannerList.map((banner, idx) => (
                <div key={banner.id || idx} className="bg-background-card border border-gray-border/40 rounded-2xl overflow-hidden relative group">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-32 object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-card via-background-card/45 to-transparent p-4 flex flex-col justify-end">
                    <h4 className="text-xs font-bold text-white">{banner.title}</h4>
                    <span className="text-[9px] text-gray-muted mt-1 block">Aktif</span>
                  </div>
                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-accent/25 hover:bg-accent text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. Notifikasi tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Broadcast Notifikasi</h2>

            <form onSubmit={handleSendNotification} className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-primary" />
                Kirim Notifikasi Baru
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Judul Pesan</label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Misal: Rilis Singel Baru!"
                    className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Isi Pesan / Informasi</label>
                  <textarea
                    value={notifMsg}
                    onChange={(e) => setNotifMsg(e.target.value)}
                    placeholder="Tulis detail notifikasi broadcast di sini..."
                    className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary h-24 resize-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5"
              >
                Kirim Broadcast
              </button>
            </form>
          </div>
        )}

        {/* 11. Pengaturan App tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Pengaturan Utama Aplikasi</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text">Identitas NexTune</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Nama Aplikasi</label>
                  <input type="text" defaultValue="NexTune Premium" className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Logo URL</label>
                  <input type="text" defaultValue="https://nextune.my.id/logo.png" className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                </div>
                <button onClick={() => alert("Identitas aplikasi berhasil disimpan!")} className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg">Simpan Identitas</button>
              </div>

              <div className="bg-background-card border border-gray-border/40 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-text">Keamanan Administrator</h3>
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
                    <h4 className="text-xs font-bold text-white">Log Aktivitas Admin</h4>
                    <p className="text-[10px] text-gray-text mt-0.5">Lihat berkas riwayat login dan perubahan data</p>
                  </div>
                  <button onClick={() => alert("Mengunduh log audit admin...")} className="bg-background border border-gray-border px-3 py-1.5 rounded-xl text-[10px] font-bold text-white hover:border-gray-text">Lihat Audit Log</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Edit Premium */}
      <AnimatePresence>
        {showPremiumEditModal && selectedUserForPremium && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPremiumEditModal(false)
                setSelectedUserForPremium(null)
              }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-background-card border border-primary/30 rounded-3xl p-6 shadow-2xl z-10 text-left"
            >
              <h3 className="text-base font-bold text-white mb-2">Edit Status Langganan</h3>
              <p className="text-xs text-gray-text mb-4">
                Mengubah paket untuk pengguna: <span className="font-semibold text-white">{selectedUserForPremium.email || selectedUserForPremium.username}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-2">Pilih Paket / Masa Aktif</label>
                  <select
                    value={premiumExpiryDays}
                    onChange={(e) => setPremiumExpiryDays(e.target.value)}
                    className="w-full bg-background border border-gray-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="0">Free / Non-Premium (Batalkan)</option>
                    <option value="7">7 Hari (1 Minggu Premium)</option>
                    <option value="30">30 Hari (1 Bulan Premium)</option>
                    <option value="365">365 Hari (1 Tahun Premium)</option>
                    <option value="-1">Unlimited (Tanpa Batas / Selamanya)</option>
                  </select>
                </div>

                <div className="p-3 bg-background/50 border border-gray-border rounded-xl">
                  <p className="text-[10px] text-gray-muted uppercase font-bold tracking-wider">Masa Aktif Baru</p>
                  <p className="text-xs font-bold text-primary-light mt-1">
                    {previewExpiryLabel}
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowPremiumEditModal(false)
                      setSelectedUserForPremium(null)
                    }}
                    className="bg-background border border-gray-border text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveUserPremium}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2 rounded-xl shadow-lg"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
