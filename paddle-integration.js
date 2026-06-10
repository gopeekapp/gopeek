(function() {
  'use strict';

  const PRICE_IDS = {
    monthly: 'pri_01kte7c5yjvxyf6en3229d5gba',
    yearly: 'pri_01kte7dbwfty5hhbe2jdrgst3p',
    lifetime: 'pri_01kte7fbbrg3mxhyt46gnt11y8'
  };

  // Get extension ID from URL or hardcode
  const urlParams = new URLSearchParams(window.location.search);
  const EXT_ID_FROM_URL = urlParams.get('ext_id');
  const EXTENSION_ID = EXT_ID_FROM_URL || 'hniacbcjlnahjakodklkkpdopicfcpkj';

  let paddleReady = false;

  function initPaddle() {
    console.log('[GoPeek] Checking Paddle...');

    if (typeof window.Paddle === 'undefined') {
      console.error('[GoPeek] ❌ Paddle.js not loaded! Make sure the script tag is above this file.');
      showError('Paddle.js not loaded. Check script order in HTML.');
      return;
    }

    console.log('[GoPeek] Paddle object found:', typeof Paddle);
    console.log('[GoPeek] Paddle.Environment:', typeof Paddle.Environment);
    console.log('[GoPeek] Paddle.Initialize:', typeof Paddle.Initialize);
    console.log('[GoPeek] Paddle.Checkout:', typeof Paddle.Checkout);

    try {
      // Set sandbox environment
      if (Paddle.Environment && Paddle.Environment.set) {
        Paddle.Environment.set('sandbox');
        console.log('[GoPeek] ✅ Sandbox environment set');
      } else {
        console.warn('[GoPeek] ⚠️ Paddle.Environment.set not available');
      }
    } catch (e) {
      console.error('[GoPeek] ❌ Environment set failed:', e);
    }

    // Wait a bit then initialize
    setTimeout(() => {
      try {
        if (Paddle.Initialize) {
          Paddle.Initialize({ 
            token: 'test_c683291bed2236d317eba3c8975',
            eventCallback: function(event) {
              console.log('[GoPeek] Paddle event:', event.name, event.data);
            }
          });
          paddleReady = true;
          console.log('[GoPeek] ✅ Paddle initialized successfully');
        } else {
          console.error('[GoPeek] ❌ Paddle.Initialize not available');
          showError('Paddle.Initialize not available. Token may be invalid.');
        }
      } catch (e) {
        console.error('[GoPeek] ❌ Initialize failed:', e.message);
        showError('Paddle init failed: ' + e.message);
      }
    }, 500);
  }

  function showError(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;z-index:99999;background:#ff3b30;color:#fff;padding:16px;border-radius:12px;font-family:system-ui,sans-serif;font-size:14px;';
    div.textContent = '🔴 ' + msg;
    document.body.appendChild(div);
  }

  window.openGoPeekCheckout = function(plan) {
    plan = plan || 'monthly';
    console.log('[GoPeek] Checkout called for:', plan);

    if (!paddleReady) {
      alert('Payment system initializing... Please wait 2 seconds and try again.');
      return;
    }

    if (typeof window.Paddle === 'undefined' || !Paddle.Checkout || !Paddle.Checkout.open) {
      alert('Paddle checkout not available. Please refresh the page.');
      return;
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      alert('Invalid plan selected');
      return;
    }

    console.log('[GoPeek] Opening checkout with priceId:', priceId);

    try {
      Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        settings: {
          theme: 'light',
          displayMode: 'overlay',
          locale: 'en'
        },
        successCallback: function(data) {
          console.log('[GoPeek] ✅ SUCCESS:', JSON.stringify(data, null, 2));
          activatePro(data, plan);
        },
        errorCallback: function(error) {
          console.error('[GoPeek] ❌ Checkout error:', JSON.stringify(error, null, 2));
          // Paddle shows its own error UI
        },
        closeCallback: function() {
          console.log('[GoPeek] Checkout closed');
        }
      });
    } catch (e) {
      console.error('[GoPeek] ❌ Checkout.open() crashed:', e);
      alert('Checkout error: ' + e.message);
    }
  };

  function activatePro(data, plan) {
    const transactionId = data?.transaction?.id || data?.order?.id || data?.checkout?.id || 'txn-' + Date.now();
    const planName = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? 'Yearly' : 'Lifetime';

    console.log('[GoPeek] Activating Pro with transaction:', transactionId);

    // Try auto-activation via externally_connectable
    if (EXTENSION_ID && EXTENSION_ID !== 'YOUR_EXTENSION_ID_HERE') {
      console.log('[GoPeek] Messaging extension:', EXTENSION_ID);
      
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          action: 'paddle_success',
          plan: plan,
          transactionId: transactionId
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('[GoPeek] Extension not reachable:', chrome.runtime.lastError.message);
            showSuccessManual(planName, transactionId);
          } else if (response && response.success) {
            console.log('[GoPeek] ✅ Auto-activated:', response);
            showSuccessAuto(planName);
          } else {
            console.log('[GoPeek] Extension rejected:', response);
            showSuccessManual(planName, transactionId);
          }
        });
      } catch (e) {
        console.log('[GoPeek] Could not message extension:', e);
        showSuccessManual(planName, transactionId);
      }
    } else {
      console.log('[GoPeek] No extension ID, showing manual');
      showSuccessManual(planName, transactionId);
    }
  }

  function showSuccessAuto(planName) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
        <div style="background:#fff;border-radius:20px;padding:40px;max-width:420px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)">
          <div style="font-size:48px;margin-bottom:16px">🎉</div>
          <h2 style="margin:0 0 12px 0;font-size:24px;color:#1a1a2e">Pro Activated!</h2>
          <p style="color:#666;line-height:1.6;margin-bottom:24px">
            Your <strong>${planName}</strong> plan is now active.<br><br>
            The extension has been updated automatically. Open the GoPeek popup to see your Pro status!
          </p>
          <button id="gopeek-close-modal" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Awesome!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('gopeek-close-modal').addEventListener('click', () => modal.remove());
  }

  function showSuccessManual(planName, transactionId) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
        <div style="background:#fff;border-radius:20px;padding:40px;max-width:460px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)">
          <div style="font-size:48px;margin-bottom:16px">🎉</div>
          <h2 style="margin:0 0 12px 0;font-size:24px;color:#1a1a2e">Welcome to Pro!</h2>
          <p style="color:#666;line-height:1.6;margin-bottom:16px">
            Subscribed to <strong>${planName}</strong>.
          </p>
          <div style="background:#f5f5f7;border-radius:12px;padding:16px;margin-bottom:20px;text-align:left;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#666;">Your activation key:</p>
            <code id="gopeek-key" style="display:block;background:#1a1a2e;color:#00ff88;padding:12px;border-radius:8px;font-family:monospace;font-size:13px;word-break:break-all;cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent);this.style.background='#0f3d0f';setTimeout(()=>this.style.background='#1a1a2e',500)">${transactionId}</code>
            <p style="margin:8px 0 0 0;font-size:11px;color:#999;">Click to copy</p>
          </div>
          <p style="color:#666;font-size:13px;margin-bottom:16px;">
            <strong>Next step:</strong> Open the GoPeek extension popup → click the "Pro" tab → paste your key to activate.
          </p>
          <button id="gopeek-close-modal" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Got it!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('gopeek-close-modal').addEventListener('click', () => modal.remove());
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaddle);
  } else {
    initPaddle();
  }
})();
