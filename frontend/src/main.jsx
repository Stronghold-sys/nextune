import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { useToastStore } from './store/useToastStore'

// Global window.alert override to display modern Toast notifications
if (typeof window !== 'undefined') {
  window.alert = (message) => {
    if (!message) return;
    const msgStr = message.toString();
    const msgLower = msgStr.toLowerCase();
    
    let type = 'info';
    if (
      msgLower.includes('sukses') || 
      msgLower.includes('berhasil') || 
      msgLower.includes('aktif') || 
      msgLower.includes('disimpan') || 
      msgLower.includes('disalin') ||
      msgLower.includes('dijalankan') ||
      msgLower.includes('dikirim')
    ) {
      type = 'success';
    } else if (
      msgLower.includes('gagal') || 
      msgLower.includes('kesalahan') || 
      msgLower.includes('error') || 
      msgLower.includes('salah') || 
      msgLower.includes('tidak valid') || 
      msgLower.includes('ditolak') ||
      msgLower.includes('diblokir')
    ) {
      type = 'error';
    } else if (
      msgLower.includes('perhatian') || 
      msgLower.includes('peringatan') || 
      msgLower.includes('belum') ||
      msgLower.includes('kosong')
    ) {
      type = 'warning';
    }

    useToastStore.getState().showToast(msgStr, type);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
