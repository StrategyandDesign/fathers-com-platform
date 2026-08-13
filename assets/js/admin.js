/* Admin dashboard controller */
(function(){
  var demo = !(window.FC && FC.live);
  function el(id){return document.getElementById(id);}
  function show(){el('app').style.display='';}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function scopedRole(role){ return role==='org_admin' || role==='circle_leader'; }

  function boot(){
    if(demo){ el('demo-note').style.display=''; show(); loadContent(); ensureGrantUi(); return; }
    FCR.guard(['admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      show(); ensureGrantUi(); loadPeople(); loadContent(); loadInstruments(); loadOrgs(); loadAudit();
    });
  }

  function ensureGrantUi(){
    if(el('gr-org')) { toggleOrgSelect(); return; }
    var msg=el('gr-msg'); if(!msg) return;
    var box=document.createElement('div');
    box.innerHTML=
      '<div class="field" id="gr-org-wrap" style="margin:12px 0 0;display:none"><label>Organization</label>'+
      '<select class="input" id="gr-org"><option value="">Select org</option></select></div>'+
      '<label class="fine" style="display:block;margin-top:10px"><input type="checkbox" id="gr-both"> Grant both org_admin and circle_leader (Org + Desk)</label>';
    msg.parentNode.insertBefore(box, msg);
    msg.textContent='org_admin and circle_leader need an organization. Returning Home needs both roles on the same person.';
    var role=el('gr-role'); if(role) role.addEventListener('change', toggleOrgSelect);
    var both=el('gr-both'); if(both) both.addEventListener('change', toggleOrgSelect);
    toggleOrgSelect();
  }

  function toggleOrgSelect(){
    var role=(el('gr-role')&&el('gr-role').value)||'';
    var both=el('gr-both')&&el('gr-both').checked;
    var wrap=el('gr-org-wrap');
    if(wrap) wrap.style.display=(scopedRole(role)||both)?'':'none';
  }

  function fillOrgSelect(rows){
    var sel=el('gr-org'); if(!sel) return;
    var keep=sel.value;
    sel.innerHTML='<option value="">Select org</option>'+(rows||[]).map(function(o){
      return '<option value="'+esc(o.id)+'">'+esc(o.name)+'</option>';
    }).join('');
    if(keep) sel.value=keep;
    toggleOrgSelect();
  }

  function loadPeople(){
    FC.sb.from('profiles').select('id,name,email').order('created_at',{ascending:false}).then(function(r){
      var rows=r.data||[];
      FC.sb.from('user_roles').select('user_id,role,org_id').then(function(rr){
        var byUser={};(rr.data||[]).forEach(function(x){(byUser[x.user_id]=byUser[x.user_id]||[]).push(x);});
        var html='<table class="dtable"><thead><tr><th>Name</th><th>Email</th><th>Roles</th><th></th></tr></thead><tbody>';
        rows.forEach(function(p){
          var chips=(byUser[p.id]||[]).map(function(x){return '<span class="rolechip '+x.role+'">'+x.role+(x.org_id?' ·org':'')+'</span>';}).join('')||'<span class="fine">member</span>';
          html+='<tr><td>'+esc(p.name||'-')+'</td><td class="fine">'+esc(p.email)+'</td><td>'+chips+'</td>'+
            '<td class="inline-actions"><button class="btn btn-secondary mini" data-revoke="'+p.id+'">Manage</button></td></tr>';
        });
        html+='</tbody></table>';
        el('people-table').innerHTML=html;
        el('people-table').querySelectorAll('[data-revoke]').forEach(function(b){
          b.addEventListener('click',function(){manage(b.dataset.revoke, byUser[b.dataset.revoke]||[]);});
        });
      });
    });
  }

  function manage(uid, roles){
    if(!roles.length){toast('This user has only the default member role.');return;}
    var names=roles.map(function(x){return x.role;}).join(', ');
    if(confirm('Revoke all roles ('+names+') from this user?')){
      Promise.all(roles.map(function(x){return FC.sb.from('user_roles').delete().eq('user_id',uid).eq('role',x.role).eq('org_id',x.org_id||null);}))
        .then(function(){audit('revoke_roles',uid,{roles:names});toast('Roles revoked.');loadPeople();});
    }
  }

  function grant(){
    var email=el('gr-email').value.trim(), role=el('gr-role').value;
    var both=el('gr-both')&&el('gr-both').checked;
    if(!email){el('gr-msg').textContent='Enter an email.';return;}
    var orgId=(el('gr-org')&&el('gr-org').value)||'';
    var roles=both?['org_admin','circle_leader']:[role];
    if(roles.some(scopedRole) && !orgId){
      el('gr-msg').textContent='org_admin and circle_leader need an organization.';
      return;
    }
    FC.sb.from('profiles').select('id').eq('email',email).maybeSingle().then(function(r){
      if(!r.data){el('gr-msg').textContent='No user with that email yet. They must sign in once first.';return;}
      var uid=r.data.id;
      var inserts=roles.map(function(rl){
        var row={user_id:uid,role:rl};
        if(scopedRole(rl)) row.org_id=orgId;
        return FC.sb.from('user_roles').insert(row);
      });
      Promise.all(inserts).then(function(results){
        var err=(results||[]).map(function(res){return res&&res.error;}).filter(Boolean)[0];
        if(err){el('gr-msg').textContent='Failed: '+err.message;return;}
        audit('grant_role',uid,{roles:roles,org:orgId||null});
        el('gr-msg').textContent='Granted '+roles.join(' + ')+' to '+email+'.';
        el('gr-email').value='';loadPeople();
      });
    });
  }

  function loadContent(){
    var host=el('content-table');
    var SLUG_PAGE={fundamentals:'course-fathering-fundamentals.html',reentry:'course-coming-home-present.html',anger:'course-steady-under-pressure.html',coparenting:'course-same-team.html',manhood:'course-the-man-before-you.html'};
    var EXPECTED={fundamentals:8,reentry:12,anger:12,coparenting:12,manhood:6};
    function paintCerts(courses, counts){
      var html='<div class="eyebrow" style="margin:0 0 10px">CERTIFICATE COURSES (PRODUCT TRUTH)</div>';
      html+='<table class="dtable"><thead><tr><th>Course</th><th>Sessions</th><th>Films live</th><th>Status</th><th></th></tr></thead><tbody>';
      (courses||[]).forEach(function(c){
        var n=counts[c.id]||{sessions:0,films:0};
        var sess=n.sessions||EXPECTED[c.slug]||0;
        var page=SLUG_PAGE[c.slug];
        var link=page?'<a class="btn btn-secondary mini" href="'+page+'">Course page</a>':'';
        html+='<tr><td>'+esc(c.title)+'<div class="fine mono">'+esc(c.slug)+'</div></td>'+
          '<td class="mono">'+sess+'</td><td class="mono">'+n.films+'</td>'+
          '<td><span class="pubdot '+(c.published?'on':'off')+'"></span>'+(c.published?'Published':'Draft')+'</td>'+
          '<td class="inline-actions">'+link+'</td></tr>';
      });
      if(!(courses||[]).length){
        html+='<tr><td colspan="5" class="fine">No certificate_courses rows yet. Paste content/SEED-CONTENT.sql in the SQL editor, or keep the static short-course pages as the public source of truth.</td></tr>';
      }
      html+='</tbody></table>';
      return html;
    }
    function paintClasses(rows){
      var html='<div class="eyebrow" style="margin:22px 0 10px">LEGACY CLASS LIBRARY</div>';
      html+='<table class="dtable"><thead><tr><th>Class</th><th>Instructor</th><th>Lessons</th><th>Status</th></tr></thead><tbody>';
      if(!(rows||[]).length){
        html+='<tr><td colspan="4" class="fine">No legacy classes. The four film courses above are the live catalog.</td></tr>';
      } else {
        rows.forEach(function(c){
          html+='<tr><td>'+esc(c.title)+'</td><td class="fine">'+esc(c.instructor||'-')+'</td><td class="mono">'+(c.lesson_count||0)+'</td>'+
            '<td><span class="pubdot '+(c.published?'on':'off')+'"></span>'+(c.published?'Published':'Draft')+'</td></tr>';
        });
      }
      return html+'</tbody></table>';
    }
    if(!(window.FC&&FC.live)){
      var demoRows=[
        {id:'d1',slug:'fundamentals',title:'Fathering Fundamentals',published:true},
        {id:'d2',slug:'reentry',title:'Coming Home Present',published:true},
        {id:'d3',slug:'anger',title:'Steady Under Pressure',published:true},
        {id:'d4',slug:'coparenting',title:'Same Team',published:true}
      ];
      var counts={d1:{sessions:8,films:0},d2:{sessions:12,films:0},d3:{sessions:12,films:0},d4:{sessions:12,films:0}};
      host.innerHTML=paintCerts(demoRows,counts)+paintClasses([]);
      return;
    }
    Promise.all([
      FC.sb.from('certificate_courses').select('id,slug,title,published,hours').order('title'),
      FC.sb.from('course_videos').select('course_id,video_url,duration_seconds'),
      FC.sb.from('classes').select('id,title,instructor,published,lesson_count').order('created_at',{ascending:false})
    ]).then(function(rs){
      var counts={};
      ((rs[1]&&rs[1].data)||[]).forEach(function(v){
        var c=counts[v.course_id]=counts[v.course_id]||{sessions:0,films:0};
        c.sessions++;
        if(v.duration_seconds>0 && v.video_url && v.video_url!=='pending') c.films++;
      });
      host.innerHTML=paintCerts((rs[0]&&rs[0].data)||[], counts)+paintClasses((rs[2]&&rs[2].data)||[]);
    }, function(err){
      host.innerHTML='<p class="fine">Could not load content: '+esc(err&&err.message||'error')+'</p>';
    });
  }

  function loadInstruments(){
    FC.sb.from('instruments').select('title,slug,version,status').order('created_at',{ascending:false}).then(function(r){
      var rows=r.data||[];
      if(!rows.length){el('instr-table').innerHTML='<p class="fine">No instruments yet. Build one in Studio.</p>';return;}
      var html='<table class="dtable"><thead><tr><th>Instrument</th><th>Version</th><th>Status</th></tr></thead><tbody>';
      rows.forEach(function(i){html+='<tr><td>'+esc(i.title)+'</td><td class="mono">v'+i.version+'</td><td><span class="pill-status '+i.status+'">'+i.status+'</span></td></tr>';});
      el('instr-table').innerHTML=html+'</tbody></table>';
    });
  }

  function newJoinCode(){
    var alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var out='';
    for(var i=0;i<8;i++) out+=alphabet.charAt(Math.floor(Math.random()*alphabet.length));
    return out;
  }

  function mintJoin(orgId){
    function attempt(n){
      var code=newJoinCode();
      return FC.sb.from('org_join_codes').insert({org_id:orgId,code:code,active:true}).then(function(res){
        if(res.error){
          if(n<1) return attempt(n+1);
          toast('Could not mint: '+res.error.message);
          return;
        }
        audit('mint_join_code',orgId,{code:code});
        toast('Join code '+code+' · /profile.html?join='+code);
      });
    }
    attempt(0);
  }

  function grantBoth(orgId){
    var email=prompt('Email to grant org_admin AND circle_leader for this org:');
    if(!email) return;
    FC.sb.from('profiles').select('id').eq('email',email.trim()).maybeSingle().then(function(r){
      if(!r.data){toast('No user with that email yet. They must sign in once first.');return;}
      var uid=r.data.id;
      Promise.all([
        FC.sb.from('user_roles').insert({user_id:uid,role:'org_admin',org_id:orgId}),
        FC.sb.from('user_roles').insert({user_id:uid,role:'circle_leader',org_id:orgId})
      ]).then(function(results){
        var err=(results||[]).map(function(res){return res&&res.error;}).filter(Boolean)[0];
        if(err){toast('Failed: '+err.message);return;}
        audit('grant_scoped_role',uid,{roles:['org_admin','circle_leader'],org:orgId});
        toast('Granted org_admin + circle_leader.');
        loadPeople();
      });
    });
  }

  function loadOrgs(){
    FC.sb.from('orgs').select('id,name,seats,renews_on').order('name').then(function(r){
      var rows=r.data||[];
      fillOrgSelect(rows);
      var html='<p class="fine" style="margin:0 0 12px">Mint a join code here. Grant both roles on the same person for Returning Home (Org + Desk). Do not mail Team@ for setup.</p>';
      html+='<table class="dtable"><thead><tr><th>Organization</th><th>Seats</th><th>Renews</th><th></th></tr></thead><tbody>';
      rows.forEach(function(o){
        html+='<tr><td>'+esc(o.name)+'</td><td class="mono">'+o.seats+'</td><td class="fine">'+(o.renews_on||'-')+'</td>'+
          '<td class="inline-actions">'+
          '<button class="btn btn-secondary mini" data-orgadmin="'+o.id+'">+ org_admin</button>'+
          '<button class="btn btn-secondary mini" data-leader="'+o.id+'">+ leader</button>'+
          '<button class="btn btn-secondary mini" data-both="'+o.id+'">Grant both</button>'+
          '<button class="btn btn-primary mini" data-mint="'+o.id+'">Mint join code</button></td></tr>';
      });
      el('orgs-table').innerHTML=html+'</tbody></table>';
      el('orgs-table').querySelectorAll('[data-orgadmin]').forEach(function(b){b.addEventListener('click',function(){grantScoped(b.dataset.orgadmin,'org_admin');});});
      el('orgs-table').querySelectorAll('[data-leader]').forEach(function(b){b.addEventListener('click',function(){grantScoped(b.dataset.leader,'circle_leader');});});
      el('orgs-table').querySelectorAll('[data-both]').forEach(function(b){b.addEventListener('click',function(){grantBoth(b.dataset.both);});});
      el('orgs-table').querySelectorAll('[data-mint]').forEach(function(b){b.addEventListener('click',function(){mintJoin(b.dataset.mint);});});
    });
  }

  function grantScoped(orgId, role){
    var email=prompt('Email of the user to grant '+role+' for this org:');
    if(!email) return;
    FC.sb.from('profiles').select('id').eq('email',email.trim()).maybeSingle().then(function(r){
      if(!r.data){toast('No user with that email yet.');return;}
      FC.sb.from('user_roles').insert({user_id:r.data.id,role:role,org_id:orgId}).then(function(res){
        if(res.error){toast('Failed: '+res.error.message);return;}
        audit('grant_scoped_role',r.data.id,{role:role,org:orgId});toast('Granted '+role+'.');
        loadPeople();
      });
    });
  }

  function createOrg(){
    var name=el('org-name').value.trim(), seats=parseInt(el('org-seats').value,10)||25;
    if(!name){toast('Name the org.');return;}
    FC.sb.from('orgs').insert({name:name,seats:seats}).select().single().then(function(r){
      if(r.error){toast('Failed: '+r.error.message);return;}
      audit('create_org',r.data.id,{name:name});el('org-name').value='';toast('Org created.');loadOrgs();
    });
  }

  function loadAudit(){
    FC.sb.from('audit_log').select('action,target,detail,at').order('at',{ascending:false}).limit(50).then(function(r){
      var rows=r.data||[];
      if(!rows.length){el('audit-table').innerHTML='<p class="fine">No audit entries yet.</p>';return;}
      var html='<table class="dtable"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead><tbody>';
      rows.forEach(function(a){html+='<tr><td class="fine">'+new Date(a.at).toLocaleString()+'</td><td class="mono">'+esc(a.action)+'</td><td class="fine">'+esc(JSON.stringify(a.detail||{}))+'</td></tr>';});
      el('audit-table').innerHTML=html+'</tbody></table>';
    });
  }

  window.audit=function(action,target,detail){ if(window.FC&&FC.live) FC.sb.from('audit_log').insert({actor:FC.uid(),action:action,target:target,detail:detail}); };

  document.addEventListener('DOMContentLoaded',function(){
    boot();
    var g=el('gr-go'); if(g) g.addEventListener('click',grant);
    var o=el('org-go'); if(o) o.addEventListener('click',createOrg);
  });
})();
