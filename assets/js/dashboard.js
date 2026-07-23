/* ============================================================
   The participant dashboard. One place a man's written report always lives:
   it appears the moment he finishes and every time he returns. The report is not
   rebuilt here; it is the same component report.html uses (window.FCReport),
   rendered into this page's container. Three modes:

     (default)      the signed-in participant's own latest report.
     ?demo=1        the Marcus mock, so the infrastructure is demonstrable with
                    no live data. This is exactly what a participant sees.
     ?as=<user_id>  admin view-as. An admin sees a participant's dashboard exactly
                    as the participant sees it. Read only, admin-gated.

   Which assessment produced the result is resolved by the registry inside
   FCReport, so a father profile or a manhood profile renders correctly with no
   change here.
   ============================================================ */
(function(){
  var host = document.getElementById('dashReport');
  if(!host || !window.FCReport) return;

  var qs    = new URLSearchParams(location.search);
  var asUid = qs.get('as');
  var demo  = qs.get('demo');
  var done  = qs.get('done');

  var nameEl = document.getElementById('dashName');
  var wrapEl = document.getElementById('dashNameWrap');
  var banner = document.getElementById('dashBanner');

  function setName(n){ if(n && nameEl){ nameEl.textContent = n; if(wrapEl) wrapEl.style.display = ''; } }
  function say(html){ if(banner){ banner.style.display = ''; banner.innerHTML = html; } }
  function loading(m){ host.innerHTML = '<div class="center" style="padding:60px 0"><p class="ash">'+(m||'Loading your report\u2026')+'</p></div>'; }
  function empty(){
    host.innerHTML = '<div class="card" style="padding:30px">'+
      '<h3 class="d-22" style="margin:0 0 8px">Your report is not ready yet</h3>'+
      '<p class="fine" style="margin:0 0 16px">Take your Profile and your full written report appears here, always available.</p>'+
      '<a class="btn btn-yellow btn-sm" href="profile.html">Take your Profile</a></div>';
  }
  function denied(){
    host.innerHTML = '<div class="card" style="padding:30px">'+
      '<h3 class="d-22" style="margin:0 0 8px">Admin access required</h3>'+
      '<p class="fine" style="margin:0">Viewing another participant\u2019s dashboard requires an admin role.</p></div>';
  }
  function draw(result, who){ setName(who); window.FCReport.render(host, { result: result, state: 'live' }); }

  /* A completed session, then its result. Shared by own-view and admin view-as. */
  function loadReportFor(uid, onResult, onNone){
    FC.sb.from('keystone_sessions').select('id,completed_at')
      .eq('user_id', uid).eq('status','completed')
      .order('completed_at',{ascending:false}).limit(1).maybeSingle()
      .then(function(s){
        if(s.error || !s.data){ onNone(); return; }
        FC.sb.from('keystone_results').select('*').eq('session_id', s.data.id).maybeSingle()
          .then(function(r){
            if(r.error || !r.data){ onNone(); return; }
            var res = r.data;
            if(!res.completed_at) res.completed_at = s.data.completed_at;
            onResult(res);
          }, function(){ onNone(); });
      }, function(){ onNone(); });
  }

  /* 1) Marcus mock. The deterministic sample, shown as a named participant. */
  function showMarcus(){
    draw(window.FCReport.sampleResult(), 'Marcus Bennett');
    say('<b>Demonstration dashboard.</b> <span class="fine">This is exactly what a participant named Marcus sees the moment he finishes his profile, and every time he returns. Live participants see their own result in this same place.</span>');
  }

  /* 2) Admin view-as. Same component, the participant\u2019s data, read only. */
  function showViewAs(uid){
    loading('Loading this participant\u2019s report as they see it\u2026');
    var go = function(){
      loadReportFor(uid, function(res){
        FC.sb.from('profiles').select('name,email').eq('id', uid).maybeSingle()
          .then(function(p){ draw(res, (p.data && (p.data.name || p.data.email)) || 'Participant'); },
                function(){ draw(res, 'Participant'); });
        say('<b>Admin view.</b> <span class="fine">You are seeing this participant\u2019s dashboard exactly as they see it. Read only.</span>');
      }, empty);
    };
    if(!(window.FC && FC.live)){ denied(); return; }
    FC.ready.then(function(){
      if(window.FCR && FCR.guard){ FCR.guard(['admin']).then(function(ok){ ok ? go() : denied(); }, go); }
      else go();
    }, denied);
  }

  /* 3) The participant\u2019s own dashboard. */
  function showOwn(){
    if(!(window.FC && FC.live)){ showMarcus(); return; }   // no keys: demonstrate with Marcus
    loading();
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if(!uid){ empty(); return; }
      loadReportFor(uid, function(res){
        draw(res, '');
        if(done) say('<b>Your report is ready.</b> <span class="fine">It will live here from now on. Print it, email it to yourself, or come back any time.</span>');
      }, empty);
    }, empty);
  }

  if(demo)  return showMarcus();
  if(asUid) return showViewAs(asUid);
  return showOwn();
})();
