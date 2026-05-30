import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Check, Loader, Sparkles, Ticket, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuthStore, checkIsPremium } from '../../store/useAuthStore'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

export default function PremiumModal({ isOpen, onClose }) {
  const { user, profile, checkUser } = useAuthStore()
  
  const [packages, setPackages] = useState([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  
  const [paymentStep, setPaymentStep] = useState('select_package')
  // 'select_package' | 'processing' | 'waiting' | 'success'

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('')
  const [redeemingVoucher, setRedeemingVoucher] = useState(false)
  const [voucherError, setVoucherError] = useState('')

  // Load packages on open
  useEffect(() => {
    if (!isOpen) return

    const loadPackages = async () => {
      setLoadingPackages(true)
      try {
        let { data: pkgs, error } = await supabase
          .from('premium_packages')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true })

        if (error) throw error

        if (!pkgs || pkgs.length === 0) {
          const defaultPkgs = [
            { 
              name: 'Bulanan Premium', 
              price: 49000, 
              features: ['Pemutaran Lagu Full (Tanpa Batas)', 'Bebas Iklan', 'Sleep Timer Aktif', 'Kecepatan Putar Kustom', 'Audio Kualitas FLAC'], 
              duration_days: 30,
              is_active: true 
            },
            { 
              name: 'Tahunan Premium', 
              price: 299000, 
              features: ['Semua Fitur Paket Bulanan', 'Hemat Hingga 50%', 'Dukungan Prioritas', 'Badge Premium Spesial'], 
              duration_days: 365,
              is_active: true 
            }
          ]
          const { data: seeded, error: seedError } = await supabase
            .from('premium_packages')
            .insert(defaultPkgs)
            .select()
          if (seedError) throw seedError
          setPackages(seeded || defaultPkgs)
        } else {
          setPackages(pkgs)
        }
      } catch (err) {
        console.error('Gagal memuat paket premium:', err)
        setPackages([
          { id: 'mock-p1', name: 'Bulanan Premium', price: 49000, features: ['Pemutaran Lagu Full (Tanpa Batas)', 'Sleep Timer Aktif', 'Kecepatan Putar Kustom', 'Audio Kualitas FLAC'], duration_days: 30 },
          { id: 'mock-p2', name: 'Tahunan Premium', price: 299000, features: ['Semua Fitur Paket Bulanan', 'Hemat Lebih Banyak', 'Badge Premium Spesial'], duration_days: 365 }
        ])
      } finally {
        setLoadingPackages(false)
      }
    }

    loadPackages()
  }, [isOpen])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setPaymentStep('select_package')
        setSelectedPkg(null)
        setVoucherCode('')
        setVoucherError('')
      })
    }
  }, [isOpen])

  // Poll for premium status when waiting
  useEffect(() => {
    let pollInterval = null
    if (paymentStep === 'waiting' && user) {
      pollInterval = setInterval(async () => {
        const prevPremiumUntil = profile?.premium_until
        await checkUser()
        const updatedProfile = useAuthStore.getState().profile
        if (updatedProfile?.premium_until && updatedProfile.premium_until !== prevPremiumUntil) {
          const expDate = new Date(updatedProfile.premium_until)
          if (expDate > new Date()) {
            clearInterval(pollInterval)
            setPaymentStep('success')
          }
        }
      }, 3000)
    }
    return () => { if (pollInterval) clearInterval(pollInterval) }
  }, [paymentStep, user])

const loadDuitkuScript = (isSandbox) => {
  return new Promise((resolve) => {
    const scriptId = 'duitku-js-script';
    let script = document.getElementById(scriptId);
    
    if (script) {
      const src = script.getAttribute('src');
      const isCurrentSandbox = src.includes('sandbox');
      if (isCurrentSandbox !== isSandbox) {
        script.remove();
        script = null;
      }
    }
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = isSandbox 
        ? 'https://app-sandbox.duitku.com/lib/js/duitku.js'
        : 'https://app-prod.duitku.com/lib/js/duitku.js';
      script.async = true;
      script.onload = () => resolve(window.checkout);
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
    } else {
      resolve(window.checkout);
    }
  });
};

  if (!isOpen) return null

  // Handle package selection → create transaction → open Duitku Pop
  const handleSelectPackage = async (pkg) => {
    if (!user) {
      alert('Silakan masuk akun terlebih dahulu.')
      onClose()
      return
    }

    setSelectedPkg(pkg)
    setPaymentStep('processing')

    try {
      const response = await fetch(`${MUSIC_SERVICE_URL}/api/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          packageId: pkg.id,
          email: user.email
        })
      })

      const resData = await response.json()

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal menghubungi payment gateway.')
      }

      // Load correct Duitku POP script dynamically based on isSandbox flag from backend
      const checkout = await loadDuitkuScript(resData.isSandbox !== false)

      // Use Duitku Pop if available, else redirect to paymentUrl
      if (checkout && resData.reference && !resData.isSandboxFallback) {
        // Duitku Pop JS loaded → open the popup with the reference
        setPaymentStep('waiting')
        checkout.process(resData.reference, {
          successEvent: function () {
            checkUser()
            setPaymentStep('success')
          },
          pendingEvent: function () {
            setPaymentStep('waiting')
          },
          errorEvent: function () {
            alert('Pembayaran gagal atau dibatalkan. Silakan coba lagi.')
            setPaymentStep('select_package')
          },
          closeEvent: function () {
            // User closed the popup — stay on waiting step in case they paid
            setPaymentStep('waiting')
          }
        })
      } else if (resData.paymentUrl) {
        // Redirect to Duitku hosted payment page
        setPaymentStep('waiting')
        window.open(resData.paymentUrl, '_blank')
      } else {
        // Sandbox fallback — Duitku API couldn't create a transaction
        // This happens when sandbox credentials aren't set up yet
        alert('Tidak dapat terhubung ke server pembayaran sandbox. Pastikan Merchant Code & API Key sudah dikonfigurasi dengan benar di server.')
        setPaymentStep('select_package')
      }
    } catch (error) {
      console.error('Payment Error:', error)
      alert('Terjadi kesalahan saat memproses pembayaran: ' + error.message)
      setPaymentStep('select_package')
    }
  }

  const handleRedeemVoucher = async (e) => {
    e.preventDefault()
    if (!voucherCode.trim()) return
    if (!user) { alert('Silakan masuk akun terlebih dahulu.'); return }

    setRedeemingVoucher(true)
    setVoucherError('')

    try {
      const response = await fetch(`${MUSIC_SERVICE_URL}/api/payment/redeem-voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, voucherCode: voucherCode.trim() })
      })
      const resData = await response.json()
      if (!response.ok || !resData.success) throw new Error(resData.error || 'Gagal klaim voucher.')
      await checkUser()
      setSelectedPkg({ name: `Voucher: ${voucherCode.trim()}`, duration_days: resData.durationDays })
      setPaymentStep('success')
    } catch (err) {
      setVoucherError(err.message)
    } finally {
      setRedeemingVoucher(false)
    }
  }

  const formatToWIB = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    if (date.getFullYear() >= 9999) return 'Selamanya (Unlimited)'
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) + ' WIB'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-background-card border border-primary/40 rounded-3xl p-6 shadow-2xl backdrop-blur-xl z-10 text-left overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary-light animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">NexTune Premium</h3>
          </div>
          <button onClick={onClose} className="text-gray-text hover:text-white transition-colors p-1 rounded-lg hover:bg-background-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 no-scrollbar">

          {/* STEP 1: SELECT PACKAGE */}
          {paymentStep === 'select_package' && (
            <div className="space-y-5">
              <div className="text-center py-1">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary-light" />
                  Buka Akses Penuh Kualitas Studio
                </h4>
                <p className="text-[11px] text-gray-text mt-1">Dengarkan lagu penuh, kualitas Stereo/Hi-Fi & lirik synced tanpa batasan.</p>
                <p className="text-[10px] text-gray-muted mt-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
                  💳 Pilih paket lalu klik <strong className="text-white">Bayar Sekarang</strong> — Sistem akan membuka halaman pembayaran dengan berbagai metode (QRIS, E-Wallet, Transfer Bank, dll).
                </p>
              </div>

              {loadingPackages ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-[11px] text-gray-text">Memuat paket langganan...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="relative flex flex-col justify-between p-4 rounded-2xl border bg-background/40 border-gray-border hover:border-primary/40 transition-all"
                    >
                      {pkg.duration_days === 365 && (
                        <span className="absolute -top-2.5 right-4 bg-primary text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-md">
                          Terbaik
                        </span>
                      )}
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs font-bold text-white">{pkg.name}</h5>
                          <div className="flex items-baseline gap-1 mt-1.5">
                            <span className="text-lg font-black text-white">Rp {pkg.price.toLocaleString('id-ID')}</span>
                            <span className="text-[9px] text-gray-muted">/ {pkg.duration_days} hari</span>
                          </div>
                        </div>
                        <ul className="space-y-1.5">
                          {pkg.features?.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[10px] text-gray-text leading-tight">
                              <Check className="w-3 h-3 text-primary-light shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => handleSelectPackage(pkg)}
                        className="w-full mt-4 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold py-2 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                      >
                        💳 Bayar Sekarang
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* VOUCHER */}
              <div className="bg-background/40 border border-gray-border/60 p-4 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-primary-light" />
                  Punya Kode Voucher?
                </h5>
                <p className="text-[10px] text-gray-text leading-relaxed">Masukkan kode voucher dari admin untuk mengklaim akses premium gratis.</p>
                <form onSubmit={handleRedeemVoucher} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: PREMIUMFREE7D"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-background-sidebar border border-gray-border rounded-xl px-3 py-2 text-xs text-white placeholder-gray-muted focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={redeemingVoucher || !voucherCode.trim()}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                  >
                    {redeemingVoucher ? <Loader className="w-3.5 h-3.5 animate-spin" /> : 'Gunakan'}
                  </button>
                </form>
                {voucherError && <p className="text-[10px] text-red-500 font-semibold">{voucherError}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader className="w-12 h-12 text-primary animate-spin" />
                <Crown className="w-5 h-5 text-primary-light absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-white">Menghubungi Server Pembayaran...</h4>
                <p className="text-[10px] text-gray-text">Membuat sesi pembayaran, mohon tunggu sebentar.</p>
              </div>
            </div>
          )}

          {/* STEP 3: WAITING FOR PAYMENT */}
          {paymentStep === 'waiting' && selectedPkg && (
            <div className="flex flex-col items-center justify-center py-12 space-y-5 text-center">
              <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center">
                <Loader className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white">Menunggu Konfirmasi Pembayaran</h4>
                <p className="text-[11px] text-gray-text max-w-xs mx-auto leading-relaxed">
                  Halaman pembayaran telah dibuka. Selesaikan pembayaran di sana. Halaman ini akan otomatis diperbarui setelah pembayaran berhasil.
                </p>
                <p className="text-[10px] text-gray-muted mt-2 bg-background/50 border border-gray-border/30 rounded-xl px-4 py-2">
                  Paket: <strong className="text-white">{selectedPkg.name}</strong>
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  onClick={async () => {
                    await checkUser()
                    const updatedProfile = useAuthStore.getState().profile
                    if (checkIsPremium(updatedProfile)) {
                      setPaymentStep('success')
                    } else {
                      alert('Pembayaran belum terdeteksi. Silakan tunggu beberapa saat atau periksa email konfirmasi Anda.')
                    }
                  }}
                  className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                >
                  Cek Status Pembayaran
                </button>
                <button
                  onClick={() => setPaymentStep('select_package')}
                  className="text-[10px] text-gray-text hover:text-white transition-colors"
                >
                  ← Kembali ke Pilihan Paket
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {paymentStep === 'success' && selectedPkg && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary-light shadow-lg shadow-primary/5">
                <Check className="w-7 h-7 stroke-[3px] animate-bounce" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-white">Aktivasi Sukses! 🎉</h4>
                <p className="text-[11px] text-gray-text max-w-xs mx-auto leading-relaxed">
                  Selamat! Paket <strong className="text-white">{selectedPkg.name}</strong> aktif. Kualitas Stereo, Hi-Fi, dan semua fitur premium kini siap digunakan.
                </p>
                <div className="bg-background-sidebar/60 border border-gray-border/30 px-4 py-3 rounded-2xl inline-block mt-3 space-y-1">
                  <p className="text-[9px] text-gray-muted uppercase font-bold tracking-wider">Masa Berlaku Premium Hingga</p>
                  <p className="text-xs font-black text-white">
                    {profile?.premium_until ? formatToWIB(profile.premium_until) : 'Unlimited'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-primary hover:bg-primary-hover text-white text-[11px] font-bold px-8 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10"
              >
                Mulai Mendengarkan
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}
