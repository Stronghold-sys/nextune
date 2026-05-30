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
