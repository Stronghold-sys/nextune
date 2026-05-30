const { supabase } = require('../../lib/supabase');
const crypto = require('crypto');

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

  const { userId, packageId, email } = req.body;

  if (!userId || !packageId) {
    return res.status(400).json({ error: 'Parameters userId and packageId are required' });
  }

  try {
    // 1. Get package details from DB
    let price = 49000;
    let packageName = 'Bulanan Premium';
    let durationDays = 30;

    if (packageId && !packageId.startsWith('mock-')) {
      const { data: pkg, error } = await supabase
        .from('premium_packages')
        .select('*')
        .eq('id', packageId)
        .single();
      
      if (pkg && !error) {
        price = parseInt(pkg.price);
        packageName = pkg.name;
        durationDays = pkg.duration_days;
      }
    } else {
      // Mock fallbacks
      if (packageId === 'mock-p2') {
        price = 299000;
        packageName = 'Tahunan Premium';
        durationDays = 365;
      }
    }

    // 2. Generate unique merchantOrderId
    const merchantOrderId = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // Duitku credentials (Sandbox)
    const merchantCode = process.env.DUITKU_MERCHANT_CODE || 'DS31208';
    const apiKey = process.env.DUITKU_API_KEY || 'a9944612d52835f796f330f6b40e25fa';
    
    // 3. Compute Inquiry signature
    // Signature = MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    const payloadStr = merchantCode + merchantOrderId + price.toString() + apiKey;
    const signature = crypto.createHash('md5').update(payloadStr).digest('hex');

    // 4. Create pending transaction in Supabase
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        package_id: (packageId && !packageId.startsWith('mock-')) ? packageId : null,
        amount: price,
        status: 'pending',
        payment_method: 'duitku_pop',
        merchant_order_id: merchantOrderId,
      });

    // 5. Call Duitku Sandbox API - Pop inquiry endpoint
    const callbackUrl = `${process.env.MUSIC_SERVICE_URL || 'https://nextune-psi.vercel.app'}/api/payment/callback`;
    const returnUrl = process.env.FRONTEND_URL || 'https://nextune.my.id';

    const duitkuPayload = {
      merchantCode,
      paymentAmount: price,
      merchantOrderId,
      productDetails: packageName,
      additionalParam: userId, // Pass user ID to activate premium after payment
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: 1440, // 24 hours
      email: email || 'customer@nextune.my.id',
      customerDetail: {
        firstName: 'Customer',
        lastName: 'NexTune',
        email: email || 'customer@nextune.my.id',
        phoneNumber: '08123456789'
      }
    };

    const isProd = !merchantCode.startsWith('DS');
    const duitkuUrl = isProd 
      ? 'https://passport.duitku.com/webapi/api/merchant/paymentinquiry'
      : 'https://sandbox.duitku.com/webapi/api/merchant/paymentinquiry';

    let reference = null;
    let paymentUrl = null;

    try {
      const duitkuResp = await fetch(duitkuUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duitkuPayload)
      });
      const duitkuData = await duitkuResp.json();

      console.log('Duitku response:', JSON.stringify(duitkuData));

      if (duitkuData && (duitkuData.statusCode === '00' || duitkuData.reference)) {
        reference = duitkuData.reference;
        paymentUrl = duitkuData.paymentUrl;
      } else {
        console.warn('Duitku inquiry returned non-success:', duitkuData);
      }
    } catch (duitkuErr) {
      console.warn('Duitku API call failed:', duitkuErr.message);
    }

    // 6. Return response to frontend
    // If we got a real reference, frontend will use checkout.process(reference, ...)
    // If not (API failed), we still return what we have so frontend can show a fallback
    return res.status(200).json({
      success: true,
      merchantOrderId,
      amount: price,
      reference: reference || ('REF-LOCAL-' + merchantOrderId),
      paymentUrl: paymentUrl || null,
      packageName,
      durationDays,
      isSandboxFallback: !reference, // flag so frontend knows if real or fallback
      isSandbox: !isProd
    });

  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: err.message });
  }
};
