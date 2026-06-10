(function() {
  'use strict';

  const PRICE_IDS = {
    monthly: 'pri_01kte7c5yjvxyf6en3229d5gba',
    yearly: 'pri_01kte7dbwfty5hhbe2jdrgst3p',
    lifetime: 'pri_01kte7fbbrg3mxhyt46gnt11y8'
  };

  // Try to detect extension ID from URL param (fallback), or use hardcoded
  const urlParams = new URLSearchParams(window.location.search);
  const EXT_ID_FROM_URL = urlParams.get('ext_id');
  
  // Hardcode your extension ID here after first load:
  const EXTENSION_ID = EXT_ID_FROM_URL || 'hniacbcjlnahjakodklkkpdopicfcpkj'; // <-- SWAP AFTER FIRST TEST

  let paddleReady = false;

  function initPaddle() {
    if (typeof window.Paddle === 'undefined') {
      console.error('[GoPeek] Paddle.js not loaded');
      return;
    }

    try {
      window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({ token: 'test_c683291bed2236d317eba3c8975' });
      paddleReady = true;
      console.log('[GoPeek] ✅ Paddle ready');
    } catch (e) {
      console.error('[GoPeek] ❌ Paddle init failed:', e);
    }
  }

  window.openGoPeekCheckout = function(plan) {
    plan = plan || 'monthly';
    if (!paddleReady) {
      alert('Payment system not ready. Please refresh.');
      return;
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      alert('Invalid plan');
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      settings: {
        theme: 'light',
        displayMode: 'overlay',
        locale: 'en'
      },
      successCallback: function(data) {
        console.log('[GoPeek] ✅ Checkout success:', data);
        activatePro(data, plan);
      },
      errorCallback: function(error) {
        console.error('[GoPeek] ❌ Checkout error:', error);
      }
    });
  };

  function activatePro(data, plan) {
    const transactionId = data?.transaction?.id || data?.order?.id || 'txn-' + Date.now();
    const planName = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? 'Yearly' : 'Lifetime';

    // Try auto-activation via externally_connectable
    if (EXTENSION_ID && EXTENSION_ID !== 'YOUR_EXTENSION_ID_HERE') {
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
            showSuccessAuto(planName);
          } else {
            showSuccessManual(planName, transactionId);
          }
        });
      } catch (e) {
        console.log('[GoPeek] Could not message extension:', e);
        showSuccessManual(planName, transactionId);
      }
    } else {
      // No extension ID configured — show manual activation
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaddle);
  } else {
    initPaddle();
  }
})();
