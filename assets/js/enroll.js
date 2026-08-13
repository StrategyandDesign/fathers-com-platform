/* Course enrollment : Fathers.com
   Industry-standard shape: the browser sends intent (the course) to the
   server-side checkout function, which owns the claim check and fulfillment.
   Films and training are open without a claim. A certificate still needs an
   active claim by a Certified Facilitator or Certified Organization. */
(function(){
  function qs(k){ return new URLSearchParams(location.search).get(k) || ''; }
  function $(id){ return document.getElementById(id); }
  function setText(id, v){ var el=$(id); if(el) el.textContent = v; }

  var slug  = (qs('cert') || 'fundamentals').toLowerCase();
  var title = qs('title') || 'Fathering Fundamentals';
  var hours = qs('hours') || '10.0';

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

  function claimNote(){
    var cs = $('claimStatus');
    if(cs){
      cs.className = 'small';
      cs.innerHTML = 'Films and your plan stay open. A certificate needs a Certified Facilitator or Organization to claim your seat.'+
        '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">'+
          '<a class="btn btn-primary btn-sm" href="course.html?cert='+encodeURIComponent(slug)+'">Watch the films</a>'+
          '<a class="link ash" href="plan.html">Continue your free plan</a>'+
        '</div>'+
        '<p class="fine" style="margin:10px 0 0">If you already have a facilitator, ask them to add your seat. Then come back here if you want the serial.</p>';
    }
    note('You can train now. The certificate waits on a claimed seat.', '');
  }

  function enroll(){
    var btn = $('enrollBtn');

    if(!(window.FC && FC.live)){
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

        if(d && d.enrolled){
          if(d.claim_required_for_certificate) claimNote();
          showSuccess();
          return;
        }
        if(d && (d.claim_required || d.claim_required_for_certificate)){
          claimNote();
          return;
        }
        if(d && d.checkout_url){
          note('This course is free. Enrollment does not go to checkout. Refresh and enroll again, or continue from your plan.', 'cpn-err');
          return;
        }

        var detail = (err && err.message) || (d && (d.message || d.error)) || 'Enrollment is not available right now.';
        note('Could not complete enrollment: ' + detail, 'cpn-err');
      }, function(e){
        if(btn){ btn.disabled = false; btn.textContent = 'Enroll'; }
        note('Could not complete enrollment: ' + (e && e.message || 'network error') + '. If this persists, try again in a moment.', 'cpn-err');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var btn = $('enrollBtn'); if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); enroll(); });
    var begin = $('beginBtn'); if(begin) begin.setAttribute('href', 'course.html?cert=' + encodeURIComponent(slug));
  });
})();
