import { useState } from 'react'
import { User, Key, BarChart2, LogOut, CheckCircle2, AlertCircle, RefreshCw, Crown, Settings } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function Profile() {
  const { user, profile, logout, updateProfile, updatePassword } = useAuthStore()

  // Initialize state directly from profile to avoid synchronous setState inside useEffect
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"
  )
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Message & loading state handlers
  const [loading, setLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileMsg({ type: '', text: '' })
    if (!fullName.trim()) return

    setLoading(true)
    const result = await updateProfile(fullName, avatarUrl)
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

  return (
    <div className="pb-32 px-4 sm:px-6 pt-4 max-w-4xl mx-auto space-y-6">
      
      {/* Profil Header Card */}
      <div className="bg-background-card border border-gray-border/50 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl"></div>

        <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-lg shadow-primary/10 relative" />
        
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
      {(() => {
        const isPremium = profile && (
          ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role) ||
          (profile.premium_until && new Date(profile.premium_until) > new Date())
        )
        return (
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
        )
      })()}

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
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">URL Foto Profil</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-background border border-gray-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Simpan Perubahan
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
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          Statistik Mendengarkan
        </h3>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-background border border-gray-border/30 p-3 sm:p-4 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-primary-light">42</p>
            <p className="text-[10px] sm:text-xs text-gray-text mt-1">Lagu Didengar</p>
          </div>
          <div className="bg-background border border-gray-border/30 p-3 sm:p-4 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-accent">5</p>
            <p className="text-[10px] sm:text-xs text-gray-text mt-1">Artis Favorit</p>
          </div>
          <div className="bg-background border border-gray-border/30 p-3 sm:p-4 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-white">Pop</p>
            <p className="text-[10px] sm:text-xs text-gray-text mt-1">Genre Teratas</p>
          </div>
        </div>
      </div>

    </div>
  )
}
