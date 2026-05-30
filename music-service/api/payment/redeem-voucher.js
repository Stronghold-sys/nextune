const { supabase } = require('../../lib/supabase');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, voucherCode } = req.body;

  if (!userId || !voucherCode) {
    return res.status(400).json({ error: 'Parameters userId and voucherCode are required' });
  }

  try {
    // 1. Find voucher in DB
    const { data: voucher, error: vErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', voucherCode.trim())
      .single();

    if (vErr || !voucher) {
      return res.status(404).json({ error: 'Kode voucher tidak valid atau tidak ditemukan.' });
    }

    if (!voucher.is_active || voucher.used_by) {
      return res.status(400).json({ error: 'Kode voucher sudah digunakan atau tidak aktif.' });
    }

    const durationDays = voucher.duration_days;

    // 2. Mark voucher as used (using service role / bypass check via RPC or direct update)
    // Note: Since vouchers table has policy that only admins can update, we can update it directly from our trusted backend
    const { error: updateErr } = await supabase
      .from('vouchers')
      .update({
        is_active: false,
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('code', voucher.code);

    if (updateErr) {
      throw new Error("Gagal menandai voucher sebagai digunakan: " + updateErr.message);
    }

    // 3. Activate user premium status
    const { error: rpcErr } = await supabase.rpc('activate_premium_user', {
      p_user_id: userId,
      p_days: durationDays,
      p_package_name: `Redeem Voucher: ${voucher.code}`,
      p_amount: 0,
      p_payment_method: 'Voucher',
      p_merchant_order_id: `VOUCHER-${voucher.code}`
    });

    if (rpcErr) {
      throw rpcErr;
    }

    return res.status(200).json({
      success: true,
      message: `Voucher berhasil ditukarkan! Premium aktif selama ${durationDays === -1 ? 'Selamanya (Unlimited)' : durationDays + ' hari'}.`,
      durationDays
    });
  } catch (err) {
    console.error('Voucher redeem error:', err);
    res.status(500).json({ error: err.message });
  }
};
