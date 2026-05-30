# PROMPT ANTIGRAVITY — NexTune Web Streaming Musik
>
> Salin seluruh isi dokumen ini ke Antigravity sebagai satu prompt utuh.

---

## IDENTITAS PROYEK

Kamu adalah senior full-stack developer dan UI/UX designer berpengalaman. Bangunkan web streaming musik bernama **NexTune** secara lengkap, profesional, dan siap produksi.

- Nama Aplikasi: **NexTune**
- Jenis: Web Streaming Musik
- Bahasa Antarmuka: **Indonesia (semua teks UI dalam Bahasa Indonesia)**
- Role: **User** dan **Admin**

---

## TECH STACK

| Layer | Teknologi |
|---|---|
| Backend | Laravel 11 (PHP) — REST API, auth, queue, scheduler |
| Frontend | React 18 + Vite — SPA modern |
| Music Engine | Python 3.11 + FastAPI — wrapper ytmusicapi |
| Database | MySQL 8 + Redis |
| Auth | Laravel Sanctum + Laravel Socialite (Google OAuth) |
| State | Zustand |
| Styling | Tailwind CSS v3 |
| Animasi | Framer Motion |
| Real-time | Laravel Echo + Pusher |
| Email | Laravel Mail (SMTP/Mailtrap) |
| Queue | Laravel Queue (Redis driver) |

---

## SUMBER MUSIK

Gunakan library **ytmusicapi** dari:

- GitHub: <https://github.com/sigma67/ytmusicapi>
- Install: `pip install ytmusicapi`

Buat Python service (FastAPI) sebagai microservice yang dipanggil oleh Laravel backend via HTTP internal. Service ini bertugas:

- `GET /search?q={query}` — cari lagu/album/artis
- `GET /song/{videoId}` — detail lagu
- `GET /playlist/{playlistId}` — isi playlist
- `GET /artist/{artistId}` — profil artis
- `GET /home` — konten beranda (rekomendasi, trending)
- `GET /stream/{videoId}` — ambil URL stream audio dari YouTube Music

---

## ALUR UTAMA WEB

```
Buka Web
  └─► Splash Screen (logo NexTune + animasi fade+zoom, 2 detik)
        └─► Halaman Utama / Beranda (tanpa login)
              ├─► Browse, lihat lagu, artis, playlist → BEBAS (tanpa login)
              └─► Klik tombol Play / Tambah Favorit / Buat Playlist
                    └─► Muncul Modal: "Masuk untuk melanjutkan"
                          ├─► Login → langsung lanjut aksi sebelumnya
                          └─► Daftar → selesai → langsung masuk
```

---

## DESAIN VISUAL

- **Tema**: Dark modern premium
- **Warna Utama**: Hitam `#0A0A0F`, Ungu/Indigo `#6C63FF`, Abu gelap `#1A1A2E`
- **Aksen**: Gradient ungu-pink `#6C63FF → #FF6584`
- **Font**: Inter atau Sora (Google Fonts)
- **Full Animasi**: page transition, hover, micro-interaction, parallax ringan
- **Skeleton Loading**: WAJIB ada di semua komponen yang fetch data (lagu, album, artis, playlist)
- **Responsif**: Mobile-first, breakpoint sm/md/lg/xl Tailwind

---

## SPLASH SCREEN

```
- Layar penuh dengan background gelap (#0A0A0F)
- Logo NexTune muncul di tengah: animasi zoom-in + fade-in (Framer Motion)
- Nama "NexTune" muncul dengan efek typewriter atau slide-up
- Tagline: "Musik tanpa batas, kapan saja"
- Progress bar tipis di bagian bawah
- Durasi: ~2 detik, lalu auto-redirect ke Beranda dengan page transition slide
```

---

## FITUR AUTENTIKASI (LENGKAP)

### 1. LOGIN

- Login menggunakan email dan password
- Login menggunakan akun Google (OAuth via Laravel Socialite)
- Validasi input real-time (email format, password minimal 8 karakter)
- Tampilkan pesan error spesifik:
  - "Email atau password salah"
  - "Akun belum terdaftar, silakan daftar terlebih dahulu"
  - "Koneksi gagal, periksa jaringan Anda"
- Tombol "Lihat Password" (toggle show/hide)
- Ingat saya (Remember Me) dengan persistent token

### 2. DAFTAR AKUN (REGISTRASI)

- Daftar menggunakan email dan password
- Daftar menggunakan akun Google
- Field: Nama Lengkap, Email, Password, Konfirmasi Password
- Validasi:
  - Format email valid
  - Password minimal 8 karakter, harus ada huruf besar + angka
  - Konfirmasi password harus cocok
  - Email belum terdaftar
- Setelah daftar berhasil → kirim OTP ke email → verifikasi → masuk otomatis

### 3. LUPA PASSWORD

- Input email terdaftar
- Sistem kirim email berisi link reset password (token 60 menit)
- Halaman reset: input password baru + konfirmasi
- Validasi token kedaluwarsa
- Notifikasi sukses setelah reset berhasil

### 4. VERIFIKASI OTP

- OTP 6 digit dikirim ke email
- Digunakan saat: registrasi akun baru, login dari perangkat baru (opsional), reset password
- Tampilan input OTP: 6 kotak terpisah (auto-focus next)
- Timer hitung mundur 5 menit
- Tombol "Kirim Ulang OTP" (aktif setelah timer habis)
- Validasi OTP salah dengan pesan jelas
- OTP disimpan di Redis dengan TTL 5 menit

### 5. UI/UX AUTENTIKASI

- Modal overlay dari Beranda (bukan redirect halaman)
- Animasi modal: scale-in + fade (Framer Motion)
- Semua form dalam Bahasa Indonesia
- Desain: card gelap semi-transparan, backdrop blur, gradient border ungu
- Tombol Google dengan logo resmi dan teks "Lanjutkan dengan Google"
- Link navigasi antar form (Login ↔ Daftar ↔ Lupa Password) tanpa refresh

---

## FITUR USER

### Beranda

- Rekomendasi lagu & album personal (dari riwayat dengar)
- Lagu trending / populer hari ini (dari ytmusicapi home)
- Artis populer (grid dengan foto + nama)
- Genre populer (chip/badge interaktif)
- Banner promosi / konten featured
- Lagu terbaru
- Semua dengan skeleton loading saat fetch

### Pencarian

- Search bar prominent di bagian atas
- Hasil real-time saat mengetik (debounce 300ms)
- Filter: Lagu, Album, Artis, Playlist
- Riwayat pencarian (simpan di localStorage)
- Saran pencarian otomatis (autocomplete)
- Halaman hasil pencarian dengan grid card + animasi masuk

### Pemutar Musik

- Player bar persisten di bagian bawah (tidak hilang saat navigasi)
- Tampilan: cover art, nama lagu, artis, tombol kontrol
- Kontrol: Play/Pause, Sebelumnya, Berikutnya, Shuffle, Repeat, Repeat One
- Progress bar seekable (drag/klik)
- Volume control dengan slider
- Lirik lagu (synced jika tersedia, plain text jika tidak)
- Mini player di mobile, expanded player fullscreen saat klik cover
- Tambah ke favorit langsung dari player
- Tambah ke playlist langsung dari player
- Queue list (antrian lagu)
- Sleep timer
- Kecepatan putar: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x

### Playlist

- Buat playlist baru (nama + cover opsional)
- Edit nama dan cover playlist
- Hapus playlist (konfirmasi modal)
- Tambah/hapus lagu dari playlist
- Atur urutan lagu (drag & drop)
- Playlist Publik / Pribadi toggle
- Bagikan playlist (salin link)
- Simpan playlist orang lain

### Favorit & Library

- Koleksi lagu yang disukai
- Album tersimpan
- Artis yang diikuti
- Riwayat pemutaran (kronologis)
- Download offline (tandai untuk cache)

### Profil Pengguna

- Lihat profil (foto, nama, email, jumlah playlist)
- Edit nama dan foto profil
- Ubah password
- Statistik: total lagu didengar, artis favorit, genre favorit
- Logout

### Notifikasi

- Notifikasi in-app: lagu baru dari artis favorit, update playlist
- Tanda titik merah pada ikon notifikasi jika ada yang belum dibaca
- Panel notifikasi dropdown

### Pengaturan

- Mode gelap / terang (toggle, default gelap)
- Kualitas streaming: Rendah / Standar / Tinggi
- Hapus cache
- Pengaturan privasi
- Tentang NexTune

---

## FITUR ADMIN

### Akses Dashboard Admin

- URL terpisah: `/admin`
- Login khusus admin (email + password, tidak ada Google OAuth)
- Sidebar navigasi lengkap

### Dashboard Statistik

- Total user, user aktif hari ini
- Total lagu di database
- Total streaming hari ini / minggu / bulan (grafik line chart)
- Lagu paling banyak diputar (top 10)
- Pendapatan premium (jika ada fitur premium)
- Grafik pertumbuhan user (chart.js atau recharts)
- Peta wilayah pengguna (opsional)

### Manajemen User

- Tabel user dengan pagination + search + filter
- Kolom: Foto, Nama, Email, Status, Tanggal Daftar, Aksi
- Tambah user manual
- Edit data user
- Blokir / aktifkan kembali user
- Reset password user
- Hapus user (soft delete)
- Lihat detail aktivitas user

### Manajemen Lagu

- Lihat semua lagu (dari database + ytmusicapi)
- Tambah lagu manual (metadata: judul, artis, album, genre, cover, file audio)
- Edit metadata lagu
- Hapus lagu
- Atur status: publik / privat
- Upload file audio (MP3/FLAC)
- Upload cover

### Manajemen Album

- CRUD album lengkap
- Upload cover album
- Tambah/atur urutan lagu dalam album

### Manajemen Artis

- CRUD artis
- Upload foto artis
- Biografi artis
- Genre artis

### Manajemen Playlist

- Lihat semua playlist (publik)
- Hapus playlist melanggar
- Featured playlist (tampil di beranda)

### Manajemen Genre & Kategori

- CRUD genre
- CRUD mood/kategori
- Atur urutan tampil di beranda

### Manajemen Lirik

- Tambah/edit lirik per lagu
- Lirik plain text atau synced (LRC format)

### Promosi & Banner

- Tambah/edit/hapus banner beranda
- Jadwal tayang banner (tanggal mulai - selesai)
- Upload gambar banner

### Notifikasi ke User

- Kirim push notification / in-app notification ke semua user atau segmen tertentu
- Jadwal pengiriman notifikasi

### Moderasi Konten

- Laporan dari user (komentar/lagu bermasalah)
- Tandai konten tidak layak
- Riwayat moderasi

### Manajemen Langganan Premium

- Lihat paket premium yang tersedia
- Tambah/edit/hapus paket
- Lihat riwayat transaksi
- Status pembayaran per user
- Laporan keuangan (export Excel/PDF)

### Laporan & Analitik

- Laporan user aktif harian/mingguan/bulanan
- Laporan lagu terpopuler
- Laporan genre terpopuler
- Export semua laporan ke Excel dan PDF

### Pengaturan Aplikasi

- Ubah nama dan logo NexTune
- Ubah tema warna (color picker)
- Kelola Kebijakan Privasi & Syarat Ketentuan
- Kelola versi aplikasi

### Manajemen Role Admin

- Role: Super Admin, Admin Konten, Admin Moderasi, Admin Keuangan
- Atur izin akses per role
- Log aktivitas semua admin

### Keamanan Admin

- Two-Factor Authentication (2FA) wajib untuk admin
- Log login admin (IP, waktu, perangkat)
- Session timeout otomatis
- Backup database manual dari dashboard

---

## STRUKTUR FOLDER

```
nextune/
├── backend/                    # Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/           # Login, Register, OTP, Password
│   │   │   ├── Api/            # Song, Album, Artist, Playlist
│   │   │   └── Admin/          # Semua controller admin
│   │   ├── Models/             # User, Song, Album, Artist, Playlist, OTP, etc.
│   │   ├── Services/           # MusicService (panggil Python), OTPService
│   │   └── Events/             # Broadcasting events
│   ├── routes/
│   │   ├── api.php             # Route API user
│   │   └── admin.php           # Route API admin
│   └── ...
│
├── frontend/                   # React 18 + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SplashScreen.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Library.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── admin/          # Semua halaman admin
│   │   ├── components/
│   │   │   ├── Player/         # MusicPlayer, MiniPlayer, Queue
│   │   │   ├── Auth/           # Modal Login, Register, OTP, ForgotPassword
│   │   │   ├── Skeleton/       # Semua komponen skeleton loading
│   │   │   └── UI/             # Button, Card, Input, Badge, Modal
│   │   ├── store/              # Zustand: auth, player, ui
│   │   ├── hooks/              # usePlayer, useAuth, useSearch
│   │   └── animations/        # Framer Motion variants
│   └── ...
│
└── music-service/              # Python FastAPI
    ├── main.py
    ├── routers/
    │   ├── search.py
    │   ├── song.py
    │   ├── artist.py
    │   └── playlist.py
    ├── services/
    │   └── ytmusic_service.py  # Wrapper ytmusicapi
    └── requirements.txt
```

---

## ANIMASI & UX REQUIREMENTS

```
WAJIB DIIMPLEMENTASIKAN:
1. Splash Screen: logo zoom-in + fade, progress bar bottom
2. Page Transition: slide atau fade antar halaman (React Router + Framer Motion)
3. Skeleton Loading: SEMUA komponen yang fetch API wajib ada skeleton
4. Hover Effects: card musik (scale 1.03 + shadow), tombol (brightness + scale)
5. Modal: scale-in + backdrop blur saat muncul
6. Player Bar: slide-up saat pertama kali muncul
7. Notifikasi Toast: slide-in dari kanan atas
8. Like Button: heart animation (pulse + warna merah)
9. OTP Input: auto-focus next box saat isi digit
10. Search: smooth expand/collapse + result fade-in
```

---

## KEAMANAN

- Password di-hash dengan bcrypt
- Token JWT via Laravel Sanctum
- Rate limiting pada endpoint login (5x/menit)
- OTP disimpan di Redis dengan TTL 5 menit (hashed)
- HTTPS wajib di production
- CORS dikonfigurasi ketat
- SQL injection dicegah via Eloquent ORM
- XSS dicegah via React (JSX escaping)
- Admin wajib 2FA
- Semua input divalidasi di backend (Laravel FormRequest)

---

## CATATAN PENTING

1. **Seluruh teks antarmuka dalam Bahasa Indonesia**
2. **Skeleton loading WAJIB ada** di setiap komponen yang memuat data dari API
3. **Animasi WAJIB** menggunakan Framer Motion — jangan CSS biasa untuk transisi halaman
4. **Player musik persisten** — tidak reset saat navigasi antar halaman
5. **Mobile responsif** — tampilan harus sempurna di layar 375px hingga 1440px
6. **Error handling** — semua request API harus ada fallback UI (empty state, error state)
7. **Loading state** — semua aksi async harus ada indikator loading
8. Python service berjalan di port terpisah (misal :8001) dan dipanggil oleh Laravel via HTTP client (Guzzle)
9. Gunakan environment variable untuk semua konfigurasi sensitif
10. Buat README.md lengkap dengan instruksi setup dan menjalankan ketiga service

---

**Mulai bangun dari struktur proyek lengkap, kemudian implementasikan fitur per fitur sesuai urutan prioritas: Splash Screen → Beranda → Auth System → Music Player → Library → Admin Dashboard.**
