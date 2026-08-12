/* Facilitator Desk: weekly plan, announcements, roster, participant claims. */
(function(){
  var demo=!(window.FC&&FC.live); var circleId=null;
  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function boot(){
    if(demo){ el('demo-note').style.display=''; el('app').style.display='';
      el('lead-thisweek').innerHTML='<p class="fine">Live Circle loads with Supabase keys.</p>'; return; }
    FCR.guard(['circle_leader','admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display=''; loadCircles(); progressStrip();
    });
  }
  function loadCircles(){
    // circles where I am a leader
    FC.sb.from('circle_members').select('circle_id, role, circles(id,name)').eq('role','leader').then(function(r){
      var rows=(r.data||[]).filter(function(x){return x.circles;});
      if(!rows.length){el('circle-picker').innerHTML='<p class="fine">You are not leading any Circle yet. An admin assigns Circle leadership.</p>';return;}
      el('circle-picker').innerHTML=rows.map(function(x,i){return '<button class="chip'+(i===0?' selected':'')+'" data-c="'+x.circles.id+'">'+esc(x.circles.name)+'</button>';}).join('');
      el('circle-picker').querySelectorAll('[data-c]').forEach(function(b){b.addEventListener('click',function(){
        el('circle-picker').querySelectorAll('.chip').forEach(function(x){x.classList.remove('selected');});b.classList.add('selected');
        select(b.dataset.c);
      });});
      select(rows[0].circles.id);
    });
  }
  function select(id){ circleId=id; thisWeek(); weeks(); announcements(); roster(); claims(); progressStrip(); }

  function thisWeek(){
    FC.sb.from('circle_weeks').select('*').eq('circle_id',circleId).order('week',{ascending:false}).limit(1).then(function(r){
      var w=(r.data||[])[0];
      if(!w){el('lead-thisweek').innerHTML='<div class="card"><p class="fine">No weeks planned. Add one under Plan weeks.</p></div>';return;}
      el('lead-thisweek').innerHTML='<div class="card"><div class="eyebrow" style="margin-bottom:10px">WEEK '+w.week+'</div>'+
        (w.class_slug?'<p class="small">Film: '+esc(w.class_slug)+' · lesson '+(w.lesson_num||1)+'</p>':'')+
        (w.question?'<p class="quote" style="font-size:20px;margin:12px 0">"'+esc(w.question)+'"</p>':'')+
        (w.action?'<div class="actionrow"><span class="checkmark">→</span><div class="txt">'+esc(w.action)+'</div></div>':'')+
        (w.meets_on?'<p class="fine" style="margin-top:12px">Meets '+w.meets_on+'</p>':'')+'</div>';
    });
  }
  function weeks(){
    FC.sb.from('circle_weeks').select('*').eq('circle_id',circleId).order('week').then(function(r){
      var box=el('cw-list'); var rows=r.data||[];
      box.innerHTML=rows.length?('<table class="dtable"><thead><tr><th>Week</th><th>Film</th><th>Question</th><th></th></tr></thead><tbody>'+
        rows.map(function(w){return '<tr><td class="mono">'+w.week+'</td><td class="fine">'+esc(w.class_slug||'—')+'</td><td class="fine">'+esc((w.question||'').slice(0,48))+'</td><td><button class="btn btn-secondary mini" data-wdel="'+w.id+'">Delete</button></td></tr>';}).join('')+'</tbody></table>'):'<p class="fine">No weeks yet.</p>';
      box.querySelectorAll('[data-wdel]').forEach(function(b){b.addEventListener('click',function(){FC.sb.from('circle_weeks').delete().eq('id',b.dataset.wdel).then(weeks);});});
    });
  }
  function saveWeek(){
    if(!circleId){toast('Pick a Circle.');return;}
    var body={circle_id:circleId,week:parseInt(el('cw-week').value,10)||1,class_slug:el('cw-class').value||null,lesson_num:parseInt(el('cw-lesson').value,10)||null,question:el('cw-q').value||null,action:el('cw-action').value||null,meets_on:el('cw-date').value||null};
    FC.sb.from('circle_weeks').insert(body).then(function(r){
      if(r.error){toast('Failed: '+r.error.message);return;} toast('Week saved.');weeks();thisWeek();
    });
  }
  function announcements(){
    FC.sb.from('circle_announcements').select('*').eq('circle_id',circleId).order('created_at',{ascending:false}).then(function(r){
      var box=el('ann-list'); var rows=r.data||[];
      box.innerHTML=rows.length?rows.map(function(a){return '<div class="card" style="margin-bottom:10px"><p class="small">'+esc(a.body)+'</p><p class="fine" style="margin-top:6px">'+new Date(a.created_at).toLocaleString()+'</p></div>';}).join(''):'<p class="fine">No announcements yet.</p>';
    });
  }
  function announce(){
    if(!circleId){toast('Pick a Circle.');return;}
    var body=el('ann-body').value.trim(); if(!body){toast('Write something.');return;}
    FC.sb.from('circle_announcements').insert({circle_id:circleId,author_id:FC.uid(),body:body}).then(function(r){
      if(r.error){toast('Failed: '+r.error.message);return;} el('ann-body').value='';toast('Posted to your Circle.');announcements();
    });
  }
  function roster(){
    FC.sb.from('circle_members').select('user_id, role, profiles(name,email)').eq('circle_id',circleId).then(function(r){
      var rows=r.data||[];
      el('lead-roster').innerHTML=rows.length?('<table class="dtable"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>'+
        rows.map(function(m){return '<tr><td>'+esc(m.profiles&&m.profiles.name||'—')+'</td><td class="fine">'+esc(m.profiles&&m.profiles.email||'')+'</td><td class="fine">'+m.role+'</td></tr>';}).join('')+'</tbody></table>'):'<p class="fine">No members yet.</p>';
    });
  }
  // ---- Claims: the gate on course enrollment (POSITIONING 3 / v4.0) ----
  function claims(){
    var box=el('claim-list'); if(!box) return;
    FC.sb.from('participant_claims').select('id,participant_email,status,created_at')
      .eq('facilitator_user_id',FC.uid()).eq('status','active').order('created_at',{ascending:false})
      .then(function(r){
        if(r.error){ box.innerHTML='<p class="fine">Claims load with the v4.0 migration applied.</p>'; return; }
        var rows=r.data||[];
        box.innerHTML=rows.length?('<table class="dtable"><thead><tr><th>Email</th><th>Claimed</th><th></th></tr></thead><tbody>'+
          rows.map(function(c){return '<tr><td class="fine">'+esc(c.participant_email)+'</td><td class="fine">'+new Date(c.created_at).toLocaleDateString()+'</td><td><button class="btn btn-secondary mini" data-crel="'+c.id+'">Release</button></td></tr>';}).join('')+'</tbody></table>')
          :'<p class="fine">No active claims yet. Claim a man above and he can enroll.</p>';
        box.querySelectorAll('[data-crel]').forEach(function(b){b.addEventListener('click',function(){
          FC.sb.from('participant_claims').update({status:'released'}).eq('id',b.dataset.crel).then(claims);
        });});
      });
  }
  function addClaim(){
    var em=(el('claim-email').value||'').trim().toLowerCase();
    var msg=el('claim-msg');
    if(!em || em.indexOf('@')<0){ if(msg){msg.textContent='Enter the email he signs in with.';msg.className='fine cpn-err';} return; }
    var row={facilitator_user_id:FC.uid(), participant_email:em, status:'active'};
    if(circleId) row.circle_id=circleId;
    FC.sb.from('participant_claims').insert(row).then(function(r){
      if(r.error){ if(msg){msg.textContent='Failed: '+r.error.message;msg.className='fine cpn-err';} return; }
      if(msg){msg.textContent='Claimed. He can enroll now, at no cost.';msg.className='fine cpn-ok';}
      el('claim-email').value=''; claims();
    });
  }


  // ---- Progress strip: claim-scoped telemetry only. Never answers or scores.
  function progressStrip(){
    var box = el('lead-progress'); if(!box) return;
    box.innerHTML = '<p class="fine">Loading progress\u2026</p>';
    FC.sb.rpc('facilitator_participant_progress').then(function(r){
      if(r.error){
        box.innerHTML = '<p class="fine">Progress loads once the facilitator progress function is live.</p>';
        return;
      }
      var rows = r.data || [];
      var watched = rows.filter(function(x){ return (x.sessions_completed||0) > 0; }).length;
      var menEl = document.querySelector('[data-glance="lead-men"]');
      var watchEl = document.querySelector('[data-glance="lead-watched"]');
      if(menEl) menEl.textContent = String(rows.length);
      if(watchEl) watchEl.textContent = String(watched);
      if(!rows.length){
        box.innerHTML = '<p class="fine">No active claims yet. Claim a man above; his Profile and session progress show here (never his answers or scores).</p>';
        return;
      }
      box.innerHTML = '<table class="dtable"><thead><tr>'+
        '<th>Name</th><th>Email</th><th>Profile</th><th>Sessions</th><th>Checkpoints</th><th>Time</th><th>Course state</th><th>Cert</th>'+
        '</tr></thead><tbody>'+
        rows.map(function(x){
          var mins = Math.round((x.seconds_logged||0)/60);
          var cert = x.cert_serial ? esc(x.cert_serial) : (x.enroll_state||'claimed');
          return '<tr>'+
            '<td>'+esc(x.participant_name||'\u2014')+'</td>'+
            '<td class="fine">'+esc(x.participant_email||'')+'</td>'+
            '<td>'+(x.profile_complete?'Yes':'No')+'</td>'+
            '<td class="mono">'+(x.sessions_completed||0)+'</td>'+
            '<td class="mono">'+(x.checkpoints_passed||0)+'</td>'+
            '<td class="fine">'+(mins? (mins+' min') : '\u2014')+'</td>'+
            '<td class="fine">'+esc(x.course_title? (x.course_title+' \u00b7 '+(x.enroll_state||'')) : (x.enroll_state||'claimed'))+'</td>'+
            '<td class="fine">'+cert+'</td>'+
            '</tr>';
        }).join('')+
        '</tbody></table>'+
        '<p class="fine" style="margin-top:12px">You never see a man\u2019s answers or scores. This strip is enough to know who needs a nudge.</p>';
    });
  }

  // ---- Verification sheet: one CSV for the coordinator who requires proof.
  // Reads only what this facilitator's active claims cover (RLS: roster
  // verification migration). Never includes org identity; the public verify
  // page never names the organization by design.
  function csvCell(v){ v = (v === null || v === undefined) ? '' : String(v); return '"' + v.replace(/"/g,'""') + '"'; }
  function exportRoster(){
    var msg = el('lead-export-msg');
    function fail(t){ if(msg){ msg.textContent = t; msg.className = 'fine cpn-err'; } }
    if(msg){ msg.textContent = 'Building your sheet\u2026'; msg.className = 'fine'; }
    FC.sb.from('participant_claims').select('participant_email')
      .eq('facilitator_user_id', FC.uid()).eq('status','active')
      .then(function(cr){
        if(cr.error){ fail('The verification sheet loads with the roster migration applied.'); return; }
        var emails = (cr.data || []).map(function(c){ return (c.participant_email || '').toLowerCase(); }).filter(Boolean);
        if(!emails.length){ fail('No active claims yet. Claim a man above; his certificate joins this sheet.'); return; }
        FC.sb.from('profiles').select('id,name,full_name,email').in('email', emails).then(function(pr){
          if(pr.error){ fail('The verification sheet loads with the roster migration applied.'); return; }
          var profs = pr.data || [];
          var byId = {}; profs.forEach(function(p){ byId[p.id] = p; });
          var ids = profs.map(function(p){ return p.id; });
          FC.sb.from('certificate_courses').select('id,title').then(function(kr){
            var titles = {}; ((kr && kr.data) || []).forEach(function(k){ titles[k.id] = k.title; });
            var enrQ = ids.length ? FC.sb.from('certificate_enrollments').select('id,user_id,course_id,state').in('user_id', ids)
                                   : Promise.resolve({ data: [] });
            enrQ.then(function(er){
              if(er && er.error){ fail('Could not load enrollments for the sheet.'); return; }
              var enrolls = (er && er.data) || [];
              var enrById = {}; enrolls.forEach(function(e){ enrById[e.id] = e; });
              var enrIds = enrolls.map(function(e){ return e.id; });
              var certQ = enrIds.length ? FC.sb.from('certificates').select('*').in('enrollment_id', enrIds)
                                         : Promise.resolve({ data: [] });
            certQ.then(function(xr){
              if(xr && xr.error){ fail('Could not load certificates for the sheet.'); return; }
              var certs = (xr && xr.data) || [];
              var head = ['Name','Email','Course','Serial','Status','Issued','Verify at'];
              var verify = location.origin + '/verify.html';
              var rows = [head.map(csvCell).join(',')];
              var seen = {};
              certs.forEach(function(c){
                var e = enrById[c.enrollment_id] || {};
                var p = byId[e.user_id] || {};
                seen[(p.email || '').toLowerCase()] = true;
                rows.push([
                  p.name || '',
                  p.email || '',
                  c.course_title || titles[e.course_id] || '',
                  c.serial || '',
                  c.revoked ? 'revoked' : 'issued',
                  (c.issued_at || '').slice(0, 10),
                  verify
                ].map(csvCell).join(','));
              });
              emails.forEach(function(em){
                if(seen[em]) return;
                var p = null;
                profs.forEach(function(q){ if((q.email || '').toLowerCase() === em) p = q; });
                rows.push([
                  (p && (p.full_name || p.name)) || '',
                  em, '', '', 'in progress', '', verify
                ].map(csvCell).join(','));
              });
              var stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              var blob = new Blob([rows.join('\r\n') + '\r\n'], { type: 'text/csv' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'verification-sheet-' + stamp + '.csv';
              document.body.appendChild(a); a.click();
              setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
              if(msg){ msg.textContent = 'Downloaded. ' + (rows.length - 1) + ' men on the sheet.'; msg.className = 'fine cpn-ok'; }
            });
            });
          });
        });
      });
  }

  document.addEventListener('DOMContentLoaded',function(){
    boot();
    var a=el('cw-go'); if(a) a.addEventListener('click',saveWeek);
    var b=el('ann-go'); if(b) b.addEventListener('click',announce);
    var c=el('claim-add'); if(c) c.addEventListener('click',addClaim);
    var d=el('lead-export'); if(d) d.addEventListener('click',exportRoster);
  });
})();
