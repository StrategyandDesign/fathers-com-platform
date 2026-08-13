/* Facilitator Desk: one board of claimed men and this week's film.
   Progress flags only. Never answers, scores, or practice log text. */
(function(){
  var demo=!(window.FC&&FC.live);
  var circleId=null;
  var liveCohort=false;
  var weekIndex=0;
  var lastProgress=[];
  var lastClaims=[];

  var FILMS=[
    'The Body You Bring Home',
    'Home Is Not There',
    'Plan Around the Wave',
    'Few Promises, Kept',
    'The Child Who Grew',
    'Ask Before You Assume',
    'Small Deposits',
    'Frequency Beats Intensity',
    'When It Breaks',
    'Repair Without Pride',
    'Reunion Day',
    'The Season of Return'
  ];
  var COURSE_SLUG='reentry';

  var DEMO_ROWS=[
    {participant_name:'James Whitaker',participant_email:'james.whitaker@example.com',film_yn:true,check_yn:true,practice_yn:false,sessions_completed:1,checkpoints_passed:1,practices_completed:0,cert_serial:'FC-2026-104221'},
    {participant_name:'Marcus Hale',participant_email:'marcus.hale@example.com',film_yn:true,check_yn:false,practice_yn:false,sessions_completed:1,checkpoints_passed:0,practices_completed:0,cert_serial:''},
    {participant_name:'Andre Cole',participant_email:'andre.cole@example.com',film_yn:false,check_yn:false,practice_yn:false,sessions_completed:0,checkpoints_passed:0,practices_completed:0,cert_serial:''}
  ];

  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function filmTitle(i){ i=Math.max(0,Math.min(FILMS.length-1,i|0)); return FILMS[i]; }
  function setGlance(key, value){
    var n=document.querySelector('[data-glance="'+key+'"]');
    if(n && value!=null) n.textContent=value;
  }
  function setConsiderHtml(html){
    var n=document.querySelector('[data-glance="lead-next"]');
    if(n) n.innerHTML=html;
  }
  function setFilmGlance(title){
    setGlance('lead-next-meet', title||'—');
  }

  function boot(){
    renderWeekChips();
    fillFilmSelect();
    if(demo){ bootDemo(); return; }
    FCR.load().then(function(){
      var ok=FCR.isAdmin() || FCR.has('circle_leader');
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display='';
      loadSerialChip();
      loadCircles();
      claims();
      progressStrip();
    });
  }

  function bootDemo(){
    el('demo-note').style.display='';
    el('app').style.display='';
    lastProgress=DEMO_ROWS;
    lastClaims=DEMO_ROWS.map(function(r,i){
      return {id:'demo-'+i, participant_email:r.participant_email, created_at:new Date().toISOString()};
    });
    setGlance('lead-men','3');
    setGlance('lead-watched','2');
    setFilmGlance(filmTitle(weekIndex));
    updateSeatChip(3);
    var serial=el('lead-serial-chip');
    if(serial){ serial.textContent='NCF-F-2026-0142 → verify'; serial.href='verify.html'; }
    renderBoard(DEMO_ROWS,{perSession:true});
    renderClaimList(lastClaims,true);
    considerNext(DEMO_ROWS,{perSession:true});
  }

  function renderWeekChips(){
    var box=el('lead-week-chips'); if(!box) return;
    box.innerHTML=FILMS.map(function(t,i){
      return '<button type="button" class="chip'+(i===weekIndex?' selected':'')+'" data-week="'+i+'">'+esc(t)+'</button>';
    }).join('');
    box.querySelectorAll('[data-week]').forEach(function(b){
      b.addEventListener('click',function(){
        weekIndex=parseInt(b.getAttribute('data-week'),10)||0;
        box.querySelectorAll('.chip').forEach(function(x){x.classList.remove('selected');});
        b.classList.add('selected');
        setFilmGlance(filmTitle(weekIndex));
        var filmSel=el('cw-film'); if(filmSel) filmSel.value=String(weekIndex);
        var weekInp=el('cw-week'); if(weekInp) weekInp.value=String(weekIndex+1);
        renderBoard(lastProgress.length?lastProgress:(demo?DEMO_ROWS:[]), {perSession:demo});
        considerNext(lastProgress.length?lastProgress:(demo?DEMO_ROWS:[]), {perSession:demo});
      });
    });
    setFilmGlance(filmTitle(weekIndex));
  }

  function fillFilmSelect(){
    var sel=el('cw-film'); if(!sel) return;
    sel.innerHTML=FILMS.map(function(t,i){
      return '<option value="'+i+'"'+(i===weekIndex?' selected':'')+'>'+esc(t)+'</option>';
    }).join('');
  }

  function updateSeatChip(n){
    var chip=el('lead-seat-chip');
    if(!chip) return;
    var count=(n==null)?'':(' · '+n+' claimed');
    chip.textContent='Seating for Returning Home'+count;
  }

  function loadSerialChip(){
    var chip=el('lead-serial-chip'); if(!chip) return;
    FC.sb.from('facilitator_credentials').select('serial,status').eq('user_id',FC.uid()).limit(1).then(function(r){
      var row=(r.data||[])[0];
      if(!row || !row.serial){ chip.textContent='Serial → verify'; chip.href='verify.html'; return; }
      chip.textContent=row.serial+' → verify';
      chip.href='verify.html';
      chip.title='Public registry. Organization name is never shown there.';
    });
  }

  function showLive(on){
    liveCohort=!!on;
    var box=el('lead-live');
    if(box) box.classList.toggle('is-live', liveCohort);
  }

  function loadCircles(){
    FC.sb.from('circle_members').select('circle_id, role, circles(id,name,meet_dow,meet_time)').eq('role','leader').then(function(r){
      var rows=(r.data||[]).filter(function(x){return x.circles;});
      var live=rows.filter(function(x){
        var c=x.circles||{};
        return c.meet_dow!=null || c.meet_time;
      });
      if(!live.length){
        showLive(false);
        return;
      }
      showLive(true);
      el('circle-picker').innerHTML=live.map(function(x,i){
        return '<button class="chip'+(i===0?' selected':'')+'" data-c="'+x.circles.id+'">'+esc(x.circles.name)+'</button>';
      }).join('');
      el('circle-picker').querySelectorAll('[data-c]').forEach(function(b){b.addEventListener('click',function(){
        el('circle-picker').querySelectorAll('.chip').forEach(function(x){x.classList.remove('selected');});
        b.classList.add('selected');
        select(b.dataset.c);
      });});
      select(live[0].circles.id);
    });
  }

  function select(id){
    circleId=id;
    thisWeekFromCircle();
    weeks();
    announcements();
    roster();
    claims();
    progressStrip();
  }

  function thisWeekFromCircle(){
    if(!circleId || !liveCohort) return;
    FC.sb.from('circle_weeks').select('*').eq('circle_id',circleId).order('week',{ascending:false}).limit(1).then(function(r){
      var w=(r.data||[])[0];
      if(!w) return;
      var idx=null;
      if(w.lesson_num) idx=(w.lesson_num|0)-1;
      else if(w.week) idx=(w.week|0)-1;
      if(idx==null || idx<0 || idx>=FILMS.length) return;
      weekIndex=idx;
      renderWeekChips();
      fillFilmSelect();
      var weekInp=el('cw-week'); if(weekInp) weekInp.value=String(weekIndex+1);
      setFilmGlance(filmTitle(weekIndex));
      renderBoard(lastProgress,{perSession:false});
    });
  }

  function weeks(){
    var box=el('cw-list'); if(!box) return;
    if(!liveCohort || !circleId){ box.innerHTML=''; return; }
    FC.sb.from('circle_weeks').select('*').eq('circle_id',circleId).order('week').then(function(r){
      var rows=r.data||[];
      box.innerHTML=rows.length?('<table class="dtable"><thead><tr><th>Week</th><th>Film</th><th></th></tr></thead><tbody>'+
        rows.map(function(w){
          var idx=(w.lesson_num||w.week||1)-1;
          var title=filmTitle(idx);
          return '<tr><td class="mono">'+esc(w.week)+'</td><td class="fine">'+esc(title)+'</td><td><button class="btn btn-secondary mini" data-wdel="'+w.id+'">Delete</button></td></tr>';
        }).join('')+'</tbody></table>'):'<p class="fine">No weeks yet.</p>';
      box.querySelectorAll('[data-wdel]').forEach(function(b){b.addEventListener('click',function(){FC.sb.from('circle_weeks').delete().eq('id',b.dataset.wdel).then(weeks);});});
    });
  }

  function saveWeek(){
    if(!liveCohort){toast('Plan weeks is for live cohorts.');return;}
    if(!circleId){toast('No live Circle yet. Claims still work.');return;}
    var idx=parseInt(el('cw-film').value,10);
    if(isNaN(idx)) idx=weekIndex;
    var week=parseInt(el('cw-week').value,10)|| (idx+1);
    var body={
      circle_id:circleId,
      week:week,
      class_slug:COURSE_SLUG,
      lesson_num:idx+1,
      question:el('cw-q').value||null,
      action:el('cw-action').value||null,
      meets_on:el('cw-date').value||null
    };
    FC.sb.from('circle_weeks').insert(body).then(function(r){
      if(r.error){toast('Could not save that week. Try again.');return;}
      toast('Week saved.');
      weekIndex=idx;
      renderWeekChips();
      setFilmGlance(filmTitle(weekIndex));
      weeks();
    });
  }

  function announcements(){
    var box=el('ann-list'); if(!box) return;
    if(!liveCohort || !circleId){ box.innerHTML=''; return; }
    FC.sb.from('circle_announcements').select('*').eq('circle_id',circleId).order('created_at',{ascending:false}).then(function(r){
      var rows=r.data||[];
      box.innerHTML=rows.length?rows.map(function(a){return '<div class="card" style="margin-bottom:10px"><p class="small">'+esc(a.body)+'</p><p class="fine" style="margin-top:6px">'+new Date(a.created_at).toLocaleString()+'</p></div>';}).join(''):'<p class="fine">No announcements yet.</p>';
    });
  }
  function announce(){
    if(!liveCohort){toast('Announce is for live cohorts.');return;}
    if(!circleId){toast('No live Circle yet. Use Claims until one is assigned.');return;}
    var body=el('ann-body').value.trim(); if(!body){toast('Write something.');return;}
    FC.sb.from('circle_announcements').insert({circle_id:circleId,author_id:FC.uid(),body:body}).then(function(r){
      if(r.error){toast('Could not post. Try again.');return;} el('ann-body').value='';toast('Posted.');announcements();
    });
  }
  function roster(){
    var box=el('lead-roster'); if(!box) return;
    if(!liveCohort || !circleId){ box.innerHTML=''; return; }
    FC.sb.from('circle_members').select('user_id, role, profiles(name,email)').eq('circle_id',circleId).then(function(r){
      var rows=r.data||[];
      box.innerHTML=rows.length?('<table class="dtable"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>'+
        rows.map(function(m){return '<tr><td>'+esc(m.profiles&&m.profiles.name||'—')+'</td><td class="fine">'+esc(m.profiles&&m.profiles.email||'')+'</td><td class="fine">'+m.role+'</td></tr>';}).join('')+'</tbody></table>'):'<p class="fine">No members yet.</p>';
    });
  }

  function displayName(row){
    var n=(row.participant_name||'').trim();
    if(n) return n;
    var em=row.participant_email||'';
    var local=em.split('@')[0]||'';
    return local || 'Unnamed man';
  }

  function reachHref(row){
    if(row.phone) return 'tel:'+String(row.phone).replace(/[^\d+]/g,'');
    if(row.participant_email) return 'mailto:'+row.participant_email;
    return '';
  }
  function reachLabel(row){
    return row.phone ? 'Call '+displayName(row) : 'Email '+displayName(row);
  }

  function renderBoard(rows, opts){
    var box=el('lead-thisweek'); if(!box) return;
    opts=opts||{};
    var perSession=!!opts.perSession;
    var title=filmTitle(weekIndex);
    if(!rows || !rows.length){
      box.innerHTML='<div class="dash-empty"><h3>No men claimed yet</h3><p>Claim a man by the email he signs in with. He can train without you. This board stays up even if you have no Circle.</p></div>';
      return;
    }
    var head = '<th>Name</th><th>Week</th><th>Film</th><th>Check</th><th>Practice</th><th>Serial</th><th></th>';
    var body = rows.map(function(x){
      var filmCell, checkCell, pracCell;
      if(perSession){
        filmCell='<td class="lead-yn">'+(x.film_yn?'Y':'N')+'</td>';
        checkCell='<td class="lead-yn">'+(x.check_yn?'Y':'N')+'</td>';
        pracCell='<td class="lead-yn">'+(x.practice_yn?'Y':'N')+'</td>';
      } else {
        // RPC is aggregates only. Do not invent this-session Y/N.
        filmCell='<td class="mono" title="Course-to-date films. Not this session.">'+(x.sessions_completed||0)+'</td>';
        checkCell='<td class="mono" title="Course-to-date checkpoints. Not this session.">'+(x.checkpoints_passed||0)+'</td>';
        pracCell='<td class="mono" title="Course-to-date practices. Not this session.">'+(typeof x.practices_completed==='number'?x.practices_completed:0)+'</td>';
      }
      var serial=x.cert_serial
        ? '<a class="link" href="verify.html">'+esc(x.cert_serial)+'</a>'
        : '—';
      var href=reachHref(x);
      var reach=href ? '<a class="btn btn-secondary mini" href="'+esc(href)+'">'+esc(reachLabel(x))+'</a>' : '';
      return '<tr>'+
        '<td>'+esc(displayName(x))+'</td>'+
        '<td class="fine">'+esc(title)+'</td>'+
        filmCell+checkCell+pracCell+
        '<td class="fine">'+serial+'</td>'+
        '<td>'+reach+'</td>'+
        '</tr>';
    }).join('');
    var note = perSession
      ? '<p class="fine" style="margin-top:12px">Y/N is this session. You never see a man\u2019s answers, scores, or practice log.</p>'
      : '<p class="fine" style="margin-top:12px">Film, Check, and Practice are course totals. The progress RPC does not return this session\u2019s flags, so those Y/N cells are not invented here. You never see a man\u2019s answers, scores, or practice log.</p>';
    box.innerHTML='<div class="dtable-wrap"><table class="dtable"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>'+note;
  }

  function pickNudge(rows, opts){
    opts=opts||{};
    if(!rows || !rows.length) return null;
    var stuck;
    if(opts.perSession){
      stuck=rows.filter(function(x){ return !x.film_yn; })[0]
        || rows.filter(function(x){ return !x.check_yn; })[0]
        || rows.filter(function(x){ return !x.practice_yn; })[0];
    } else {
      stuck=rows.filter(function(x){ return !(x.sessions_completed||0); })[0]
        || rows.filter(function(x){ return !(x.checkpoints_passed||0); })[0]
        || rows.filter(function(x){ return !(x.practices_completed||0); })[0];
    }
    return stuck||null;
  }

  function considerNext(rows, opts){
    var man=pickNudge(rows, opts);
    var review='<a href="review.html#rv-absent">Review 72h quiet men</a>';
    if(!rows || !rows.length){
      setConsiderHtml('Claim a man, then reach the one who has not started. · '+review);
      return;
    }
    if(!man){
      setConsiderHtml('Everyone claimed has started. Stay available. · '+review);
      return;
    }
    var href=reachHref(man);
    var reach=href ? '<a href="'+esc(href)+'">'+esc(reachLabel(man))+'</a>' : esc(displayName(man));
    var why;
    if(opts && opts.perSession && !man.film_yn) why=' has not watched '+filmTitle(weekIndex)+'.';
    else if(opts && opts.perSession && !man.check_yn) why=' has not passed this session\u2019s checkpoint.';
    else if(opts && opts.perSession && !man.practice_yn) why=' has not logged this session\u2019s practice.';
    else if(!(man.sessions_completed||0)) why=' has not started a film.';
    else if(!(man.checkpoints_passed||0)) why=' has not passed a checkpoint.';
    else why=' has not logged a practice.';
    setConsiderHtml(esc(displayName(man))+why+' '+reach+' · '+review);
  }

  function claims(){
    var box=el('claim-list'); if(!box) return;
    if(demo){ renderClaimList(lastClaims,true); return; }
    FC.sb.from('participant_claims').select('id,participant_email,status,created_at')
      .eq('facilitator_user_id',FC.uid()).eq('status','active').order('created_at',{ascending:false})
      .then(function(r){
        if(r.error){ box.innerHTML='<p class="fine">Claims are not available right now. Ask an admin if this keeps happening.</p>'; return; }
        lastClaims=r.data||[];
        setGlance('lead-men', String(lastClaims.length));
        updateSeatChip(lastClaims.length);
        renderClaimList(lastClaims,false);
      });
  }

  function renderClaimList(rows, isDemo){
    var box=el('claim-list'); if(!box) return;
    if(!rows.length){
      box.innerHTML='<p class="fine">No men claimed yet. Enter his sign-in email above. He can train after you claim him, without you in the room.</p>';
      return;
    }
    box.innerHTML='<table class="dtable"><thead><tr><th>Email</th><th>Claimed</th><th></th></tr></thead><tbody>'+
      rows.map(function(c){
        var when=c.created_at? new Date(c.created_at).toLocaleDateString() : '—';
        var rel=isDemo?'':('<td><button class="btn btn-secondary mini" data-crel="'+c.id+'">Release</button></td>');
        return '<tr><td class="fine">'+esc(c.participant_email)+'</td><td class="fine">'+when+'</td>'+(isDemo?'<td></td>':rel)+'</tr>';
      }).join('')+'</tbody></table>';
    box.querySelectorAll('[data-crel]').forEach(function(b){b.addEventListener('click',function(){
      var id=b.dataset.crel;
      b.disabled=true; b.textContent='Releasing…';
      FC.sb.from('participant_claims').update({status:'released'}).eq('id',id).then(function(ur){
        if(ur.error){ toast('Could not release that claim.'); b.disabled=false; b.textContent='Release'; return; }
        toast('Claim released.');
        claims();
        progressStrip();
      });
    });});
  }

  function addClaim(){
    if(demo){ toast('Claims write when live keys are connected.'); return; }
    var em=(el('claim-email').value||'').trim().toLowerCase();
    var msg=el('claim-msg');
    if(!em || em.indexOf('@')<0){ if(msg){msg.textContent='Enter the email he signs in with.';msg.className='fine cpn-err';} return; }
    var row={facilitator_user_id:FC.uid(), participant_email:em, status:'active'};
    if(circleId) row.circle_id=circleId;
    FC.sb.from('participant_claims').insert(row).then(function(r){
      if(r.error){
        var m=(r.error && r.error.message)||'';
        if(msg){msg.textContent=m.indexOf('duplicate')>=0||m.indexOf('unique')>=0
          ? 'That email is already claimed.'
          : 'Could not claim him. Check the email and try again.';
          msg.className='fine cpn-err';}
        return;
      }
      if(msg){msg.textContent='Claimed. He can train now, at no cost, without you in the room.';msg.className='fine cpn-ok';}
      el('claim-email').value='';
      claims();
      progressStrip();
    });
  }

  function progressStrip(){
    var note=el('lead-progress');
    if(demo){
      if(note) note.textContent='';
      return;
    }
    if(note) note.innerHTML='<p class="fine">Loading progress\u2026</p>';
    FC.sb.rpc('facilitator_participant_progress').then(function(r){
      if(r.error){
        if(note) note.innerHTML='<p class="fine">Could not load progress right now. Try again in a moment. If it keeps failing, tell an admin.</p>';
        renderBoard(lastClaims.map(function(c){ return {participant_email:c.participant_email}; }), {perSession:false});
        return;
      }
      var rows=r.data||[];
      lastProgress=rows;
      var watched=rows.filter(function(x){ return (x.sessions_completed||0)>0; }).length;
      setGlance('lead-men', String(rows.length));
      setGlance('lead-watched', String(watched));
      updateSeatChip(rows.length);
      renderBoard(rows, {perSession:false});
      considerNext(rows, {perSession:false});
      if(note) note.innerHTML='';
    });
  }

  function csvCell(v){ v=(v===null||v===undefined)?'':String(v); return '"'+v.replace(/"/g,'""')+'"'; }
  function exportRoster(){
    var msg=el('lead-export-msg');
    function fail(t){ if(msg){ msg.textContent=t; msg.className='fine cpn-err'; } }
    if(demo){ fail('Verification sheet downloads when live keys are connected.'); return; }
    if(msg){ msg.textContent='Building your sheet\u2026'; msg.className='fine'; }
    FC.sb.from('participant_claims').select('participant_email')
      .eq('facilitator_user_id', FC.uid()).eq('status','active')
      .then(function(cr){
        if(cr.error){ fail('Could not build the sheet right now. Try again, or tell an admin.'); return; }
        var emails=(cr.data||[]).map(function(c){ return (c.participant_email||'').toLowerCase(); }).filter(Boolean);
        if(!emails.length){ fail('No active claims yet. Claim a man above; his certificate joins this sheet.'); return; }
        FC.sb.from('profiles').select('id,name,full_name,email').in('email', emails).then(function(pr){
          if(pr.error){ fail('Could not load profiles for the sheet.'); return; }
          var profs=pr.data||[];
          var byId={}; profs.forEach(function(p){ byId[p.id]=p; });
          var ids=profs.map(function(p){ return p.id; });
          FC.sb.from('certificate_courses').select('id,title').then(function(kr){
            var titles={}; ((kr&&kr.data)||[]).forEach(function(k){ titles[k.id]=k.title; });
            var enrQ=ids.length ? FC.sb.from('certificate_enrollments').select('id,user_id,course_id,state').in('user_id', ids)
                                 : Promise.resolve({ data: [] });
            enrQ.then(function(er){
              if(er && er.error){ fail('Could not load enrollments for the sheet.'); return; }
              var enrolls=(er&&er.data)||[];
              var enrById={}; enrolls.forEach(function(e){ enrById[e.id]=e; });
              var enrIds=enrolls.map(function(e){ return e.id; });
              var certQ=enrIds.length ? FC.sb.from('certificates').select('*').in('enrollment_id', enrIds)
                                       : Promise.resolve({ data: [] });
            certQ.then(function(xr){
              if(xr && xr.error){ fail('Could not load certificates for the sheet.'); return; }
              var certs=(xr&&xr.data)||[];
              var head=['Name','Email','Course','Serial','Status','Issued','Verify at'];
              var verify=location.origin+'/verify.html';
              var rows=[head.map(csvCell).join(',')];
              var seen={};
              certs.forEach(function(c){
                var e=enrById[c.enrollment_id]||{};
                var p=byId[e.user_id]||{};
                seen[(p.email||'').toLowerCase()]=true;
                rows.push([
                  p.name||'',
                  p.email||'',
                  c.course_title||titles[e.course_id]||'',
                  c.serial||'',
                  c.revoked?'revoked':'issued',
                  (c.issued_at||'').slice(0,10),
                  verify
                ].map(csvCell).join(','));
              });
              emails.forEach(function(em){
                if(seen[em]) return;
                var p=null;
                profs.forEach(function(q){ if((q.email||'').toLowerCase()===em) p=q; });
                rows.push([
                  (p && (p.full_name||p.name))||'',
                  em,'','','in progress','',verify
                ].map(csvCell).join(','));
              });
              var stamp=new Date().toISOString().slice(0,10).replace(/-/g,'');
              var blob=new Blob([rows.join('\r\n')+'\r\n'],{type:'text/csv'});
              var a=document.createElement('a');
              a.href=URL.createObjectURL(blob);
              a.download='verification-sheet-'+stamp+'.csv';
              document.body.appendChild(a); a.click();
              setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
              if(msg){ msg.textContent='Downloaded. '+(rows.length-1)+' men on the sheet.'; msg.className='fine cpn-ok'; }
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
