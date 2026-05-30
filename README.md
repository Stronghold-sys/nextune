# NexTune - Web Streaming Musik Premium (Supabase Edition)

Aplikasi Web Streaming Musik premium modern berkinerja tinggi yang dioptimalkan untuk perangkat seluler dan desktop dengan desain antarmuka modern (Dark Premium).

## Fitur Utama
- **Splash Screen**: Animasi pembuka (Framer Motion) selama 2.8 detik.
- **Autentikasi**: Terintegrasi Supabase Auth (Login, Registrasi dengan OTP, Lupa Password, dan Google OAuth).
- **Pemutar Musik Persisten**: Berjalan di latar belakang tanpa reset saat navigasi. Mendukung volume slider, playback speed, seek timeline, sync lyrics, sleep timer, dan queue management.
- **Pencarian Real-Time**: Hasil instan saat mengetik (debounce 300ms), autocomplete, riwayat, dan filter kategori.
- **Koleksi Saya**: Buat playlist baru, atur playlist, lihat lagu disukai (Favorit), dan riwayat dengar.
- **Dashboard Admin**: Pengelolaan data lagu, banner promo, broadcast notifikasi in-app, tabel statistik pertumbuhan stream via diagram SVG, dan backup data.

---

## Persiapan Proyek

### 1. Database Supabase
1. Buat proyek baru di [Dashboard Supabase](https://supabase.com/).
2. Masuk ke tab **SQL Editor**.
3. Salin seluruh isi file [`supabase/schema.sql`](file:///c:/Users/rakba/Documents/Aplikasi/supabase/schema.sql) dan jalankan (Run).
4. Catat `SUPABASE_URL` dan `SUPABASE_ANON_KEY` Anda di tab **Settings** -> **API**.

### 2. Konfigurasi Lingkungan (`.env`)
Buka file [`frontend/.env`](file:///c:/Users/rakba/Documents/Aplikasi/frontend/.env) dan perbarui nilainya dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key-anda]
VITE_MUSIC_SERVICE_URL=http://localhost:8001
```

---

## Cara Menjalankan Aplikasi

### Langkah A: Jalankan Python Music Service
1. Buka terminal baru di direktori `music-service`.
2. Jalankan perintah berikut untuk menjalankan server FastAPI di port `8001`:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```

### Langkah B: Jalankan React Frontend (Vite)
1. Buka terminal baru di direktori `frontend`.
2. Jalankan perintah berikut untuk memulai server pengembangan:
   ```bash
   npm run dev
   ```
3. Buka alamat yang tertera di terminal (biasanya `http://localhost:5173`) di browser Anda.

---

## Pengujian Responsivitas Mobile (AMOLED 6.67")
Guna menguji keselarasan antarmuka pada layar CrystalRes AMOLED 6.67" (1.5K):
1. Buka Chrome DevTools (`F12`).
2. Klik ikon perangkat (Toggle Device Toolbar / `Ctrl+Shift+M`).
3. Pilih **Responsive** dan masukkan dimensi **412 x 915** atau **390 x 844** (dimensi viewport standar untuk perangkat 6.67" dengan kepadatan pixel tinggi).
4. Pastikan teks, sidebar/bottom bar, dan pemutar musik fullscreen tidak meluap (overflow) dan tampil presisi.
