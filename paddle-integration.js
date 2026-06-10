(function() {
  'use strict';

  // ==========================================
  // SWAP THESE WITH YOUR NEW SANDBOX CREDENTIALS
  // ==========================================
  const PADDLE_TOKEN = 'test_bb4ca1cde3fa35741b955b529d4'; // Paddle Dashboard → Developer Tools → Authentication
  const PRICE_IDS = {
    monthly:  'pri_01kte7c5yjvxyf6en3229d5gba',  // Catalog → Products → Prices
    yearly:   'pri_01kte7dbwfty5hhbe2jdrgst3p',
    lifetime: 'pri_01kte7fbbrg3mxhyt46gnt11y8'
  };

  let paddleReady = false;

  function initPaddle() {
    if (typeof window.Paddle === 'undefined') {
      console.error('[GoPeek] Paddle.js not loaded. Make sure <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script> is above this file.');
      return;
    }

    try {
      window.Paddle.Environment.set('sandbox');
      console.log('[GoPeek] ✅ Sandbox environment set');
    } catch (e) {
      console.error('[GoPeek] ❌ Failed to set sandbox:', e);
    }

    try {
      window.Paddle.Initialize({ token: PADDLE_TOKEN });
      paddleReady = true;
      console.log('[GoPeek] ✅ Paddle initialized');
    } catch (e) {
      console.error('[GoPeek] ❌ Paddle.Initialize failed:', e);
      alert('Paddle failed to initialize. Check your token in paddle-integration.js');
    }
  }

  window.openGoPeekCheckout = function(plan) {
    plan = plan || 'monthly';
    console.log('[GoPeek] Checkout called:', plan);

    if (!paddleReady || typeof window.Paddle === 'undefined') {
      alert('Paddle is not ready. Check console for errors.');
      return;
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId || priceId.includes('YOUR_NEW')) {
      alert('Price ID not configured. Open paddle-integration.js and paste your Price IDs from Paddle Dashboard.');
      console.error('[GoPeek] Missing Price ID for plan:', plan);
      return;
    }

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        settings: {
          theme: 'light',
          displayMode: 'overlay',
          locale: 'en'
        },
        successCallback: function(data) {
          console.log('[GoPeek] ✅ Checkout SUCCESS:', data);
          handleCheckoutSuccess(data, plan);
        },
        errorCallback: function(error) {
          console.error('[GoPeek] ❌ Checkout ERROR:', error);
          // Paddle shows its own UI error, but we log it
        },
        closeCallback: function() {
          console.log('[GoPeek] Checkout closed');
        }
      });
    } catch (e) {
      console.error('[GoPeek] ❌ Checkout.open() crashed:', e);
      alert('Checkout crashed: ' + e.message);
    }
  };

  function handleCheckoutSuccess(data, plan) {
    const planName = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? 'Yearly' : 'Lifetime';
    
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
        <div style="background:#fff;border-radius:20px;padding:40px;max-width:420px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)">
          <div style="font-size:48px;margin-bottom:16px">🎉</div>
          <h2 style="margin:0 0 12px 0;font-size:24px;color:#1a1a2e">Welcome to Pro!</h2>
          <p style="color:#666;line-height:1.6;margin-bottom:24px">
            Subscribed to <strong>${planName}</strong>.<<br><br>
            <strong>Next step:</strong> Open the GoPeek extension popup, click the header 3 times fast, or restart the extension to activate Pro.
          </p>
          <button id="gopeek-close-modal" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Got it!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('gopeek-close-modal').addEventListener('click', function() {
      modal.remove();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaddle);
  } else {
    initPaddle();
  }
})();
