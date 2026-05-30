import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/useAuthStore'
import { X, Eye, EyeOff, Lock, Mail, User, AlertCircle, RefreshCw } from 'lucide-react'

export default function AuthModal({ isOpen, onClose, defaultMode = 'login', onAuthSuccess }) {
  const { login, signUp, verifyOtp, resendOtp, sendResetPasswordEmail, loginWithGoogle } = useAuthStore()
  
  const [mode, setMode] = useState(defaultMode) // 'login' | 'register' | 'otp' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  
  // OTP States
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpTimer, setOtpTimer] = useState(300) // 5 minutes
  const [canResendOtp, setCanResendOtp] = useState(false)
  const otpInputsRef = useRef([])

  // Errors & Loading
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
      setErrors({})
      setServerError('')
      setSuccessMessage('')
      setOtp(['', '', '', '', '', ''])
    }
  }, [isOpen, defaultMode])

  // OTP Timer countdown
  useEffect(() => {
    let interval = null
    if (mode === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1)
      }, 1000)
    } else if (otpTimer === 0) {
      setCanResendOtp(true)
    }
    return () => clearInterval(interval)
  }, [mode, otpTimer])

  if (!isOpen) return null

  // Validators
  const validateEmail = (emailStr) => {
    return /\S+@\S+\.\S+/.test(emailStr)
  }

  const validatePassword = (pass) => {
    // Min 8 characters, at least 1 uppercase letter and 1 number
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const newErrors = {}

    if (!validateEmail(email)) newErrors.email = "Format email tidak valid"
    if (password.length < 8) newErrors.password = "Password minimal 8 karakter"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      if (onAuthSuccess) onAuthSuccess()
      onClose()
    } else {
      // Map Supabase errors to specific Indonesian translations
      const errMsg = result.error.toLowerCase()
      if (errMsg.includes('invalid login credentials') || errMsg.includes('email not confirmed')) {
        setServerError("Email atau password salah")
      } else if (errMsg.includes('user not found')) {
        setServerError("Akun belum terdaftar, silakan daftar terlebih dahulu")
      } else if (errMsg.includes('network') || errMsg.includes('fetch')) {
        setServerError("Koneksi gagal, periksa jaringan Anda")
      } else {
        setServerError(result.error)
      }
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const newErrors = {}

    if (!fullName.trim()) newErrors.fullName = "Nama lengkap wajib diisi"
    if (!validateEmail(email)) newErrors.email = "Format email tidak valid"
    if (!validatePassword(password)) newErrors.password = "Password harus minimal 8 karakter, mengandung huruf besar dan angka"
    if (password !== confirmPassword) newErrors.confirmPassword = "Konfirmasi password tidak cocok"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    const result = await signUp(email, password, fullName)
    setLoading(false)

    if (result.success) {
      // Direct user to OTP page
      setMode('otp')
      setOtpTimer(300)
      setCanResendOtp(false)
      setSuccessMessage("Kode verifikasi OTP telah dikirim ke email Anda.")
    } else {
      setServerError(result.error)
    }
  }

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false

    const newOtp = [...otp]
    newOtp[index] = element.value
    setOtp(newOtp)

    // Focus next
    if (element.value !== '' && index < 5) {
      otpInputsRef.current[index + 1].focus()
    }
  }

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1].focus()
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const token = otp.join('')
    if (token.length < 6) {
      setServerError("Masukkan kode OTP 6 digit secara lengkap")
      return
    }

    setLoading(true)
    const result = await verifyOtp(email, token)
    setLoading(false)

    if (result.success) {
      if (onAuthSuccess) onAuthSuccess()
      onClose()
    } else {
      setServerError("Kode OTP salah atau kedaluwarsa. Silakan periksa kembali.")
    }
  }

  const handleResendOtp = async () => {
    setServerError('')
    const result = await resendOtp(email)
    if (result.success) {
      setOtpTimer(300)
      setCanResendOtp(false)
      setSuccessMessage("Kode OTP baru telah dikirim.")
    } else {
      setServerError(result.error)
    }
  }

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validateEmail(email)) {
      setErrors({ email: "Format email tidak valid" })
      return
    }

    setLoading(true)
    const result = await sendResetPasswordEmail(email)
    setLoading(false)

    if (result.success) {
      setSuccessMessage("Tautan reset password telah dikirim ke email Anda. Berlaku selama 60 menit.")
    } else {
      setServerError(result.error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-md"
      />

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative w-full max-w-md bg-background-card bg-opacity-75 border border-primary/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-text hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {mode === 'login' && 'Masuk ke NexTune'}
            {mode === 'register' && 'Buat Akun Baru'}
            {mode === 'otp' && 'Verifikasi Email'}
            {mode === 'forgot' && 'Lupa Password'}
          </h2>
          <p className="text-sm text-gray-text">
            {mode === 'login' && 'Temukan musik terpopuler dan terlaris secara global'}
            {mode === 'register' && 'Bergabung dan buat playlist musik pertamamu'}
            {mode === 'otp' && `Masukkan kode OTP yang telah dikirim ke ${email}`}
            {mode === 'forgot' && 'Masukkan email terdaftar untuk mengatur ulang password'}
          </p>
        </div>

        {/* Server Errors or Success */}
        {serverError && (
          <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg text-accent text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary-light text-xs mb-4 text-center">
            {successMessage}
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {errors.email && <p className="text-accent text-[11px] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-muted hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-accent text-[11px] mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-gray-text">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-border bg-background text-primary focus:ring-0"
                />
                <span>Ingat saya</span>
              </label>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-primary-light hover:underline"
              >
                Lupa Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Masuk
            </button>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {errors.fullName && <p className="text-accent text-[11px] mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {errors.email && <p className="text-accent text-[11px] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter (huruf besar + angka)"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-muted hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-accent text-[11px] mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Konfirmasi Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {errors.confirmPassword && <p className="text-accent text-[11px] mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Daftar Sekarang
            </button>
          </form>
        )}

        {/* 3. OTP VERIFICATION FORM */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  ref={(el) => (otpInputsRef.current[index] = el)}
                  value={data}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e.target, index)}
                  onFocus={(e) => e.target.select()}
                  className="w-12 h-12 text-center text-xl font-bold bg-background/50 border border-gray-border rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <div className="text-center text-xs text-gray-text space-y-1">
              <p>Masa berlaku kode OTP: <span className="font-semibold text-accent">{formatTime(otpTimer)}</span></p>
              {canResendOtp ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-primary-light hover:underline font-semibold"
                >
                  Kirim Ulang OTP
                </button>
              ) : (
                <p className="text-gray-muted">Kirim ulang dalam {otpTimer} detik</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Verifikasi & Masuk
            </button>
          </form>
        )}

        {/* 4. FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-text uppercase tracking-wider mb-1.5">Email Terdaftar</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-background/50 border border-gray-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {errors.email && <p className="text-accent text-[11px] mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Kirim Link Reset
            </button>
          </form>
        )}

        {/* Google OAuth & Link Toggle */}
        {mode !== 'otp' && (
          <div className="mt-6 space-y-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-border"></div>
              <span className="flex-shrink mx-4 text-gray-muted text-xs uppercase tracking-widest">atau</span>
              <div className="flex-grow border-t border-gray-border"></div>
            </div>

            <button
              onClick={loginWithGoogle}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              {/* Official Google Vector Logo Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="20px" height="20px">
                <path fill="#ea4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.327 2.682 1.386 6.618L5.266 9.765z" />
                <path fill="#4285f4" d="M23.727 12.273c0-.818-.073-1.609-.209-2.373H12v4.5h6.6c-.282 1.5-1.127 2.764-2.391 3.618v3h3.864c2.264-2.09 3.564-5.173 3.564-8.745z" />
                <path fill="#fbbc05" d="M5.266 14.235L1.386 17.382A11.948 11.948 0 0 1 0 12c0-1.927.455-3.755 1.255-5.382l3.927 3.036c-.209.736-.318 1.509-.318 2.346 0 .845.118 1.636.336 2.355z" />
                <path fill="#34a853" d="M12 24c3.24 0 5.973-1.073 7.964-2.909l-3.864-3c-1.073.718-2.436 1.145-4.1 1.145-3.127 0-5.782-2.118-6.727-4.964L1.386 17.382C3.327 21.318 7.33 24 12 24z" />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="text-center text-xs">
              {mode === 'login' && (
                <p className="text-gray-text">
                  Belum punya akun?{' '}
                  <button onClick={() => setMode('register')} className="text-primary-light hover:underline font-semibold">
                    Daftar di sini
                  </button>
                </p>
              )}
              {mode === 'register' && (
                <p className="text-gray-text">
                  Sudah memiliki akun?{' '}
                  <button onClick={() => setMode('login')} className="text-primary-light hover:underline font-semibold">
                    Masuk di sini
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <p className="text-gray-text">
                  Kembali ke{' '}
                  <button onClick={() => setMode('login')} className="text-primary-light hover:underline font-semibold">
                    Halaman Login
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
