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
    // Drive the dashboard preview below, so an admin sees this father's own
    // dashboard rendered by the same component he uses.
    document.dispatchEvent(new CustomEvent('fc:participant-selected', { detail: { uid: uid, name: name } }));
    var box = el('pt-detail');
    box.style.display='';
    box.innerHTML = '<h3 style="margin-bottom:6px">'+esc(name)+'</h3><p class="fine" style="margin-bottom:16px">Individual snapshot. Handle with care; this is a man\u2019s private data.</p><p class="fine" id="pt-loading">Loading\u2026</p>';
    box.scrollIntoView({behavior:'smooth'});

    // The Keystone Profile, rendered the way the man himself sees it.
    var pSession = FC.sb.from('keystone_sessions').select('id,completed_at').eq('user_id',uid).eq('status','completed').order('completed_at',{ascending:false}).limit(1);
    var pBaseline = FC.sb.from('baselines').select('*').eq('user_id',uid).order('taken_at',{ascending:false}).limit(1);
    // Certificate enrollments + awards.
    var pEnroll = FC.sb.from('certificate_enrollments').select('id,status,claim_id,course_id').eq('user_id',uid);
    var pAward  = FC.sb.from('certificate_awards').select('status,course_id,envelope_id').eq('user_id',uid);
    // Activity counts (best effort; tables may not exist yet).
    var pCircle = FC.sb.from('circle_posts').select('id',{count:'exact',head:true}).eq('user_id',uid);
    var pCourses= FC.sb.from('certificate_courses').select('id,title');

    function pretty(k){ if(!k) return '\u2014'; return String(k).replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }
    function pbar(label,pct,accent){
      var v = (pct==null||isNaN(pct)) ? 0 : pct;
      return '<div class="rail-bar"><div class="row between"><span class="fine"'+(accent?' style="color:'+accent+'"':'')+'>'+esc(label)+'</span><span class="fine mono">'+v+'</span></div>'+
        '<div class="rail-track"><span style="width:'+v+'%'+(accent?';background:'+accent:'')+'"></span></div></div>';
    }

    Promise.all([pSession,pBaseline,pEnroll,pAward,pCircle,pCourses].map(function(pr){return pr.then(function(r){return r;},function(e2){return {error:e2};});}))
    .then(function(res){
      var sesRes=res[0], baseRes=res[1], enrRes=res[2], awRes=res[3], cRes=res[4], coRes=res[5];
      var ses = (sesRes.data||[])[0];
      var pResult = ses
        ? FC.sb.from('keystone_results').select('overall_pct,scale_scores,strength_scale,gap_scale').eq('session_id',ses.id).maybeSingle().then(function(r){return r;},function(e2){return {error:e2};})
        : Promise.resolve({data:null});

      pResult.then(function(rr){
        var courses={}; (coRes.data||[]).forEach(function(c){courses[c.id]=c.title;});
        var html='';

        // The Profile
        html += '<div class="eyebrow" style="margin:0 0 12px">THE KEYSTONE PROFILE</div>';
        var kr = rr && rr.data;
        if(kr && kr.scale_scores){
          var sc = kr.scale_scores;
          html += '<p class="fine" style="margin-bottom:14px">Taken '+(ses && ses.completed_at ? new Date(ses.completed_at).toLocaleDateString() : '')+'. This is his profile as he sees it.</p>';
          html += '<div class="row between" style="align-items:baseline;max-width:520px;margin-bottom:14px"><span class="d-36">'+esc(kr.overall_pct!=null?kr.overall_pct:'0')+'</span><span class="fine">overall, of 100</span></div>';
          html += '<div style="max-width:520px;margin-bottom:18px">';
          ['involvement','consistency','awareness','nurturance'].forEach(function(k){
            html += pbar(pretty(k), sc[k]&&sc[k].pct, null);
          });
          html += '</div>';
          html += '<div class="row wrap" style="gap:10px;margin-bottom:20px">'+
            '<span class="chip" style="border-color:var(--pine-hi)">STRENGTH \u00b7 '+esc(pretty(kr.strength_scale))+'</span>'+
            '<span class="chip" style="border-color:var(--ember)">GROWTH FOCUS \u00b7 '+esc(pretty(kr.gap_scale))+'</span></div>';
          var keys = Object.keys(sc).filter(function(k){return sc[k] && sc[k].pct!=null;});
          keys.sort(function(a,b){return (sc[b].pct||0)-(sc[a].pct||0);});
          if(keys.length>4){
            html += '<div class="eyebrow" style="margin:6px 0 12px">ALL '+keys.length+' DIMENSIONS</div>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 26px;max-width:760px;margin-bottom:22px">';
            keys.forEach(function(k){
              var accent = k===kr.gap_scale ? 'var(--ember)' : (k===kr.strength_scale ? 'var(--pine-hi)' : null);
              html += pbar(pretty(k), sc[k].pct, accent);
            });
            html += '</div>';
          }
        } else {
          var b = (baseRes.data||[])[0];
          if(kr===null && ses){ html += '<div class="notice brass" style="margin:0 0 20px">Profile scores unavailable for this snapshot.</div>'; }
          if(b){
            html += '<div style="max-width:520px;margin-bottom:14px">'+
              '<div class="row between" style="align-items:baseline;margin-bottom:12px"><span class="d-36">'+esc(b.overall!=null?b.overall:'0')+'</span><span class="fine">overall, of 100</span></div>'+
              pbar('Involvement', b.involvement, null)+pbar('Consistency', b.consistency, null)+pbar('Awareness', b.awareness, null)+pbar('Nurturance', b.nurturance, null)+
              '</div><div class="row wrap" style="gap:10px;margin-bottom:20px"><span class="chip" style="border-color:var(--ember)">GROWTH FOCUS \u00b7 '+esc(pretty(b.gap_domain))+'</span></div>';
          } else {
            html += '<p class="fine" style="margin-bottom:20px">No Profile taken yet.</p>';
          }
        }

      // Certificates
      html += '<div class="eyebrow" style="margin:8px 0 12px">CERTIFICATES</div>';
      var enrRaw = enrRes.data||[], aw = awRes.data||[];
      var awByCourse={}; aw.forEach(function(a){awByCourse[a.course_id]=a;});
      // One row per course: prefer an active enrollment, then any; include award-only courses.
      var byCourse={};
      enrRaw.forEach(function(e2){
        var cur=byCourse[e2.course_id];
        if(!cur || (e2.status==='active' && cur.status!=='active')) byCourse[e2.course_id]=e2;
      });
      aw.forEach(function(a){ if(!byCourse[a.course_id]) byCourse[a.course_id]={course_id:a.course_id,status:null}; });
      var enr = Object.keys(byCourse).map(function(k){return byCourse[k];});
      if(enrRes.error){ html += '<div class="notice brass" style="margin:0 0 20px">'+esc(enrRes.error.message)+'</div>'; }
      else if(!enr.length){ html += '<p class="fine" style="margin-bottom:20px">No certificate enrollments.</p>'; }
      else {
        html += '<table class="dtable" style="margin-bottom:20px"><thead><tr><th>Certificate</th><th>Enrollment</th><th>Award</th><th>Signed</th></tr></thead><tbody>'+
          enr.map(function(e2){
            var a=awByCourse[e2.course_id]||{};
            return '<tr><td>'+esc(courses[e2.course_id]||('Course '+String(e2.course_id).slice(0,8)+' (removed)'))+'</td><td><span class="chip">'+esc(e2.status||'\u2014')+'</span></td>'+
              '<td><span class="chip">'+esc(a.status||'\u2014')+'</span></td>'+
              '<td class="fine">'+(a.envelope_id?'yes':'no')+'</td></tr>';
          }).join('')+'</tbody></table>';
      }

      // Activity
      html += '<div class="eyebrow" style="margin:8px 0 12px">ACTIVITY</div><div class="glance">'+
        metric('CIRCLE', (cRes.count!=null?cRes.count:'\u2014'),'posts')+
      '</div>';

      box.innerHTML = '<h3 style="margin-bottom:6px">'+esc(name)+'</h3><p class="fine" style="margin-bottom:20px">Individual snapshot. Handle with care; this is a man\u2019s private data.</p>' + html;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
