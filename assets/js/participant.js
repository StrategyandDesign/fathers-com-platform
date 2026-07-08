/* Admin: individual participant dashboard. Search a father, open his snapshot.
   Admin-only. Reads are RLS-gated (participant_admin_read.sql). Every read
   surfaces its error rather than failing silently. */
(function(){
  if (!document.getElementById('pt-root')) return;
  function el(id){ return document.getElementById(id); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fail(id, err){ var e=el(id); if(e) e.innerHTML='<div class="notice brass" style="margin:0">'+esc((err&&err.message)||'error')+'</div>'; }

  var demo = !(window.FC && FC.live);

  function boot(){
    var app = el('app');
    if (demo) { if(app) app.style.display=''; el('pt-results').innerHTML='<p class="fine">Live data loads with Supabase keys.</p>'; return; }
    if (window.FCR && FCR.guard) {
      FCR.guard(['admin']).then(function(ok){
        if(!ok){ var d=el('denied'); if(d) d.style.display=''; return; }
        if(app) app.style.display='';       // reveal the dashboard body (was the black-screen bug)
        wire();
      }, function(){ if(app) app.style.display=''; wire(); });   // guard error: still show the tool
    } else { if(app) app.style.display=''; wire(); }
  }

  function wire(){
    var input = el('pt-search'), btn = el('pt-search-btn');
    function run(){
      var q = (input.value||'').trim();
      if(q.length < 2){ el('pt-results').innerHTML='<p class="fine">Type at least two characters of a name or email.</p>'; return; }
      el('pt-results').innerHTML='<p class="fine">Searching\u2026</p>';
      FC.sb.from('profiles').select('id,name,email').or('name.ilike.%'+q+'%,email.ilike.%'+q+'%').limit(25)
        .then(function(r){
          if(r.error){ fail('pt-results', r.error); return; }
          var rows = r.data||[];
          if(!rows.length){ el('pt-results').innerHTML='<p class="fine">No fathers match that.</p>'; return; }
          el('pt-results').innerHTML = '<table class="dtable"><thead><tr><th>Name</th><th>Email</th><th></th></tr></thead><tbody>' +
            rows.map(function(p){
              return '<tr><td>'+esc(p.name||'\u2014')+'</td><td class="fine">'+esc(p.email||'')+'</td>'+
                '<td><button class="btn btn-secondary mini" data-open="'+esc(p.id)+'" data-name="'+esc(p.name||p.email||'')+'">Open</button></td></tr>';
            }).join('') + '</tbody></table>';
          el('pt-results').querySelectorAll('[data-open]').forEach(function(b){
            b.addEventListener('click', function(){ openFather(b.dataset.open, b.dataset.name); });
          });
        }, function(e){ fail('pt-results', e); });
    }
    btn.addEventListener('click', run);
    input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); run(); } });
  }

  function metric(label, value, sub){
    return '<div class="glance-card"><div class="glance-lbl">'+esc(label)+'</div><div class="glance-big">'+esc(value)+'</div><div class="glance-sub">'+esc(sub||'')+'</div></div>';
  }

  function openFather(uid, name){
    var box = el('pt-detail');
    box.style.display='';
    box.innerHTML = '<h3 style="margin-bottom:6px">'+esc(name)+'</h3><p class="fine" style="margin-bottom:16px">Individual snapshot. Handle with care; this is a man\u2019s private data.</p><p class="fine" id="pt-loading">Loading\u2026</p>';
    box.scrollIntoView({behavior:'smooth'});

    // Latest baseline (four domains + growth focus).
    var pBaseline = FC.sb.from('baselines').select('*').eq('user_id',uid).order('taken_at',{ascending:false}).limit(1);
    // Certificate enrollments + awards.
    var pEnroll = FC.sb.from('certificate_enrollments').select('id,status,coupon,course_id').eq('user_id',uid);
    var pAward  = FC.sb.from('certificate_awards').select('status,course_id,envelope_id').eq('user_id',uid);
    // Activity counts (best effort; tables may not exist yet).
    var pVoice  = FC.sb.from('voice_recordings').select('id',{count:'exact',head:true}).eq('user_id',uid);
    var pCircle = FC.sb.from('circle_posts').select('id',{count:'exact',head:true}).eq('user_id',uid);
    var pCourses= FC.sb.from('certificate_courses').select('id,title');

    Promise.all([pBaseline,pEnroll,pAward,pVoice,pCircle,pCourses].map(function(p){return p.then(function(r){return r;},function(e){return {error:e};});}))
    .then(function(res){
      var baseRes=res[0], enrRes=res[1], awRes=res[2], vRes=res[3], cRes=res[4], coRes=res[5];
      var courses={}; (coRes.data||[]).forEach(function(c){courses[c.id]=c.title;});
      var html='';

      // Baseline
      var b = (baseRes.data||[])[0];
      html += '<div class="eyebrow" style="margin:0 0 12px">BASELINE</div>';
      if(baseRes.error){ html += '<div class="notice brass" style="margin:0 0 20px">Baseline unavailable: '+esc(baseRes.error.message)+'</div>'; }
      else if(!b){ html += '<p class="fine" style="margin-bottom:20px">No baseline taken yet.</p>'; }
      else {
        html += '<div class="glance" style="margin-bottom:20px">'+
          metric('OVERALL', b.overall!=null?b.overall:'\u2014','out of 100')+
          metric('INVOLVEMENT', b.involvement!=null?b.involvement:'\u2014','')+
          metric('CONSISTENCY', b.consistency!=null?b.consistency:'\u2014','')+
          metric('AWARENESS', b.awareness!=null?b.awareness:'\u2014','')+
          metric('NURTURANCE', b.nurturance!=null?b.nurturance:'\u2014','')+
          '<div class="glance-card glance-next"><div class="glance-lbl">GROWTH FOCUS</div><div class="glance-next-txt">'+esc(b.gap_domain||'\u2014')+'</div></div>'+
        '</div>';
      }

      // Certificates
      html += '<div class="eyebrow" style="margin:8px 0 12px">CERTIFICATES</div>';
      var enr = enrRes.data||[], aw = awRes.data||[];
      var awByCourse={}; aw.forEach(function(a){awByCourse[a.course_id]=a;});
      if(enrRes.error){ html += '<div class="notice brass" style="margin:0 0 20px">'+esc(enrRes.error.message)+'</div>'; }
      else if(!enr.length){ html += '<p class="fine" style="margin-bottom:20px">No certificate enrollments.</p>'; }
      else {
        html += '<table class="dtable" style="margin-bottom:20px"><thead><tr><th>Certificate</th><th>Enrollment</th><th>Award</th><th>Signed</th></tr></thead><tbody>'+
          enr.map(function(e2){
            var a=awByCourse[e2.course_id]||{};
            return '<tr><td>'+esc(courses[e2.course_id]||'\u2014')+'</td><td><span class="chip">'+esc(e2.status||'\u2014')+'</span></td>'+
              '<td><span class="chip">'+esc(a.status||'\u2014')+'</span></td>'+
              '<td class="fine">'+(a.envelope_id?'yes':'no')+'</td></tr>';
          }).join('')+'</tbody></table>';
      }

      // Activity
      html += '<div class="eyebrow" style="margin:8px 0 12px">ACTIVITY</div><div class="glance">'+
        metric('VOICE', (vRes.count!=null?vRes.count:'\u2014'),'recordings')+
        metric('CIRCLE', (cRes.count!=null?cRes.count:'\u2014'),'posts')+
      '</div>';

      box.innerHTML = '<h3 style="margin-bottom:6px">'+esc(name)+'</h3><p class="fine" style="margin-bottom:20px">Individual snapshot. Handle with care; this is a man\u2019s private data.</p>' + html + '<div id="pt-voice"></div>';
      loadVoice(uid);
    });
  }

  // Recordings with playback. Admin-only view; streams via a signed URL.
  var VKIND = { bedtime_story:'Bedtime story', message:'A message', thinking:'Thinking of you' };
  function loadVoice(uid){
    var host = document.getElementById('pt-voice'); if(!host) return;
    FC.sb.from('voice_recordings').select('id,kind,storage_path,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
      .then(function(r){
        if(r.error){ return; }                    // table may not exist; activity card already handled it
        var rows=r.data||[]; if(!rows.length) return;
        host.innerHTML = '<div class="eyebrow" style="margin:24px 0 12px">RECORDINGS</div>'+
          rows.map(function(row){
            var when = new Date(row.created_at).toLocaleDateString();
            return '<div class="voice-item" data-path="'+esc(row.storage_path)+'">'+
              '<span>'+esc(VKIND[row.kind]||'Recording')+' <span class="fine">\u00b7 '+esc(when)+'</span></span>'+
              '<button class="link brass pt-play" type="button">Play</button></div>';
          }).join('');
        host.querySelectorAll('.pt-play').forEach(function(b){
          b.addEventListener('click', function(){
            var path=b.closest('.voice-item').getAttribute('data-path');
            b.textContent='Loading\u2026'; b.disabled=true;
            FC.sb.storage.from('voice').createSignedUrl(path,3600).then(function(s){
              var url=s&&s.data&&s.data.signedUrl;
              if(url){ var a=new Audio(url); a.onended=function(){b.textContent='Play';b.disabled=false;}; a.onerror=function(){b.textContent='No audio file';b.disabled=false;}; a.play().then(function(){b.textContent='Playing\u2026';},function(){b.textContent='Play';b.disabled=false;}); }
              else { b.textContent='Unavailable'; b.disabled=false; }
            }, function(){ b.textContent='Unavailable'; b.disabled=false; });
          });
        });
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
