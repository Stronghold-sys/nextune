import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore } from '../../store/useToastStore'

export default function ToastContainer() {
  const { toasts, removeToast, confirmDialog } = useToastStore()

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
  }

  const borderGlowMap = {
    success: 'border-emerald-500/35 shadow-emerald-950/30 bg-[#0c1f14]/95 backdrop-blur-md text-emerald-200',
    error: 'border-rose-500/35 shadow-rose-950/30 bg-[#240e11]/95 backdrop-blur-md text-rose-200',
    info: 'border-sky-500/35 shadow-sky-950/30 bg-[#0f1d2a]/95 backdrop-blur-md text-sky-200',
    warning: 'border-amber-500/35 shadow-amber-950/30 bg-[#251b0f]/95 backdrop-blur-md text-amber-200'
  }

  return (
    <>
      {/* Toast Notification Container - Centered on mobile, top-right on desktop */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:top-5 sm:right-5 z-[9999] flex flex-col gap-3 w-[calc(100%-32px)] sm:w-80 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 py-3 px-4 rounded-2xl border shadow-2xl transition-all ${borderGlowMap[toast.type] || borderGlowMap.info}`}
            >
              {iconMap[toast.type] || iconMap.info}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-snug break-words">
                  {toast.message}
                </p>
              </div>
              <button 
                onClick={() => removeToast(toast.id)} 
                className="text-gray-muted hover:text-white transition-colors p-1 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog Overlay */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmDialog.onCancel}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-background-card border border-primary/25 rounded-3xl p-6 shadow-2xl z-10 text-left overflow-hidden"
            >
              {/* Glow decoration */}
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <h4 className="text-sm font-bold text-white mb-2">Konfirmasi Tindakan</h4>
              <p className="text-xs text-gray-text leading-relaxed mb-6">
                {confirmDialog.message}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={confirmDialog.onCancel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-text hover:text-white hover:bg-background-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/10 transition-colors"
                >
                  Konfirmasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
