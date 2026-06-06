(function() {
  'use strict';

  const PRICE_IDS = {
    monthly: 'pri_01kte7c5yjvxyf6en3229d5gba',
    yearly: 'pri_01kte7dbwfty5hhbe2jdrgst3p',
    lifetime: 'pri_01kte7fbbrg3mxhyt46gnt11y8'
  };

  function initPaddle() {
    if (typeof Paddle === 'undefined') {
      console.error('[GoPeek] Paddle.js not loaded');
      return;
    }

    try {
      Paddle.Environment.set('sandbox');
      Paddle.Initialize({ 
        token: 'test_c683291bed2236d317eba3c8975',
        eventCallback: function(event) {
          console.log('[GoPeek] Paddle event:', event.name, event.data);
        }
      });
      console.log('[GoPeek] Paddle initialized');
    } catch (e) {
      console.error('[GoPeek] Init error:', e);
    }
  }

  window.openGoPeekCheckout = function(plan) {
    plan = plan || 'monthly';
    const priceId = PRICE_IDS[plan];
    
    if (!priceId) {
      console.error('[GoPeek] Invalid plan:', plan);
      return;
    }

    try {
      Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          theme: 'light',
          locale: 'en'
        },
        successCallback: function(data) {
          console.log('[GoPeek] Success:', data);
          handleCheckoutSuccess(data, plan);
        },
        errorCallback: function(error) {
          console.error('[GoPeek] Checkout error:', error);
          alert('Checkout error: ' + (error.detail || error.message || 'Unknown error'));
        },
        closeCallback: function() {
          console.log('[GoPeek] Checkout closed');
        }
      });
    } catch (e) {
      console.error('[GoPeek] Open error:', e);
      alert('Error: ' + e.message);
    }
  };

  function handleCheckoutSuccess(data, plan) {
    var planName = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? 'Yearly' : 'Lifetime';
    var modal = document.createElement('div');
    modal.innerHTML = '<div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">' +
      '<div style="background:#fff;border-radius:20px;padding:40px;max-width:420px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.3)">' +
      '<div style="font-size:48px;margin-bottom:16px">&#127881;</div>' +
      '<h2 style="margin:0 0 12px 0;font-size:24px;color:#1a1a2e">Welcome to Pro!</h2>' +
      '<p style="color:#666;line-height:1.6;margin-bottom:24px">You have successfully subscribed to the <strong>' + planName + '</strong> plan.<br><br>Your Pro license will be activated within 2 minutes.</p>' +
      '<button id="gopeek-close-modal" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Got it!</button>' +
      '</div></div>';
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
