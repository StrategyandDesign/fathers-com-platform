/* Certificate enrollment : Fathers.com
   Industry-standard shape: the browser sends intent (course + coupon) to the
   server-side checkout function, which owns price, coupon validation, and
   fulfillment. This file computes no money and enrolls nothing itself. */
(function(){
  function qs(k){ return new URLSearchParams(location.search).get(k) || ''; }
  function money(cents){ return '$' + (cents/100).toFixed(2); }
  function $(id){ return document.getElementById(id); }
  function setText(id, v){ var el=$(id); if(el) el.textContent = v; }

  var slug  = (qs('cert') || 'fundamentals').toLowerCase();
  var title = qs('title') || 'Fathering Fundamentals';
  var hours = qs('hours') || '10.0';
  var PRICE_DISPLAY_CENTS = 7900;   // display only; the server decides the real price
  var coupon = '';

  setText('certTitle', title);
  setText('certTitleSum', title);
  setText('certHours', hours);
  setText('priceLine', money(PRICE_DISPLAY_CENTS));
  setText('totalLine', money(PRICE_DISPLAY_CENTS));

  // ---- coupon: capture the code; the server judges it ----
  function applyCode(){
    var input = $('couponInput'), msg = $('couponMsg');
    var raw = (input && input.value || '').trim().toLowerCase();
    if(!raw){ if(msg){ msg.textContent='Enter your program code.'; msg.className='fine cpn-err'; } return; }
    coupon = raw;
    if(msg){ msg.textContent='Code will be applied at checkout.'; msg.className='fine cpn-ok'; }
    var btn = $('enrollBtn'); if(btn){ btn.textContent='Enroll with code'; }
  }

  function showSuccess(){
    var ep = $('enrollPanel'), sp = $('successPanel');
    if(ep) ep.style.display='none';
    if(sp) sp.style.display='';
    setText('successTitle', title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function note(text, cls){
    var n = $('enrollNote'); if(n){ n.textContent = text; n.className = 'fine ' + (cls||''); }
  }

  function enroll(){
    var btn = $('enrollBtn');

    if(!(window.FC && FC.live)){
      // Demo mode (no keys): show the success experience.
      showSuccess(); return;
    }

    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if(!uid){
        var back = 'enroll.html' + location.search;
        location.href = 'login.html?next=' + encodeURIComponent(back);
        return;
      }
      if(btn){ btn.disabled = true; btn.textContent = 'One moment\u2026'; }
      FC.sb.functions.invoke('checkout', {
        body: { action: 'create_checkout', course_slug: slug, coupon: coupon }
      }).then(function(r){
        if(btn){ btn.disabled = false; btn.textContent = coupon ? 'Enroll with code' : 'Enroll'; }
        var d = r && r.data;
        var err = r && r.error;

        if(d && d.enrolled){
          var dl = $('discountLine'); if(dl && coupon) dl.style.display='';
          if(coupon){ setText('discountAmt', '\u2212' + money(PRICE_DISPLAY_CENTS)); setText('totalLine', money(0)); }
          showSuccess(); return;
        }
        if(d && d.checkout_url){ location.href = d.checkout_url; return; }   // Stripe, when live
        if(d && d.requires_payment){
          note(d.message || 'Card payment activates soon. Enter your program code above for free access now.', 'cpn-err');
          var ci = $('couponInput'); if(ci) ci.focus();
          return;
        }
        // Function errors surface loudly, never silently.
        var detail = (err && err.message) || (d && (d.message || d.error)) || 'Checkout is not available right now.';
        if(/invalid_coupon|not recognized/i.test(JSON.stringify(d||{})) ) detail = 'That code was not recognized.';
        note('Could not complete enrollment: ' + detail, 'cpn-err');
      }, function(e){
        if(btn){ btn.disabled = false; btn.textContent = 'Enroll'; }
        note('Could not reach checkout: ' + (e && e.message || 'network error') + '. If this persists, the checkout function may not be deployed yet.', 'cpn-err');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var ca = $('couponApply'); if(ca) ca.addEventListener('click', function(e){ e.preventDefault(); applyCode(); });
    var ci = $('couponInput'); if(ci) ci.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); applyCode(); } });
    var btn = $('enrollBtn'); if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); enroll(); });
    var begin = $('beginBtn'); if(begin) begin.setAttribute('href', 'course.html?cert=' + encodeURIComponent(slug));
  });
})();
