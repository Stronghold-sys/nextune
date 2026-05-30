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
    success: 'border-emerald-500/25 shadow-emerald-950/20 bg-emerald-950/10 backdrop-blur-md',
    error: 'border-rose-500/25 shadow-rose-950/20 bg-rose-950/10 backdrop-blur-md',
    info: 'border-sky-500/25 shadow-sky-950/20 bg-sky-950/10 backdrop-blur-md',
    warning: 'border-amber-500/25 shadow-amber-950/20 bg-amber-950/10 backdrop-blur-md'
  }

  return (
    <>
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl transition-all ${borderGlowMap[toast.type] || borderGlowMap.info}`}
            >
              {iconMap[toast.type] || iconMap.info}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white leading-snug break-words">
                  {toast.message}
                </p>
              </div>
              <button 
                onClick={() => removeToast(toast.id)} 
                className="text-gray-muted hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
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
