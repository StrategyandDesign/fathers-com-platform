/* Certificate enrollment + coupon flow : Fathers.com
   Reads the certificate from URL params, applies the program code,
   and enrolls the signed-in member. Payment is not wired yet, so the
   free-via-code path is the live path. Writes to Supabase when available;
   never blocks the UX if the write fails. */
(function(){
  var PRICE_CENTS = 7900;                 // $79 per certificate
  var CODE = 'fatherclan';                // program code for free access
  var applied = false;

  function qs(k){ return new URLSearchParams(location.search).get(k) || ''; }
  function money(cents){ return '$' + (cents/100).toFixed(2); }
  function $(id){ return document.getElementById(id); }

  var slug  = (qs('cert') || 'fundamentals').toLowerCase();
  var title = qs('title') || 'Fathering Fundamentals';
  var hours = qs('hours') || '10.0';

  // ---- paint the certificate into the page ----
  function setText(id, v){ var el=$(id); if(el) el.textContent = v; }
  setText('certTitle', title);
  setText('certTitleSum', title);
  setText('certHours', hours);
  setText('priceLine', money(PRICE_CENTS));
  setText('totalLine', money(PRICE_CENTS));

  // ---- coupon ----
  function applyCode(){
    var input = $('couponInput');
    var msg = $('couponMsg');
    var raw = (input && input.value || '').trim().toLowerCase();
    if(!raw){ if(msg){ msg.textContent='Enter your program code.'; msg.className='fine cpn-err'; } return; }
    if(raw === CODE){
      applied = true;
      var dl = $('discountLine'); if(dl) dl.style.display='';
      setText('discountAmt', '\u2212' + money(PRICE_CENTS));
      setText('totalLine', money(0));
      if(msg){ msg.textContent='Code applied. Free access unlocked.'; msg.className='fine cpn-ok'; }
      if(input){ input.disabled = true; }
      var ca = $('couponApply'); if(ca){ ca.disabled = true; ca.textContent='Applied'; }
      var btn = $('enrollBtn'); if(btn){ btn.textContent='Enroll for free'; }
    } else {
      applied = false;
      if(msg){ msg.textContent='That code was not recognized.'; msg.className='fine cpn-err'; }
    }
  }

  // ---- enrollment ----
  function showSuccess(){
    var ep = $('enrollPanel'), sp = $('successPanel');
    if(ep) ep.style.display='none';
    if(sp) sp.style.display='';
    setText('successTitle', title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function persistEnrollment(){
    // Best effort. Requires live Supabase, a signed-in user, and a seeded course row.
    if(!window.FC || !FC.live) return Promise.resolve();
    return FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if(!uid) return;
      return FC.sb.from('certificate_courses').select('id').eq('slug', slug).single()
        .then(function(r){
          var courseId = r && r.data && r.data.id;
          if(!courseId) return;   // course not seeded yet; skip write, keep UX
          return FC.sb.from('certificate_enrollments').insert({
            user_id: uid, course_id: courseId, status: 'active', coupon: applied ? CODE : null
          });
        })
        .catch(function(){ /* non-blocking */ });
    });
  }

  function enroll(){
    var btn = $('enrollBtn');
    var note = $('enrollNote');

    function proceed(signedIn){
      if(!signedIn){
        // Save intent and send them to sign in, then back here.
        var back = 'enroll.html' + location.search;
        location.href = 'login.html?next=' + encodeURIComponent(back);
        return;
      }
      if(!applied){
        // No payment processor yet: the code is the way in for now.
        if(note){ note.textContent='Card payment activates soon. Enter your program code above for free access now.'; note.className='fine cpn-err'; }
        var ci = $('couponInput'); if(ci) ci.focus();
        return;
      }
      if(btn){ btn.disabled = true; btn.textContent='Enrolling\u2026'; }
      persistEnrollment().then(showSuccess);
    }

    if(window.FC && FC.live){
      FC.ready.then(function(){ proceed(!!(FC.uid && FC.uid())); });
    } else {
      // Demo mode (no keys): let the flow run so the experience is visible.
      proceed(true);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    var ca = $('couponApply'); if(ca) ca.addEventListener('click', function(e){ e.preventDefault(); applyCode(); });
    var ci = $('couponInput'); if(ci) ci.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); applyCode(); } });
    var btn = $('enrollBtn'); if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); enroll(); });
    var begin = $('beginBtn'); if(begin) begin.setAttribute('href', 'class.html');
  });
})();
