(function() {
  'use strict';

  const PRICE_IDS = {
    monthly: 'pri_01kte7c5yjvxyf6en3229d5gba',
    yearly: 'pri_01kte7dbwfty5hhbe2jdrgst3p',
    lifetime: 'pri_01kte7fbbrg3mxhyt46gnt11y8'
  };

  const urlParams = new URLSearchParams(window.location.search);
  const EXTENSION_ID = urlParams.get('ext_id');

  function initPaddle() {
    if (typeof Paddle === 'undefined') {
      console.error('[GoPeek] Paddle.js not loaded');
      return;
    }
    try {
      Paddle.Environment.set('sandbox');
      Paddle.Initialize({ token: 'test_c683291bed2236d317eba3c8975' });
      console.log('[GoPeek] Paddle sandbox initialized');
    } catch (e) {
      console.error('[GoPeek] Paddle init error:', e);
    }
  }

  window.openGoPeekCheckout = function(plan) {
    plan = plan || 'monthly';
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      alert('Invalid plan');
      return;
    }

    try {
      Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        settings: {
          theme: 'light',
          displayMode: 'overlay',
          locale: 'en'
        },
        successCallback: function(data) {
          console.log('[GoPeek] Checkout success:', data);
          handleCheckoutSuccess(data, plan);
        },
        errorCallback: function(error) {
          console.error('[GoPeek] Checkout error:', error);
          alert('Checkout error: ' + JSON.stringify(error));
        },
        closeCallback: function() {
          console.log('[GoPeek] Checkout closed');
        }
      });
    } catch (e) {
      console.error('[GoPeek] Checkout open error:', e);
      alert('Error opening checkout: ' + e.message);
    }
  };

  function handleCheckoutSuccess(data, plan) {
    const planName = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? 'Yearly' : 'Lifetime';

    // Notify extension if available
    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          action: 'paddle_success',
          plan: plan,
          transactionId: data?.transaction?.id || 'sandbox'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('[GoPeek] Extension not reachable:', chrome.runtime.lastError.message);
          } else {
            console.log('[GoPeek] Extension acknowledged:', response);
          }
        });
      } catch (e) {
        console.log('[GoPeek] Could not message extension:', e);
      }
    }

    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
        <div style="background:#fff;border-radius:20px;padding:40px;max-width:420px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)">
          <div style="font-size:48px;margin-bottom:16px">🎉</div>
          <h2 style="margin:0 0 12px 0;font-size:24px;color:#1a1a2e">Welcome to Pro!</h2>
          <p style="color:#666;line-height:1.6;margin-bottom:24px">
            You have successfully subscribed to the <strong>${planName}</strong> plan.<br><br>
            Your extension will be activated automatically. If not, please restart the extension.
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaddle);
  } else {
    initPaddle();
  }
})();
