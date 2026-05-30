import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Search as SearchIcon, Library as LibIcon, User, ShieldAlert, Bell, X, Settings } from 'lucide-react'
import { useAuthStore, checkIsPremium } from './store/useAuthStore'
import { usePlayerStore } from './store/usePlayerStore'
import { supabase } from './supabaseClient'

// Pages
import SplashScreen from './pages/SplashScreen'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Profile from './pages/Profile'
import Dashboard from './pages/admin/Dashboard'

// Components
import MusicPlayer from './components/Player/MusicPlayer'
import AuthModal from './components/Auth/AuthModal'
import PremiumModal from './components/Premium/PremiumModal'
import ToastContainer from './components/Toast/ToastContainer'

export default function App() {
  const { user, profile, checkUser } = useAuthStore()
  const { initAudio } = usePlayerStore()

  const [showSplash, setShowSplash] = useState(true)
  const [currentPage, setCurrentPage] = useState("home") // 'home' | 'search' | 'library' | 'profile' | 'admin'
  const [authModalState, setAuthModalState] = useState({ isOpen: false, defaultMode: 'login' })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false)

  const isPremium = checkIsPremium(profile)

  useEffect(() => {
    const handlePremiumRequired = () => {
      setIsPremiumModalOpen(true)
    }
    const handleOpenSettings = () => {
      setIsSettingsOpen(true)
    }

    window.addEventListener('premium-required', handlePremiumRequired)
    window.addEventListener('open-premium-modal', handlePremiumRequired)
    window.addEventListener('open-settings-modal', handleOpenSettings)

    return () => {
      window.removeEventListener('premium-required', handlePremiumRequired)
      window.removeEventListener('open-premium-modal', handlePremiumRequired)
      window.removeEventListener('open-settings-modal', handleOpenSettings)
    }
  }, [])

  // Notification States
  const [notifications, setNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false)

  useEffect(() => {
    checkUser()
    initAudio()
  }, [])

  // Listen to in-app real-time notifications via Supabase Realtime
  useEffect(() => {
    if (!user) return

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(10)
        
        setNotifications(data || [])
        setHasUnreadNotif((data || []).some(n => !n.is_read))
      } catch (error) {
        console.warn("Gagal mengambil notifikasi dari Supabase, menggunakan mock data.", error)
        // Fallback mock notifications
        setNotifications([
          { id: "mock-n1", title: "Lagu Baru Tersedia", message: "Single terbaru dari Pamungkas kini hadir di NexTune!", is_read: false },
          { id: "mock-n2", title: "Selamat Datang!", message: "Terima kasih telah bergabung di NexTune Musik.", is_read: true }
        ])
        setHasUnreadNotif(true)
      }
    }
    
    fetchNotifications()

    // Realtime channel
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const newNotif = payload.new
        if (!newNotif.user_id || newNotif.user_id === user.id) {
          setNotifications(prev => [newNotif, ...prev])
          setHasUnreadNotif(true)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleMarkNotifAsRead = async () => {
    setHasUnreadNotif(false)
    if (!user) return
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
    } catch (e) {
      console.log(e)
    }
  }

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalState({ isOpen: true, defaultMode: mode })
  }

  const handlePageChange = (page) => {
    window.dispatchEvent(new CustomEvent('collapse-player'))
    if (page === 'admin') {
      setCurrentPage('admin')
      return
    }
    setCurrentPage(page)
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  const isAdminUser = profile && ['admin', 'super_admin', 'content_admin'].includes(profile.role)

  if (isAdminUser) {
    return <Dashboard />
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans select-none">
      
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 bg-background-sidebar border-b border-gray-border/60 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow shadow-primary/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-extrabold tracking-wider text-white text-base">NexTune</span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-4">

          {/* Settings Button moved to Profile page */}

          {/* Notification Button & Red Dot indicator */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifPanel(!showNotifPanel); if(!showNotifPanel) handleMarkNotifAsRead(); }}
              className="p-1.5 hover:text-white text-gray-text relative transition-colors"
            >
              <Bell className="w-5 h-5" />
              {hasUnreadNotif && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background-sidebar"></span>
              )}
            </button>
            
            {/* Notification Panel Dropdown */}
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-background-card border border-gray-border rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-border/50">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-primary" /> Notifikasi In-App
                  </h4>
                  <button onClick={() => setShowNotifPanel(false)} className="text-gray-muted hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto no-scrollbar space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-gray-muted text-center py-6">Tidak ada notifikasi baru.</p>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div key={notif.id || idx} className="p-2 bg-background border border-gray-border/30 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white">{notif.title}</span>
                          {!notif.is_read && <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0"></span>}
                        </div>
                        <p className="text-[10px] text-gray-text leading-normal">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Login / User trigger */}
          {user ? (
            <div 
              onClick={() => handlePageChange('profile')}
              className="w-7 h-7 rounded-full overflow-hidden border border-primary/40 cursor-pointer"
            >
              <img 
                src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
          ) : (
            <button
              onClick={() => handleOpenAuth('login')}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-primary/10 transition-all"
            >
              Masuk
            </button>
          )}
        </div>
      </header>

      {/* 2. BODY FRAME: SIDEBAR (DESKTOP) + CONTENT WRAPPER */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Layout */}
        <aside className="hidden sm:flex flex-col w-56 bg-background-sidebar border-r border-gray-border/60 shrink-0 p-4 justify-between">
          <div className="space-y-6">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-muted pl-2">Menu</span>
            <nav className="space-y-1">
              {[
                { id: "home", label: "Beranda", icon: Compass },
                { id: "search", label: "Pencarian", icon: SearchIcon },
                { id: "library", label: "Koleksi Saya", icon: LibIcon },
                { id: "profile", label: "Profil Akun", icon: User },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      currentPage === item.id 
                        ? 'bg-primary text-white shadow-md shadow-primary/10' 
                        : 'text-gray-text hover:text-white hover:bg-background-card/50'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>

            {!isPremium && user && (
              <div className="mt-4 p-3 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/15 border border-primary/20 rounded-2xl space-y-2 text-left relative overflow-hidden">
                <div className="text-[10px] font-black text-primary-light uppercase tracking-wider">NexTune Premium</div>
                <div className="text-[9.5px] text-gray-text leading-relaxed">Buka kualitas FLAC & dengar lagu penuh tanpa batas 30 detik.</div>
                <button 
                  onClick={() => setIsPremiumModalOpen(true)}
                  className="w-full bg-primary hover:bg-primary-hover text-[10px] font-bold py-1.5 rounded-lg text-white transition-all shadow-md shadow-primary/15"
                >
                  Upgrade Sekarang
                </button>
              </div>
            )}
          </div>

          {/* Admin panel link in sidebar bottom */}
          {isAdminUser && (
            <div className="pt-4 border-t border-gray-border/40">
              <button
                onClick={() => handlePageChange('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  currentPage === 'admin' 
                    ? 'bg-accent border-accent text-white' 
                    : 'border-accent/30 text-accent hover:bg-accent/10'
                }`}
              >
                <ShieldAlert className="w-4.5 h-4.5" />
                <span>Panel Admin</span>
              </button>
            </div>
          )}
        </aside>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentPage === "home" && <Home onOpenAuth={handleOpenAuth} />}
              {currentPage === "search" && <Search onOpenAuth={handleOpenAuth} />}
              {currentPage === "library" && <Library onOpenAuth={handleOpenAuth} />}
              {currentPage === "profile" && <Profile />}
              {currentPage === "admin" && <Dashboard />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 3. PERSISTENT PLAYER MODULE */}
      <MusicPlayer />

      {/* 4. MOBILE BOTTOM NAVIGATION BAR (Anchored at very bottom) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-background-sidebar border-t border-gray-border/60 flex justify-around items-center px-4 z-50 shadow-2xl backdrop-blur-md bg-opacity-95 select-none">
        {[
          { id: "home", label: "Beranda", icon: Compass },
          { id: "search", label: "Cari", icon: SearchIcon },
          { id: "library", label: "Koleksi", icon: LibIcon },
          { id: "profile", label: "Profil", icon: User }
        ].map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => handlePageChange(item.id)}
              className="flex flex-col items-center gap-1 py-1 text-gray-text hover:text-white transition-colors"
            >
              <Icon className={`w-5.5 h-5.5 transition-transform ${isActive ? 'text-primary scale-110' : ''}`} />
              <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'text-primary' : 'text-gray-text'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
        {isAdminUser && (
          <button
            onClick={() => handlePageChange('admin')}
            className="flex flex-col items-center gap-1 py-1 text-gray-text hover:text-white"
          >
            <ShieldAlert className={`w-5.5 h-5.5 ${currentPage === 'admin' ? 'text-accent scale-110' : 'text-accent/60'}`} />
            <span className={`text-[9px] font-bold tracking-tight ${currentPage === 'admin' ? 'text-accent' : 'text-accent/60'}`}>
              Admin
            </span>
          </button>
        )}
      </nav>

      {/* 5. POPUP AUTHENTICATION MODAL */}
      <AuthModal
        isOpen={authModalState.isOpen}
        defaultMode={authModalState.defaultMode}
        onClose={() => setAuthModalState({ isOpen: false, defaultMode: 'login' })}
      />

      {/* Premium Upgrade Modal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />

      {/* 5.5. TOAST AND CONFIRM DIALOG CONTAINER */}
      <ToastContainer />

      {/* 6. SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-background-card border border-primary/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl z-10 space-y-6 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-border/50">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Pengaturan Aplikasi
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-text hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Dark / Light Mode */}
                <div className="flex items-center justify-between p-3 bg-background/50 border border-gray-border/40 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">Mode Tampilan</h4>
                    <p className="text-[10px] text-gray-text mt-0.5">Pilih tema gelap atau terang</p>
                  </div>
                  <button 
                    onClick={() => {
                      const root = document.documentElement;
                      if (root.classList.contains('light')) {
                        root.classList.remove('light');
                        localStorage.setItem('theme', 'dark');
                      } else {
                        root.classList.add('light');
                        localStorage.setItem('theme', 'light');
                      }
                      alert("Tema berhasil diubah!");
                    }}
                    className="bg-primary hover:bg-primary-hover text-white font-bold px-3 py-1.5 rounded-lg"
                  >
                    Ubah Tema
                  </button>
                </div>

                {/* Streaming Quality */}
                <div className="flex items-center justify-between p-3 bg-background/50 border border-gray-border/40 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">Kualitas Audio</h4>
                    <p className="text-[10px] text-gray-text mt-0.5">Atur resolusi audio streaming</p>
                  </div>
                  <select 
                    defaultValue={localStorage.getItem('stream_quality') || 'high'}
                    onChange={(e) => {
                      localStorage.setItem('stream_quality', e.target.value);
                      alert(`Kualitas diatur ke: ${e.target.value === 'low' ? 'Rendah' : e.target.value === 'medium' ? 'Standar' : 'Tinggi (FLAC)'}`);
                    }}
                    className="bg-background border border-gray-border rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs"
                  >
                    <option value="low">Rendah (96kbps)</option>
                    <option value="medium">Standar (192kbps)</option>
                    <option value="high">Tinggi (320kbps / FLAC)</option>
                  </select>
                </div>

                {/* Clear Cache */}
                <div className="flex items-center justify-between p-3 bg-background/50 border border-gray-border/40 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">Pembersihan</h4>
                    <p className="text-[10px] text-gray-text mt-0.5">Hapus cache penyimpanan lokal</p>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem("nextune_offline_tracks");
                      alert("Cache pemutaran & data offline berhasil dihapus!");
                    }}
                    className="bg-accent/20 border border-accent/30 text-accent font-bold px-3 py-1.5 rounded-lg hover:bg-accent/30"
                  >
                    Hapus Cache
                  </button>
                </div>

                {/* About NexTune */}
                <div className="p-3 bg-background/50 border border-gray-border/40 rounded-xl space-y-1">
                  <h4 className="font-bold text-white">Tentang NexTune</h4>
                  <p className="text-[10px] text-gray-text leading-relaxed">
                    NexTune adalah aplikasi streaming musik modern premium yang dirancang untuk memberikan pengalaman audio tanpa hambatan dengan kualitas studio terbaik.
                  </p>
                  <p className="text-[9px] text-gray-muted mt-1 font-mono">Versi 1.0.0 (Release-Build)</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
