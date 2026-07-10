/* The organization's Home: the window on the service.
   Rail: identity, the join link, three statistics. Feed: consider-next, cohort
   cards from the same security-definer RPC the Efficacy Report uses, invites,
   and the roster. Never shows a man's answers or scores. */
(function(){
  var demo=!(window.FC&&FC.live); var currentOrg=null, currentName='';
  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fmt(n){ return (n===null||n===undefined||isNaN(n)) ? '0' : Math.round(n*10)/10; }

  function boot(){
    if(demo){ var dn=el('demo-note'); if(dn) dn.style.display=''; var ap=el('app'); if(ap) ap.style.display='';
      var rt=el('roster-table'); if(rt) rt.innerHTML='<p class="fine">Live roster loads with Supabase keys.</p>'; return; }
    FCR.guard(['org_admin','circle_leader','admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display=''; loadOrgs();
    });
  }

  function loadOrgs(){
    FC.sb.from('orgs').select('id,name,seats,renews_on').then(function(r){
      var rows=r.data||[];
      if(!rows.length){
        el('org-picker').innerHTML='';
        var body=el('org-body');
        if(body) body.innerHTML='<div class="card" style="padding:32px;max-width:640px">'+
          '<div class="eyebrow" style="margin-bottom:10px">NO ORGANIZATION YET</div>'+
          '<h3 style="margin-bottom:8px">Your program is not set up here yet.</h3>'+
          '<p class="small" style="color:var(--ash);margin-bottom:16px">Once your organization is created and you are added as its admin, this page becomes your window: men measured, movement, completions, and your join link. You never see a man\u2019s answers or scores.</p>'+
          '<p class="small" style="color:var(--ash)">To get set up, write <a class="link" href="mailto:Team@Fathers.com?subject=Set%20up%20our%20organization">Team@Fathers.com</a> and we will stand up your program and send your join link, usually same day.</p>'+
        '</div>';
        return;}
      el('org-picker').innerHTML=rows.map(function(o,i){return '<button class="chip'+(i===0?' selected':'')+'" data-org="'+o.id+'" data-name="'+esc(o.name)+'" data-seats="'+(o.seats||'')+'" data-renews="'+(o.renews_on||'')+'">'+esc(o.name)+'</button>';}).join('');
      el('org-picker').querySelectorAll('[data-org]').forEach(function(b){b.addEventListener('click',function(){
        el('org-picker').querySelectorAll('.chip').forEach(function(x){x.classList.remove('selected');});b.classList.add('selected');
        selectOrg(b.dataset.org, b.dataset.name, b.dataset.seats, b.dataset.renews);
      });});
      var f=rows[0]; selectOrg(f.id, f.name, f.seats, f.renews_on);
    });
  }

  function selectOrg(id, name, seats, renews){
    currentOrg=id; currentName=name||'';
    var nm=el('orgName'); if(nm) nm.textContent=name||'Your program';
    var meta=el('orgMeta'); if(meta) meta.textContent=(seats?seats+' seats':'')+(seats&&renews?' \u00b7 ':'')+(renews?('renews '+new Date(renews).toLocaleDateString()):'');
    loadJoin(id); loadReport(id); loadRoster(id);
  }

  function loadJoin(id){
    var box=el('orgJoin'); if(!box) return;
    FC.sb.from('org_join_codes').select('code,active,support_note').eq('org_id',id).then(function(r){
      var codes=(r.data||[]).filter(function(c){return c.active;});
      if(r.error || !codes.length){
        box.innerHTML='<p class="small" style="color:var(--ash);margin-bottom:10px">No join code minted yet. One link enrolls every man; write us and we mint it same day.</p>'+
          '<a class="link" href="mailto:Team@Fathers.com?subject=Mint%20our%20join%20code">Request your link &rarr;</a>';
        return;
      }
      var code=codes[0].code;
      var url=location.origin+'/profile.html?join='+encodeURIComponent(code);
      box.innerHTML='<div class="mono" style="font-size:18px;margin-bottom:8px">'+esc(code)+'</div>'+
        '<p class="fine" style="color:var(--ash);margin-bottom:12px">One link enrolls every man under your program. Send it any way you like.</p>'+
        '<button class="btn btn-primary btn-sm" id="copyJoin">Copy the link</button>'+
        '<p class="fine" id="copyMsg" style="margin-top:8px"></p>';
      var btn=el('copyJoin');
      btn.addEventListener('click', function(){
        (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){ el('copyMsg').textContent='Copied. Paste it anywhere your men are.'; },
          function(){ el('copyMsg').textContent=url; });
      });
    });
  }

  function loadReport(id){
    var st=el('orgStats'), co=el('orgCohorts'), nx=el('orgNext');
    FC.sb.rpc('get_efficacy_report', { p_org: id }).then(function(r){
      var rows=r.data||[];
      if(r.error){ if(st) st.innerHTML='<p class="fine" style="color:var(--ash)">Statistics unavailable right now.</p>'; if(co) co.innerHTML=''; if(nx) nx.innerHTML=''; return; }
      var fathers=0, completed=0, mvs=[];
      rows.forEach(function(x){ fathers+=(x.fathers||0); completed+=(x.completed||0); if(x.movement!=null && !isNaN(x.movement)) mvs.push(x.movement); });
      var avgMv = mvs.length ? mvs.reduce(function(a,b){return a+b;},0)/mvs.length : null;

      if(st) st.innerHTML =
        srow('Men measured', fathers) +
        srow('Average movement', avgMv==null?'\u2014':((avgMv>=0?'+':'')+fmt(avgMv))) +
        srow('Finished a latest profile', completed, true);

      if(nx){
        var gap = fathers - completed;
        var msg = !fathers ? 'Send your join link to the first ten men. The baseline is where everything starts.'
          : gap>0 ? gap+' of your men have measured once and not again. The retake is where movement shows; resend the link.'
          : 'Every measured man has a latest profile. Watch the movement column and share the report.';
        nx.innerHTML='<div class="card" style="padding:18px 22px;margin-bottom:20px;border-left:3px solid var(--ember)">'+
          '<div class="eyebrow" style="margin-bottom:6px">CONSIDER NEXT</div>'+
          '<p class="small" style="margin:0">'+msg+'</p></div>';
      }

      if(co){
        if(!rows.length){ co.innerHTML='<div class="card" style="padding:22px 26px"><p class="small" style="color:var(--ash);margin:0">No cohorts yet. The first man through your join link starts your first cohort, and this feed comes alive.</p></div>'; return; }
        co.innerHTML = rows.map(function(x){
          var mv = (x.movement==null||isNaN(x.movement)) ? null : x.movement;
          return '<div class="card" style="padding:20px 24px;margin-bottom:12px">'+
            '<div class="row between wrap" style="gap:10px;align-items:baseline">'+
              '<h3 style="margin:0">'+esc(x.cohort||'Unassigned')+'</h3>'+
              (mv==null?'<span class="fine" style="color:var(--ash)">baseline only</span>':'<span class="mono" style="font-size:20px">'+(mv>0?'+':'')+fmt(mv)+'</span>')+
            '</div>'+
            '<p class="fine" style="color:var(--ash);margin:8px 0 12px">'+(x.fathers||0)+' fathers \u00b7 '+(x.completed||0)+' finished a latest profile'+(x.baseline!=null?(' \u00b7 baseline '+fmt(x.baseline)):'')+(x.latest!=null?(' \u00b7 latest '+fmt(x.latest)):'')+'</p>'+
            '<a class="btn btn-secondary btn-sm" href="efficacy-report.html">View in the report</a>'+
          '</div>';
        }).join('');
      }
    });
  }
  function srow(label,val,last){
    return '<div class="rail-row'+(last?' last':'')+'"><span class="small">'+label+'</span><b class="mono">'+val+'</b></div>';
  }

  function loadRoster(id){
    var rt=el('roster-table'); if(!rt) return;
    FC.sb.from('org_participation').select('*').eq('org_id',id).then(function(r){
      var rows=r.data||[];
      if(r.error){ rt.innerHTML='<p class="fine" style="color:var(--ash)">Roster unavailable right now.</p>'; return; }
      if(!rows.length){ rt.innerHTML='<p class="fine">No seats yet. The join link fills this table.</p>'; return; }
      var html='<table class="dtable"><thead><tr><th>Email</th><th>Active</th><th>Baseline</th><th>Lessons</th><th>Last active</th></tr></thead><tbody>';
      rows.forEach(function(x){
        html+='<tr><td class="fine">'+esc(x.email)+'</td>'+
          '<td>'+(x.activated?'<span class="pubdot on"></span>Yes':'<span class="pubdot off"></span>Invited')+'</td>'+
          '<td>'+(x.took_baseline?'Yes':'\u2014')+'</td><td class="mono">'+(x.lessons_done||0)+'</td>'+
          '<td class="fine">'+(x.last_active?new Date(x.last_active).toLocaleDateString():'\u2014')+'</td></tr>';
      });
      rt.innerHTML=html+'</tbody></table>';
    });
  }

  function invite(){
    if(!currentOrg){toast('Pick an org first.');return;}
    var email=el('inv-email').value.trim();
    if(!email){el('inv-msg').textContent='Enter an email.';return;}
    FC.sb.from('seats').insert({org_id:currentOrg,email:email}).then(function(r){
      if(r.error){el('inv-msg').textContent='Failed: '+r.error.message;return;}
      el('inv-msg').textContent='Invited '+email+'. They claim the seat when they sign in.';el('inv-email').value='';loadRoster(currentOrg);
      if(FC.cfg&&FC.cfg.SUPABASE_URL) FC.sb.functions.invoke('send-email',{body:{to:email,template:'org-invite',data:{ORG:currentName||'your organization',JOIN_URL:location.origin+'/login.html'}}}).catch(function(){});
    });
  }

  document.addEventListener('DOMContentLoaded',function(){ boot(); var b=el('inv-go'); if(b) b.addEventListener('click',invite); });
})();
