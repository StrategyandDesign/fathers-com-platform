/* Circle leader dashboard: weekly plan, announcements, roster. */
(function(){
  var demo=!(window.FC&&FC.live); var circleId=null;
  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function boot(){
    if(demo){ el('demo-note').style.display=''; el('app').style.display='';
      el('lead-thisweek').innerHTML='<p class="fine">Live Circle loads with Supabase keys.</p>'; return; }
    FCR.guard(['circle_leader','admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display=''; loadCircles();
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
  function select(id){ circleId=id; thisWeek(); weeks(); announcements(); roster(); }

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
  document.addEventListener('DOMContentLoaded',function(){
    boot();
    var a=el('cw-go'); if(a) a.addEventListener('click',saveWeek);
    var b=el('ann-go'); if(b) b.addEventListener('click',announce);
  });
})();
