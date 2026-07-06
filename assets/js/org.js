/* Org admin dashboard: seats, invites, participation. Never shows individual answers/scores. */
(function(){
  var demo=!(window.FC&&FC.live); var currentOrg=null;
  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function boot(){
    if(demo){ el('demo-note').style.display=''; el('app').style.display='';
      el('roster-table').innerHTML='<p class="fine">Live roster loads with Supabase keys.</p>'; return; }
    FCR.guard(['org_admin','circle_leader','admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display=''; loadOrgs();
    });
  }
  function loadOrgs(){
    FC.sb.from('orgs').select('id,name,seats,renews_on').then(function(r){
      var rows=r.data||[];
      if(!rows.length){el('org-picker').innerHTML='<p class="fine">No organizations visible to you yet.</p>';return;}
      el('org-picker').innerHTML=rows.map(function(o,i){return '<button class="chip'+(i===0?' selected':'')+'" data-org="'+o.id+'">'+esc(o.name)+'</button>';}).join('');
      el('org-picker').querySelectorAll('[data-org]').forEach(function(b){b.addEventListener('click',function(){
        el('org-picker').querySelectorAll('.chip').forEach(function(x){x.classList.remove('selected');});b.classList.add('selected');
        selectOrg(b.dataset.org);
      });});
      selectOrg(rows[0].id);
    });
  }
  function selectOrg(id){ currentOrg=id; loadParticipation(id); }
  function loadParticipation(id){
    FC.sb.from('org_participation').select('*').eq('org_id',id).then(function(r){
      var rows=r.data||[];
      var active=rows.filter(function(x){return x.activated;}).length;
      var baseline=rows.filter(function(x){return x.took_baseline;}).length;
      var lessons=rows.reduce(function(a,x){return a+(x.lessons_done||0);},0);
      el('org-stats').innerHTML=
        stat(active+' / '+rows.length,'Seats active')+stat(baseline,'Took baseline')+stat(lessons,'Lessons completed')+stat(rows.length,'Seats total');
      if(!rows.length){el('roster-table').innerHTML='<p class="fine">No seats yet. Invite your first man above.</p>';return;}
      var html='<table class="dtable"><thead><tr><th>Email</th><th>Active</th><th>Baseline</th><th>Lessons</th><th>Last active</th></tr></thead><tbody>';
      rows.forEach(function(x){
        html+='<tr><td class="fine">'+esc(x.email)+'</td>'+
          '<td>'+(x.activated?'<span class="pubdot on"></span>Yes':'<span class="pubdot off"></span>Invited')+'</td>'+
          '<td>'+(x.took_baseline?'Yes':'—')+'</td><td class="mono">'+(x.lessons_done||0)+'</td>'+
          '<td class="fine">'+(x.last_active?new Date(x.last_active).toLocaleDateString():'—')+'</td></tr>';
      });
      el('roster-table').innerHTML=html+'</tbody></table>';
    });
  }
  function stat(n,l){return '<div class="card stat"><div class="num">'+n+'</div><div class="lbl">'+l+'</div></div>';}
  function invite(){
    if(!currentOrg){toast('Pick an org first.');return;}
    var email=el('inv-email').value.trim();
    if(!email){el('inv-msg').textContent='Enter an email.';return;}
    FC.sb.from('seats').insert({org_id:currentOrg,email:email}).then(function(r){
      if(r.error){el('inv-msg').textContent='Failed: '+r.error.message;return;}
      el('inv-msg').textContent='Invited '+email+'. They claim the seat when they sign in.';el('inv-email').value='';loadParticipation(currentOrg);
      // fire the invite email if the function is deployed
      if(FC.cfg&&FC.cfg.SUPABASE_URL) FC.sb.functions.invoke('send-email',{body:{to:email,template:'org-invite',data:{ORG:'your organization',JOIN_URL:location.origin+'/login.html'}}}).catch(function(){});
    });
  }
  document.addEventListener('DOMContentLoaded',function(){ boot(); var b=el('inv-go'); if(b) b.addEventListener('click',invite); });
})();
