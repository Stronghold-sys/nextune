-- Skema Database NexTune untuk Supabase / PostgreSQL

-- Hapus trigger & tabel lama jika ada agar proses instalasi bersih tanpa error "relation already exists"
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP TABLE IF EXISTS public.admin_logs CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.premium_packages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.lyrics CASCADE;
DROP TABLE IF EXISTS public.play_history CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.playlist_songs CASCADE;
DROP TABLE IF EXISTS public.playlists CASCADE;
DROP TABLE IF EXISTS public.songs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Tabel Profil Pengguna (Sinkron dengan auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    premium_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Mengaktifkan Row Level Security (RLS) untuk profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil dapat dibaca oleh siapa saja" ON public.profiles
     FOR SELECT USING (true);

CREATE POLICY "Pengguna dapat mengubah profil sendiri" ON public.profiles
     FOR UPDATE USING (auth.uid() = id);

-- Trigger untuk membuat profil secara otomatis HANYA SETELAH user memverifikasi OTP (email_confirmed_at tidak null)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Hanya buat profil jika email sudah dikonfirmasi dan profil belum ada
    IF NEW.email_confirmed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.profiles (id, username, full_name, avatar_url, role, email)
        VALUES (
            NEW.id,
            split_part(NEW.email, '@', 1),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            NEW.raw_user_meta_data->>'avatar_url',
            CASE 
                WHEN NEW.email = 'admin@gmail.com' THEN 'admin'
                ELSE 'user'
            END,
            NEW.email
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Tabel Lagu
CREATE TABLE public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    genre TEXT,
    cover_url TEXT,
    audio_url TEXT,
    is_youtube BOOLEAN DEFAULT FALSE,
    video_id TEXT UNIQUE, -- ID video dari youtube/ytmusic
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'public' CHECK (status IN ('public', 'private')),
    created_by UUID REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lagu publik dapat dibaca semua orang" ON public.songs
    FOR SELECT USING (status = 'public' OR auth.uid() = created_by);

CREATE POLICY "Hanya admin dan pembuat lagu yang bisa memodifikasi" ON public.songs
    FOR ALL USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin')
        )
    );


-- 3. Tabel Playlist
CREATE TABLE public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlist publik dapat dibaca semua orang" ON public.playlists
    FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Pengguna dapat mengelola playlist sendiri" ON public.playlists
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Admin dapat mengelola semua playlist" ON public.playlists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderation_admin')
        )
    );


-- 4. Tabel Penghubung Lagu & Playlist (playlist_songs)
CREATE TABLE public.playlist_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES public.playlists ON DELETE CASCADE NOT NULL,
    song_id UUID REFERENCES public.songs ON DELETE CASCADE NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua orang dapat membaca lagu dari playlist publik" ON public.playlist_songs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE id = playlist_id AND (is_public = true OR auth.uid() = created_by)
        )
    );

CREATE POLICY "Pembuat playlist dapat memodifikasi isi playlist" ON public.playlist_songs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE id = playlist_id AND auth.uid() = created_by
        )
    );


-- 5. Tabel Lagu Favorit
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    song_id UUID REFERENCES public.songs ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, song_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat membaca favoritnya sendiri" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Pengguna dapat mengelola favoritnya sendiri" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);


-- 6. Tabel Riwayat Putar (Play History)
CREATE TABLE public.play_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    song_id UUID REFERENCES public.songs ON DELETE CASCADE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat melihat riwayat putarnya sendiri" ON public.play_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Pengguna dapat menambah riwayat putar sendiri" ON public.play_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 7. Tabel Lirik Lagu
CREATE TABLE public.lyrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID REFERENCES public.songs ON DELETE CASCADE UNIQUE NOT NULL,
    content TEXT NOT NULL,
    is_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua orang dapat membaca lirik" ON public.lyrics
    FOR SELECT USING (true);

CREATE POLICY "Hanya admin/content creator yang dapat mengelola lirik" ON public.lyrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin')
        )
    );


-- 8. Tabel Banners
CREATE TABLE public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua orang dapat melihat banner aktif" ON public.banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin dapat mengelola banner" ON public.banners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin')
        )
    );


-- 9. Tabel Notifikasi
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE, -- NULL berarti broadcast untuk semua user
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna dapat melihat notifikasinya sendiri dan broadcast" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admin dapat membuat/mengelola notifikasi" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );


-- 10. Paket Premium
CREATE TABLE public.premium_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features TEXT[] NOT NULL,
    duration_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.premium_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua orang dapat melihat paket premium" ON public.premium_packages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin dapat mengelola paket premium" ON public.premium_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );


-- 11. Transaksi Premium
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    package_id UUID REFERENCES public.premium_packages ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna dapat melihat transaksi sendiri" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Pengguna dapat membuat transaksi baru" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin dapat melihat dan mengelola semua transaksi" ON public.transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'finance_admin')
        )
    );


-- 12. Log Aktivitas Admin
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya admin yang dapat membaca log" ON public.admin_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Sistem/Admin dapat menulis log" ON public.admin_logs
    FOR INSERT WITH CHECK (true);


-- =========================================================================
-- SEED DATA: AKUN ADMIN DEFAULT (admin@gmail.com / admin123)
-- =========================================================================

-- 1. Menambahkan user ke auth.users
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, 
    email_change_token_new, recovery_token
)
SELECT
    '00000000-0000-0000-0000-000000000000',
    'd0d8b4c0-7f28-4034-b258-c9f285d852a4', -- ID Tetap untuk Admin
    'authenticated',
    'authenticated',
    'admin@gmail.com',
    crypt('admin123', gen_salt('bf')), -- Hash bcrypt otomatis untuk password 'admin123'
    NOW(), -- Sudah terkonfirmasi (tidak butuh verifikasi OTP)
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Admin NexTune"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@gmail.com'
);

-- 2. Menambahkan profil admin ke public.profiles
INSERT INTO public.profiles (id, username, full_name, role)
SELECT
    'd0d8b4c0-7f28-4034-b258-c9f285d852a4',
    'admin',
    'Admin NexTune',
    'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = 'd0d8b4c0-7f28-4034-b258-c9f285d852a4'
);


-- =========================================================================
-- UPDATE: VOUCHER SYSTEM & SECURE PREMIUM ACTIVATION
-- =========================================================================

-- 1. Create vouchers table
CREATE TABLE IF NOT EXISTS public.vouchers (
    code TEXT PRIMARY KEY,
    duration_days INTEGER NOT NULL, -- e.g. 7 for 1 week, 30 for 1 month, 365 for 1 year, -1 for unlimited
    is_active BOOLEAN DEFAULT TRUE,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS on vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Select/All policies for admin
CREATE POLICY "Admin can do everything on vouchers" ON public.vouchers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Users can read vouchers to verify/redeem
CREATE POLICY "Users can view active vouchers" ON public.vouchers
    FOR SELECT USING (is_active = true);


-- 2. PostgreSQL RPC Function to activate premium securely (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.activate_premium_user(
    p_user_id UUID,
    p_days INTEGER,
    p_package_name TEXT,
    p_amount DECIMAL,
    p_payment_method TEXT,
    p_merchant_order_id TEXT
)
RETURNS VOID AS $$
DECLARE
    v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expiry time in UTC (stored in DB) but represents WIB (+7 hours) offset
    -- If p_days is -1, it means unlimited
    IF p_days = -1 THEN
        v_expiry := '9999-12-31 23:59:59+00'::timestamp with time zone;
    ELSE
        -- Adding interval in days
        v_expiry := NOW() + (p_days || ' days')::interval;
    END IF;

    -- Update user profile
    UPDATE public.profiles
    SET premium_until = v_expiry
    WHERE id = p_user_id;

    -- Update existing pending transaction if exists, otherwise insert
    IF EXISTS (SELECT 1 FROM public.transactions WHERE user_id = p_user_id AND status = 'pending') THEN
        UPDATE public.transactions
        SET status = 'completed', payment_method = p_payment_method, created_at = NOW()
        WHERE id = (SELECT id FROM public.transactions WHERE user_id = p_user_id AND status = 'pending' ORDER BY created_at DESC LIMIT 1);
    ELSE
        INSERT INTO public.transactions (user_id, amount, status, payment_method, created_at)
        VALUES (p_user_id, p_amount, 'completed', p_payment_method, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. PostgreSQL RPC Function to allow admin to update user subscription manually (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
    p_user_id UUID,
    p_premium_until TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
    -- Verify if caller is admin/super_admin
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        UPDATE public.profiles
        SET premium_until = p_premium_until
        WHERE id = p_user_id;
    ELSE
        RAISE EXCEPTION 'Akses ditolak. Anda bukan administrator.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


