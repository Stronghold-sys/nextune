import { create } from 'zustand'

export const useToastStore = create((set) => ({
  toasts: [],
  confirmDialog: {
    isOpen: false,
    message: '',
    onConfirm: null,
    onCancel: null
  },
  showToast: (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },
  showConfirm: (message, onConfirm, onCancel) => {
    set({
      confirmDialog: {
        isOpen: true,
        message,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          set((state) => ({ confirmDialog: { ...state.confirmDialog, isOpen: false } }));
        },
        onCancel: () => {
          if (onCancel) onCancel();
          set((state) => ({ confirmDialog: { ...state.confirmDialog, isOpen: false } }));
        }
      }
    });
  }
}));
