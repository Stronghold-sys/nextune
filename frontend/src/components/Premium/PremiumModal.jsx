import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Check, CreditCard, X, QrCode, Loader, Sparkles, Ticket } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuthStore } from '../../store/useAuthStore'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

export default function PremiumModal({ isOpen, onClose }) {
  const { user, profile, checkUser } = useAuthStore()
  
  const [packages, setPackages] = useState([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  
  const [paymentStep, setPaymentStep] = useState('select_package') // 'select_package' | 'select_payment' | 'duitku_checkout' | 'processing' | 'success'
  const [selectedPayment, setSelectedPayment] = useState(null)

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('')
  const [redeemingVoucher, setRedeemingVoucher] = useState(false)
  const [voucherError, setVoucherError] = useState('')

  // Duitku Inquiry Response states
  const [duitkuTx, setDuitkuTx] = useState(null)
  const [simulatingCallback, setSimulatingCallback] = useState(false)

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
      const timer = setTimeout(() => {
        setPaymentStep('select_package')
        setSelectedPkg(null)
        setSelectedPayment(null)
        setVoucherCode('')
        setVoucherError('')
        setDuitkuTx(null)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Duitku success auto-detection polling
  useEffect(() => {
    let pollInterval = null;
    if (paymentStep === 'duitku_checkout' && user) {
      // Poll user profile every 3 seconds to auto-detect payment status
      pollInterval = setInterval(async () => {
        const prevPremiumUntil = profile?.premium_until;
        await checkUser(); // Refetch profile
        
        const updatedProfile = useAuthStore.getState().profile;
        if (updatedProfile?.premium_until && updatedProfile.premium_until !== prevPremiumUntil) {
          const expDate = new Date(updatedProfile.premium_until);
          if (expDate > new Date()) {
            clearInterval(pollInterval);
            setPaymentStep('success');
          }
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [paymentStep, user]);

  if (!isOpen) return null

  const handleNextToPayment = (pkg) => {
    setSelectedPkg(pkg)
    setPaymentStep('select_payment')
  }

  const handleConfirmPayment = async () => {
    if (!selectedPkg || !selectedPayment) return
    if (!user) {
      alert("Silakan masuk akun terlebih dahulu.")
      onClose()
      return
    }

    setPaymentStep('processing')

    try {
      // Call Duitku inquiry endpoint
      const response = await fetch(`${MUSIC_SERVICE_URL}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          packageId: selectedPkg.id,
          paymentMethod: selectedPayment.id === 'qris' ? 'Q1' : selectedPayment.id === 'transfer' ? 'M1' : 'SP', // Q1 = QRIS, M1 = Mandiri VA, SP = ShopeePay
          email: user.email
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal menghubungi payment gateway Duitku.');
      }

      setDuitkuTx(resData);
      setPaymentStep('duitku_checkout');

      // Trigger Duitku Pop-up Payment Gateway
      if (window.checkout) {
        window.checkout.process(resData.reference, {
          successEvent: function (result) {
            console.log('Duitku Success:', result);
            setPaymentStep('success');
            checkUser();
          },
          pendingEvent: function (result) {
            console.log('Duitku Pending:', result);
          },
          errorEvent: function (result) {
            console.error('Duitku Error:', result);
            alert('Pembayaran gagal atau dibatalkan.');
            setPaymentStep('select_payment');
          },
          closeEvent: function () {
            console.log('Duitku Popup Closed');
          }
        });
      } else {
        console.warn("Duitku JS not loaded, falling back to new window redirect");
        if (resData.paymentUrl) {
          window.open(resData.paymentUrl, '_blank');
        }
      }
    } catch (error) {
      console.error("Duitku Payment Error:", error);
      alert("Terjadi kesalahan saat memproses pembayaran: " + error.message);
      setPaymentStep('select_payment');
    }
  }

  const handleSimulateCallback = async () => {
    if (!duitkuTx || simulatingCallback) return;
    setSimulatingCallback(true);

    try {
      // Call callback endpoint with simulated successful signature
      const response = await fetch(`${MUSIC_SERVICE_URL}/api/payment/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantCode: 'DS31208',
          amount: duitkuTx.amount,
          merchantOrderId: duitkuTx.merchantOrderId,
          productDetails: selectedPkg.name,
          additionalParam: user.id,
          paymentCode: selectedPayment.id === 'qris' ? 'Q1' : selectedPayment.id === 'transfer' ? 'M1' : 'SP',
          resultCode: '00',
          reference: duitkuTx.reference,
          signature: 'mock_sandbox_bypass_signature'
        })
      });

      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.error || 'Simulasi callback gagal.');
      }

      await checkUser(); // reload profile
      setPaymentStep('success');
    } catch (err) {
      alert("Simulasi pembayaran gagal: " + err.message);
    } finally {
      setSimulatingCallback(false);
    }
  }

  const handleRedeemVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setRedeemingVoucher(true);
    setVoucherError('');

    try {
      const response = await fetch(`${MUSIC_SERVICE_URL}/api/payment/redeem-voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          voucherCode: voucherCode.trim()
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal klaim voucher.');
      }

      await checkUser(); // reload profile

      // Set packaging details dynamically for success screen
      setSelectedPkg({
        name: `Redeem Voucher: ${voucherCode.trim()}`,
        duration_days: resData.durationDays
      });
      
      setPaymentStep('success');
    } catch (err) {
      setVoucherError(err.message);
    } finally {
      setRedeemingVoucher(false);
    }
  }

  const paymentMethods = [
    { id: 'qris', name: 'QRIS / E-Wallet (Duitku)', icon: QrCode, desc: 'Instan via QRIS, GoPay, OVO, Dana' },
    { id: 'transfer', name: 'Virtual Account (Duitku)', icon: CreditCard, desc: 'BCA, Mandiri, BNI, BRI, Permata VA' }
  ]

  // Formatter for WIB datetime output
  const formatToWIB = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    // Far future date represents unlimited
    if (date.getFullYear() >= 9999) {
      return "Selamanya (Unlimited / Tanpa Batas)";
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

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-background-card border border-primary/40 rounded-3xl p-6 shadow-2xl backdrop-blur-xl z-10 text-left overflow-hidden flex flex-col max-h-[90vh]"
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
          
          {/* STEP 1: SELECT PACKAGE & VOUCHER INPUT */}
          {paymentStep === 'select_package' && (
            <div className="space-y-5">
              <div className="text-center py-1">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary-light" />
                  Buka Akses Penuh Kualitas Studio
                </h4>
                <p className="text-[11px] text-gray-text mt-1">Dengarkan lagu penuh, kualitas Stereo/Hi-Fi & lirik synced tanpa batasan.</p>
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

              {/* VOUCHER REDEEM INPUT */}
              <div className="bg-background/40 border border-gray-border/60 p-4 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Ticket className="w-4.5 h-4.5 text-primary-light" />
                  Punya Kode Voucher?
                </h5>
                <p className="text-[10px] text-gray-text leading-relaxed">Masukkan kode voucher Anda di bawah ini untuk mengklaim akses premium gratis dari admin.</p>
                
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

                {voucherError && (
                  <p className="text-[10px] text-red-500 font-semibold">{voucherError}</p>
                )}
              </div>
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
                Konfirmasi & Buat Tagihan Duitku
              </button>
            </div>
          )}

          {/* STEP 3: DUITKU CUSTOM MERCHANT CHECKOUT PANEL */}
          {paymentStep === 'duitku_checkout' && duitkuTx && selectedPkg && (
            <div className="space-y-4">
              <button 
                onClick={() => setPaymentStep('select_payment')}
                className="text-[10px] text-primary-light font-bold hover:underline mb-1 block"
              >
                ← Kembali ke Pemilihan Pembayaran
              </button>

              <div className="bg-background-card border border-primary/20 rounded-2xl p-4 space-y-4 text-center">
                <div className="pb-3 border-b border-gray-border/30">
                  <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded font-bold uppercase">Menunggu Pembayaran</span>
                  <h4 className="text-sm font-bold text-white mt-2">Duitku Invoice: {duitkuTx.merchantOrderId}</h4>
                  <p className="text-xs text-gray-text mt-0.5">Total Tagihan: <span className="font-extrabold text-white">Rp {duitkuTx.amount.toLocaleString('id-ID')}</span></p>
                </div>

                {/* QRIS Channel */}
                {selectedPayment.id === 'qris' ? (
                  <div className="flex flex-col items-center space-y-3">
                    <p className="text-[11px] text-gray-text font-medium">Scan QR Code di bawah menggunakan aplikasi e-wallet Anda (GoPay, OVO, DANA, LinkAja, dll.)</p>
                    
                    {/* Simulated QRIS Code Card */}
                    <div className="p-3 bg-white rounded-xl shadow-lg inline-block">
                      {/* Standard QR Code SVG representation */}
                      <svg className="w-40 h-40" viewBox="0 0 100 100" shapeRendering="crispEdges">
                        <path fill="#000" d="M0 0h30v30H0zm0 70h30v30H0zm70 0h30v30H70zm70-70h30v30H70zM10 10v10h10V10zm0 70v10h10V80zm70 0v10h10V80zm0-70v10h10V10zm25 15h10v10H95zm-30 20h10v10H65zm-20 0h10v10H45zm-15 0h10v10H30zm30 15h10v10H60zm-20 0h10v10H40zm-15 0h10v10H25zm50 15h10v10H75zm-15 0h10v10H60zm-20 0h10v10H40zm-15 0h10v10H25z"/>
                      </svg>
                      <div className="mt-2 text-center text-[9px] font-black text-black uppercase tracking-widest border-t border-gray-border/20 pt-1.5">QRIS LUNAS - NEXTUNE</div>
                    </div>
                    
                    <p className="text-[10px] text-gray-muted font-mono bg-background px-3 py-1.5 rounded-lg">Ref: {duitkuTx.reference}</p>
                  </div>
                ) : (
                  // Virtual Account Channel
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-text">Silakan lakukan transfer bank ke nomor Virtual Account Mandiri / Bersama berikut:</p>
                    <div className="p-4 bg-background border border-gray-border/60 rounded-xl space-y-2">
                      <p className="text-[10px] text-gray-muted uppercase font-bold tracking-wider">Nomor Virtual Account</p>
                      <p className="text-xl font-mono font-black text-primary-light tracking-wider select-all">{duitkuTx.vaNumber}</p>
                      <p className="text-[10px] text-gray-text font-bold mt-1">Nama Rekening: <span className="text-white">NEXTUNE STREAMING</span></p>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-border/30 flex flex-col gap-2 items-center">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-muted animate-pulse">
                    <Loader className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Mendeteksi status pembayaran secara otomatis...</span>
                  </div>

                  {/* Sandbox Webhook Simulation Button */}
                  <button
                    onClick={handleSimulateCallback}
                    disabled={simulatingCallback}
                    className="w-full bg-accent/20 border border-accent/40 hover:bg-accent/30 text-accent text-[10px] font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 mt-2"
                  >
                    {simulatingCallback ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Simulasikan Bayar Lunas (Webhook Duitku)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROCESSING PAYMENT */}
          {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader className="w-12 h-12 text-primary animate-spin" />
                <Crown className="w-5 h-5 text-primary-light absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-white">Menghubungi Duitku...</h4>
                <p className="text-[10px] text-gray-text">Mohon jangan menutup jendela ini atau memuat ulang halaman.</p>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {paymentStep === 'success' && selectedPkg && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary-light shadow-lg shadow-primary/5">
                <Check className="w-7 h-7 stroke-[3px] animate-bounce" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-white">Aktivasi Sukses! 🎉</h4>
                <p className="text-[11px] text-gray-text max-w-xs mx-auto leading-relaxed">
                  Selamat! Paket **{selectedPkg.name}** Anda telah aktif. Seluruh pembatasan akun dicabut. Kualitas audio Stereo, Hi-Fi, dan mode equalizer suara kini siap digunakan.
                </p>
                <div className="bg-background-sidebar/60 border border-gray-border/30 px-4 py-3 rounded-2xl inline-block mt-3 text-center space-y-1">
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
