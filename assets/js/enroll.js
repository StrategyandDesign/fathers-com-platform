/* Course enrollment : Fathers.com
   Industry-standard shape: the browser sends intent (the course) to the
   server-side checkout function, which owns the claim check and fulfillment.
   v4.0: participation requires an active claim by a Certified Facilitator or
   Certified Organization. This file computes nothing and enrolls nothing itself. */
(function(){
  function qs(k){ return new URLSearchParams(location.search).get(k) || ''; }
  function $(id){ return document.getElementById(id); }
  function setText(id, v){ var el=$(id); if(el) el.textContent = v; }

  var slug  = (qs('cert') || 'fundamentals').toLowerCase();
  var title = qs('title') || 'Fathering Fundamentals';
  var hours = qs('hours') || '10.0';
  // v4.0: courses and the Certificate of Completion are free to the man, always.
  // Enrollment requires an active claim; the server-side checkout function is
  // the authority on both the claim and the enrollment.

  var DEV = { steady:'Steady Under Pressure', reentry:'Coming Home Present' };
  if(DEV[slug]){
    var ep0=$('enrollPanel'), wp=$('waitlistPanel');
    if(ep0) ep0.style.display='none';
    if(wp){ wp.hidden=false; setText('wlTitle', DEV[slug]); var t=$('wlTrack'); if(t) t.value=DEV[slug]; }
    document.title = DEV[slug] + ' | Waitlist | Fathers.com';
    return;
  }

  setText('certTitle', title);
  setText('certTitleSum', title);
  setText('certHours', hours);
  setText('priceLine', 'Free');
  setText('totalLine', 'Free');

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
        body: { action: 'create_checkout', course_slug: slug }
      }).then(function(r){
        if(btn){ btn.disabled = false; btn.textContent = 'Enroll'; }
        var d = r && r.data;
        var err = r && r.error;

        if(d && d.enrolled){ showSuccess(); return; }
        if(d && d.claim_required){
          var cs = $('claimStatus');
          if(cs){ cs.textContent = 'No active claim found for your account yet. Ask your facilitator or organization to claim your seat, then enroll again. It takes them under a minute.'; cs.className = 'small cpn-err'; }
          note('Your seat has not been claimed yet.', 'cpn-err');
          return;
        }
        if(d && d.checkout_url){ location.href = d.checkout_url; return; }   // Stripe, when live

        // Function errors surface loudly, never silently.
        var detail = (err && err.message) || (d && (d.message || d.error)) || 'Enrollment is not available right now.';
        note('Could not complete enrollment: ' + detail, 'cpn-err');
      }, function(e){
        if(btn){ btn.disabled = false; btn.textContent = 'Enroll'; }
        note('Could not reach checkout: ' + (e && e.message || 'network error') + '. If this persists, the checkout function may not be deployed yet.', 'cpn-err');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var btn = $('enrollBtn'); if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); enroll(); });
    var begin = $('beginBtn'); if(begin) begin.setAttribute('href', 'course.html?cert=' + encodeURIComponent(slug));
  });
})();
