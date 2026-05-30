-- Skema Database NexTune untuk Supabase / PostgreSQL

-- 1. Tabel Profil Pengguna (Sinkron dengan auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Mengaktifkan Row Level Security (RLS) untuk profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil dapat dibaca oleh siapa saja" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Pengguna dapat mengubah profil sendiri" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger untuk membuat profil secara otomatis saat user mendaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
    VALUES (
        new.id,
        split_part(new.email, '@', 1),
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
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
