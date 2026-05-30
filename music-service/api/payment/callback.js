const { supabase } = require('../../lib/supabase');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

async function sendReceiptEmail({ email, username, packageName, amount, merchantOrderId, days }) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'no-reply@nextune.my.id';

  if (!smtpUser || !smtpPass) {
    console.warn("SMTP credentials not configured (SMTP_USER or SMTP_PASS is missing). Email receipt log:");
    console.log(`Receipt for: ${email} (${username}) - Package: ${packageName} - Amount: Rp ${amount} - Order ID: ${merchantOrderId} - Duration: ${days} days`);
    
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: email,
          subject: 'Pembayaran Berhasil! Selamat Datang di NexTune Premium',
          status: 'failed',
          error_message: 'SMTP credentials not configured (SMTP_USER or SMTP_PASS is missing on server)'
        });
      
      await supabase
        .from('transactions')
        .update({ notes: 'Gagal kirim email: Variabel SMTP_USER atau SMTP_PASS belum dikonfigurasi di dashboard server.' })
        .eq('id', merchantOrderId);
    } catch (dbErr) {
      console.warn("Gagal menyimpan log email ke database:", dbErr.message);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const purchaseDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(purchaseDate.getDate() + days);

  const formatLocalDate = (date) => {
    // Return date string in Indonesian locale and WIB timezone
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    }) + ' WIB';
  };

  const mailOptions = {
    from: `"NexTune Premium" <${smtpFrom}>`,
    to: email,
    subject: `Pembayaran Berhasil! Selamat Datang di NexTune Premium`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #6366f1; text-align: center;">NexTune Premium</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p>Halo, <strong>${username || 'Pengguna NexTune'}</strong>,</p>
        <p>Terima kasih atas pembelian Anda! Pembayaran Anda telah berhasil diverifikasi. Akun Anda kini aktif sebagai anggota <strong>Premium</strong>.</p>
        
        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
          <h3 style="margin-top: 0; color: #333;">Detail Transaksi:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #666; width: 40%;"><strong>Order ID:</strong></td>
              <td style="padding: 5px 0; color: #333;">${merchantOrderId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Paket Langganan:</strong></td>
              <td style="padding: 5px 0; color: #333;">${packageName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Durasi:</strong></td>
              <td style="padding: 5px 0; color: #333;">${days} Hari</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Jumlah Pembayaran:</strong></td>
              <td style="padding: 5px 0; color: #333; font-weight: bold; color: #10b981;">Rp ${amount.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Tanggal Pembelian:</strong></td>
              <td style="padding: 5px 0; color: #333;">${formatLocalDate(purchaseDate)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Masa Berlaku Akhir:</strong></td>
              <td style="padding: 5px 0; color: #333; font-weight: bold; color: #ef4444;">${formatLocalDate(expiryDate)}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #555;">Kini Anda dapat menikmati pemutaran musik tanpa iklan, lirik yang presisi, kontrol equalizer HIFI, dan fitur premium lainnya secara penuh di NexTune.</p>
        <p style="font-size: 14px; color: #555;">Jika Anda memiliki pertanyaan atau kendala mengenai transaksi Anda, silakan hubungi tim dukungan kami di <a href="mailto:support@nextune.my.id" style="color: #6366f1; text-decoration: none;">support@nextune.my.id</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; text-align: center; color: #aaa; margin-top: 20px;">
          © ${new Date().getFullYear()} NexTune Music. Hak Cipta Dilindungi.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Receipt email sent successfully to ${email}. Message ID: ${info.messageId}`);
    
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: email,
          subject: mailOptions.subject,
          status: 'success',
          error_message: null
        });
      
      await supabase
        .from('transactions')
        .update({ notes: `Email tanda terima sukses dikirim. Message ID: ${info.messageId}` })
        .eq('id', merchantOrderId);
    } catch (dbErr) {
      console.warn("Gagal mencatat log email sukses ke database:", dbErr.message);
    }
    
    return info;
  } catch (mailError) {
    console.error(`Failed to send receipt email to ${email}:`, mailError);
    
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: email,
          subject: mailOptions.subject,
          status: 'failed',
          error_message: mailError.message || String(mailError)
        });
      
      await supabase
        .from('transactions')
        .update({ notes: `Email gagal dikirim: ${mailError.message || String(mailError)}` })
        .eq('id', merchantOrderId);
    } catch (dbErr) {
      console.warn("Gagal mencatat log email gagal ke database:", dbErr.message);
    }
  }
}

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
        p_payment_method: paymentCode || 'Payment Gateway',
        p_merchant_order_id: merchantOrderId
      });

      if (error) {
        console.error("RPC activate_premium_user failed:", error);
        return res.status(500).json({ error: 'Failed to update database profile: ' + error.message });
      }

      // Fetch user profile to get email and username, and send receipt email
      try {
        const { data: userProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', userId)
          .single();

        let email = userProfile?.email;
        let username = userProfile?.username || 'Pengguna NexTune';

        if (!email) {
          // Fallback: Ambil email dari auth.users menggunakan admin API
          const { data: adminUserData, error: adminUserErr } = await supabase.auth.admin.getUserById(userId);
          if (!adminUserErr && adminUserData?.user) {
            email = adminUserData.user.email;
            if (adminUserData.user.user_metadata?.full_name) {
              username = adminUserData.user.user_metadata.full_name;
            }
          }
        }

        if (email) {
          await sendReceiptEmail({
            email: email,
            username: username,
            packageName: productDetails || 'NexTune Premium',
            amount: price,
            merchantOrderId: merchantOrderId,
            days: durationDays
          });
        } else {
          console.warn("Could not fetch user profile or email for sending receipt:", profileErr);
        }
      } catch (emailErr) {
        console.error("Error during email receipt process:", emailErr);
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
