/* Participant page: the dashboard preview.

   This is deliberately NOT a mockup. It calls window.FCReport, the same component
   that renders report.html and the participant's own dashboard, so whatever a
   father sees is what shows here. Change the report and this changes with it.
   There is no second copy of the layout to keep in sync.

   Two states:
     default          the Marcus sample, so the page is useful before any search
     father selected  that father's real result, read only, exactly as he sees it

   participant.js dispatches 'fc:participant-selected' with {uid, name} when an
   admin opens a father. If that event never fires, this stays on the sample. */
(function(){
  var host = document.getElementById('pt-preview');
  if (!host || !window.FCReport) return;

  var titleEl = document.getElementById('pt-preview-title');
  var tagEl   = document.getElementById('pt-preview-tag');
  var noteEl  = document.getElementById('pt-preview-note');

  function live(){ return !!(window.FC && FC.live && FC.sb); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function head(title, tag, note){
    if (titleEl) titleEl.textContent = title;
    if (tagEl)   tagEl.textContent = tag;
    if (noteEl)  noteEl.innerHTML = note;
  }

  function draw(result){
    try { window.FCReport.render(host, { result: result, state: 'live' }); }
    catch(e){
      console.error('[participant-preview]', e);
      host.innerHTML = '<div class="notice brass" style="margin:0">The dashboard component failed to render. ' + esc(e.message || '') + '</div>';
    }
  }

  function showSample(){
    head('The participant dashboard', 'Sample participant',
      'This is the live dashboard component, not a picture of one. It renders from the same code a father sees, so it cannot fall out of date. Open a father above to see his in this same place.');
    draw(window.FCReport.sampleResult());
  }

  function loading(msg){
    host.innerHTML = '<div class="center" style="padding:50px 0"><p class="ash">' + esc(msg) + '</p></div>';
  }

  function noProfile(name){
    head('The participant dashboard', 'No profile yet',
      esc(name) + ' has not completed a profile yet, so there is nothing of his to show. The sample below is what his dashboard will look like once he finishes.');
    draw(window.FCReport.sampleResult());
  }

  /* A completed session, then its result. Same path the participant dashboard
     uses, so view-as and self-view can never diverge. */
  function loadFor(uid, onResult, onNone){
    FC.sb.from('keystone_sessions').select('id,completed_at')
      .eq('user_id', uid).eq('status','completed')
      .order('completed_at',{ascending:false}).limit(1).maybeSingle()
      .then(function(s){
        if (s.error || !s.data) { onNone(); return; }
        FC.sb.from('keystone_results').select('*').eq('session_id', s.data.id).maybeSingle()
          .then(function(r){
            if (r.error || !r.data) { onNone(); return; }
            var res = r.data;
            if (!res.completed_at) res.completed_at = s.data.completed_at;
            onResult(res);
          }, function(){ onNone(); });
      }, function(){ onNone(); });
  }

  function showFather(uid, name){
    if (!live()) { showSample(); return; }
    loading('Loading this father\u2019s dashboard as he sees it\u2026');
    loadFor(uid, function(res){
      head(esc(name), 'His dashboard, read only',
        'Exactly what ' + esc(name) + ' sees when he opens his dashboard. Read only, and rendered by the same component he uses. Private data; handle with care.');
      draw(res);
    }, function(){ noProfile(name); });
  }

  document.addEventListener('fc:participant-selected', function(e){
    var d = (e && e.detail) || {};
    if (d.uid) showFather(d.uid, d.name || 'This father');
  });

  function boot(){ showSample(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
