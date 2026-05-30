import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish()
    }, 2800) // 2.8s total animation time
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div className="fixed inset-0 bg-background flex flex-col justify-between items-center py-16 px-6 z-50 overflow-hidden">
      {/* Spacer top */}
      <div></div>

      {/* Center Logo & Title */}
      <div className="flex flex-col items-center">
        {/* Animated Custom Logo Icon using SVG for vector precision */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.1, 1], opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 mb-6"
        >
          {/* Audio Wave Vector Icon */}
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </motion.div>

        {/* Title slide-up */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          className="text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-light to-accent text-shadow-premium mb-3"
        >
          NexTune
        </motion.h1>

        {/* Tagline typewriter simulation */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="text-gray-text text-sm sm:text-base font-light tracking-wide text-center max-w-xs sm:max-w-sm"
        >
          Musik tanpa batas, kapan saja
        </motion.p>
      </div>

      {/* Bottom Progress Bar */}
      <div className="w-40 sm:w-48 bg-gray-border h-1 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  )
}
