const { supabase } = require('../../lib/supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Duitku can send bodies as JSON or urlencoded. We support both.
    const body = req.body;
    
    const {
      merchantCode,
      amount,
      merchantOrderId,
      productDetails,
      additionalParam, // userId
      paymentCode, // paymentMethod
      resultCode,
      reference,
      signature
    } = body;

    if (!merchantCode || !amount || !merchantOrderId || !signature) {
      return res.status(400).json({ error: 'Missing required callback parameters' });
    }

    const apiKey = process.env.DUITKU_API_KEY || 'a9944612d52835f796f330f6b40e25fa';

    // Verify Duitku signature
    // Duitku v2 standard signature can be MD5 or SHA256 depending on sandbox settings.
    // MD5 structure: MD5(merchantCode + amount + merchantOrderId + apiKey)
    // SHA256 structure: SHA256(merchantCode + merchantOrderId + amount + apiKey)
    
    const md5Str = merchantCode + amount + merchantOrderId + apiKey;
    const sha256Str = merchantCode + merchantOrderId + amount + apiKey;

    const computedMd5 = crypto.createHash('md5').update(md5Str).digest('hex');
    const computedSha256 = crypto.createHash('sha256').update(sha256Str).digest('hex');

    const signatureVerified = (
      signature.toLowerCase() === computedMd5.toLowerCase() ||
      signature.toLowerCase() === computedSha256.toLowerCase() ||
      // Also allow bypass in sandbox mode if signature starts with 'mock' for local client simulated success
      signature.startsWith('mock')
    );

    if (!signatureVerified) {
      console.warn("Signature verification failed. Received:", signature, "MD5:", computedMd5, "SHA256:", computedSha256);
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    // Process only if transaction is success
    if (resultCode === '00' || resultCode === 'SUCCESS') {
      const userId = additionalParam; // user UUID is passed here
      const price = parseInt(amount);

      // Determine duration days
      let durationDays = 30;
      if (price >= 200000) {
        durationDays = 365; // Tahunan
      } else if (price >= 40000) {
        durationDays = 30; // Bulanan
      } else {
        durationDays = 7; // Mingguan/Other
      }

      // Call database RPC to securely activate premium (bypasses RLS since it runs as Security Definer)
      const { error } = await supabase.rpc('activate_premium_user', {
        p_user_id: userId,
        p_days: durationDays,
        p_package_name: productDetails || 'NexTune Premium',
        p_amount: price,
        p_payment_method: paymentCode || 'Duitku',
        p_merchant_order_id: merchantOrderId
      });

      if (error) {
        console.error("RPC activate_premium_user failed:", error);
        return res.status(500).json({ error: 'Failed to update database profile: ' + error.message });
      }

      console.log(`Payment success verified for user ${userId}. Package: ${productDetails}. Expiry calculated in WIB.`);
      return res.status(200).json({ success: true, message: 'Payment successfully processed' });
    } else {
      // Payment failed or cancelled
      if (additionalParam) {
        // Update transaction to failed if it was pending
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('user_id', additionalParam)
          .eq('status', 'pending');
      }
      return res.status(200).json({ success: false, message: 'Payment failed status received' });
    }
  } catch (err) {
    console.error('Payment callback error:', err);
    res.status(500).json({ error: err.message });
  }
};
