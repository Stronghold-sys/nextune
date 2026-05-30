import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Check, CreditCard, X, QrCode, Wallet, Loader, Sparkles } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuthStore } from '../../store/useAuthStore'

export default function PremiumModal({ isOpen, onClose }) {
  const { user, profile, checkUser } = useAuthStore()
  
  const [packages, setPackages] = useState([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  
  const [paymentStep, setPaymentStep] = useState('select_package') // 'select_package' | 'select_payment' | 'processing' | 'success'
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Seed default packages if database is empty
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
          // Seed default packages
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
        console.error("Gagal memuat paket premium:", err)
        // Fallback local state if Supabase connection fails/offline
        setPackages([
          { 
            id: 'mock-p1',
            name: 'Bulanan Premium', 
            price: 49000, 
            features: ['Pemutaran Lagu Full (Tanpa Batas)', 'Sleep Timer Aktif', 'Kecepatan Putar Kustom', 'Audio Kualitas FLAC'], 
            duration_days: 30 
          },
          { 
            id: 'mock-p2',
            name: 'Tahunan Premium', 
            price: 299000, 
            features: ['Semua Fitur Paket Bulanan', 'Hemat Lebih Banyak', 'Badge Premium Spesial'], 
            duration_days: 365 
          }
        ])
      } finally {
        setLoadingPackages(false)
      }
    }

    loadPackages()
  }, [isOpen])

  // Reset steps on close or open
  useEffect(() => {
    if (isOpen) {
      setPaymentStep('select_package')
      setSelectedPkg(null)
      setSelectedPayment(null)
      setProcessingPayment(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleNextToPayment = (pkg) => {
    setSelectedPkg(pkg)
    setPaymentStep('select_payment')
  }

  const handleConfirmPayment = async () => {
    if (!selectedPkg || !selectedPayment) return
    
    setPaymentStep('processing')
    setProcessingPayment(true)

    // Simulate verification (1.5 seconds delay)
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
      if (!user) {
        alert("Silakan masuk akun terlebih dahulu.")
        onClose()
        return
      }

      // 1. Calculate duration days
      const days = selectedPkg.duration_days || 30
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + days)

      // 2. Insert transaction
      const newTransaction = {
        user_id: user.id,
        package_id: selectedPkg.id && !selectedPkg.id.startsWith('mock') ? selectedPkg.id : null,
        amount: selectedPkg.price,
        status: 'completed',
        payment_method: selectedPayment.name,
      }

      await supabase.from('transactions').insert(newTransaction)

      // 3. Update profiles table with premium_until date
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ premium_until: expDate.toISOString() })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 4. Reload profile
      await checkUser()
      
      setPaymentStep('success')
    } catch (error) {
      console.error("Error completing premium purchase:", error)
      alert("Terjadi kesalahan saat memproses pembelian: " + error.message)
      setPaymentStep('select_package')
    } finally {
      setProcessingPayment(false)
    }
  }

  const paymentMethods = [
    { id: 'qris', name: 'QRIS / E-Wallet', icon: QrCode, desc: 'GoPay, OVO, Dana, LinkAja' },
    { id: 'transfer', name: 'Transfer Bank', icon: CreditCard, desc: 'BCA, Mandiri, BNI, BRI Virtual Account' },
    { id: 'gopay', name: 'GoPay Instan', icon: Wallet, desc: 'Bayar langsung dengan GoPay' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-background-card border border-primary/40 rounded-3xl p-6 shadow-2xl backdrop-blur-xl z-10 text-left overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none"></div>

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

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 no-scrollbar">
          
          {/* STEP 1: SELECT PACKAGE */}
          {paymentStep === 'select_package' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary-light" />
                  Buka Akses Penuh Kualitas Studio
                </h4>
                <p className="text-[11px] text-gray-text mt-1">Dengarkan lagu tanpa batasan 30 detik & nikmati fitur-fitur premium lainnya.</p>
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
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                        selectedPkg?.id === pkg.id 
                          ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' 
                          : 'bg-background/40 border-gray-border hover:border-gray-border/80'
                      }`}
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
                        onClick={() => handleNextToPayment(pkg)}
                        className="w-full mt-4 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold py-2 rounded-xl transition-all shadow-md shadow-primary/10"
                      >
                        Pilih Paket
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT PAYMENT METHOD */}
          {paymentStep === 'select_payment' && selectedPkg && (
            <div className="space-y-4">
              <div>
                <button 
                  onClick={() => setPaymentStep('select_package')}
                  className="text-[10px] text-primary-light font-bold hover:underline mb-2 block"
                >
                  ← Kembali ke Pemilihan Paket
                </button>
                <div className="bg-background/50 border border-gray-border/60 p-3.5 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-muted uppercase tracking-wider">Paket Pilihan</h4>
                    <p className="text-xs font-bold text-white mt-0.5">{selectedPkg.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-gray-muted uppercase tracking-wider">Total Bayar</p>
                    <p className="text-sm font-black text-white mt-0.5">Rp {selectedPkg.price.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white pl-1">Metode Pembayaran</h4>
                <div className="space-y-2">
                  {paymentMethods.map((pm) => {
                    const PMIcon = pm.icon
                    const isSelected = selectedPayment?.id === pm.id
                    return (
                      <button
                        key={pm.id}
                        onClick={() => setSelectedPayment(pm)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isSelected 
                            ? 'bg-primary/5 border-primary' 
                            : 'bg-background/40 border-gray-border hover:border-gray-border/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20 text-primary-light' : 'bg-background-sidebar text-gray-text'}`}>
                            <PMIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{pm.name}</p>
                            <p className="text-[9px] text-gray-text mt-0.5">{pm.desc}</p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-border'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleConfirmPayment}
                disabled={!selectedPayment}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-primary/10 mt-3"
              >
                Konfirmasi & Bayar
              </button>
            </div>
          )}

          {/* STEP 3: PROCESSING PAYMENT */}
          {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader className="w-12 h-12 text-primary animate-spin" />
                <Crown className="w-5 h-5 text-primary-light absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-white">Memproses Pembayaran...</h4>
                <p className="text-[10px] text-gray-text">Mohon jangan menutup jendela ini atau memuat ulang halaman.</p>
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
                <h4 className="text-sm font-black text-white">Pembayaran Sukses! 🎉</h4>
                <p className="text-[11px] text-gray-text max-w-xs mx-auto leading-relaxed">
                  Selamat! Anda kini berlangganan **{selectedPkg.name}**. Seluruh fitur premium dan akses pemutaran musik tanpa batasan 30 detik kini telah aktif.
                </p>
                <div className="bg-background-sidebar/60 border border-gray-border/30 px-4 py-2 rounded-xl inline-block mt-3">
                  <p className="text-[10px] text-gray-text">Masa Berlaku Premium Hingga:</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {(() => {
                      const days = selectedPkg.duration_days || 30
                      const d = new Date()
                      d.setDate(d.getDate() + days)
                      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    })()}
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
