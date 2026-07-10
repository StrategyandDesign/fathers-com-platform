/* The father's Home: rail + feed around his plan.
   Komoot translation: identity and week at top, tappable counts, his baseline as
   the statistics block with the retake date, then a feed of his actual work.
   Every query is best-effort; every section has a designed empty state. */
(function(){
  function $(id){ return document.getElementById(id); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fmtDate(d){ return d.toLocaleDateString(undefined,{month:'long',day:'numeric'}); }
  function safe(p){ return p.then(function(r){return r;},function(e){return {error:e};}); }

  document.addEventListener('DOMContentLoaded', function(){
    if(!(window.FC && FC.live && FC.uid && FC.uid())) return; // auth shell handles the rest
    var uid = FC.uid(), sb = FC.sb;

    Promise.all([
      safe(sb.from('keystone_sessions').select('id,completed_at').eq('user_id',uid).eq('status','completed').order('completed_at',{ascending:true})),
      safe(sb.from('voice_recordings').select('id',{count:'exact',head:true}).eq('user_id',uid)),
      safe(sb.from('circle_posts').select('id',{count:'exact',head:true}).eq('user_id',uid)),
      safe(sb.from('certificate_awards').select('status,course_id').eq('user_id',uid)),
      safe(sb.from('certificate_enrollments').select('course_id,status,state').eq('user_id',uid)),
      safe(sb.from('certificate_courses').select('id,slug,title')),
      safe(sb.from('voice_recordings').select('kind,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(1))
    ]).then(function(res){
      var sess=(res[0].data||[]), vN=res[1].count||0, cN=res[2].count||0,
          awards=(res[3].data||[]), enr=(res[4].data||[]), courses=(res[5].data||[]), rec=(res[6].data||[])[0];
      var last = sess[sess.length-1] || null;

      var sessIds = sess.map(function(s){return s.id;});
      var pResults = sessIds.length
        ? safe(sb.from('keystone_results').select('session_id,overall_pct,scale_scores').in('session_id', sessIds))
        : Promise.resolve({data:[]});

      pResults.then(function(rr){
        var byS={}; (rr.data||[]).forEach(function(x){ byS[x.session_id]=x; });
        var firstR=null, lastR=null;
        sess.forEach(function(s){ var x=byS[s.id]; if(!x) return; if(!firstR) firstR=x; lastR=x; });
        renderRail(last, firstR, lastR, vN, cN, awards);
        renderFeed(enr, awards, courses, rec);
      });
    });

    function renderRail(last, firstR, lastR, vN, cN, awards){
      var week=$('railWeek'), nudge=$('railNudge'), counts=$('railCounts'), bars=$('railBars');
      var earned = awards.filter(function(a){return a.status==='signed'||a.status==='awarded';}).length;

      if(last && last.completed_at){
        var t = new Date(last.completed_at), now = new Date();
        var wk = Math.min(13, Math.floor((now - t)/(7*86400000)) + 1);
        week.textContent = 'Week '+wk+' of 13';
      } else {
        week.textContent = 'Start with your baseline';
        nudge.textContent = 'Twenty minutes. Four scores. Your plan builds itself.';
      }

      counts.innerHTML =
        row('Recordings', vN, 'voice.html') +
        row('Certificates earned', earned, 'certificates.html') +
        row('Circle posts', cN, 'circles.html', true);
      function row(label,n,href,lastRow){
        return '<a class="rail-row'+(lastRow?' last':'')+'" href="'+href+'"><span class="small">'+label+'</span><b class="mono">'+n+'</b></a>';
      }

      if(!lastR){
        bars.innerHTML = '<p class="small" style="color:var(--ash);margin-bottom:14px">No baseline yet. It is free, takes about twenty minutes, and everything on this page builds from it.</p>'+
          '<a class="btn btn-yellow btn-sm" href="profile.html">Take your Profile</a>';
        return;
      }
      var dims=['involvement','consistency','awareness','nurturance'];
      var sc=lastR.scale_scores||{};
      var html='<div class="row between" style="align-items:baseline;margin-bottom:14px"><span class="d-36">'+esc(lastR.overall_pct!=null?lastR.overall_pct:'0')+'</span><span class="fine">overall, of 100</span></div>';
      dims.forEach(function(k){
        var p=(sc[k]&&sc[k].pct!=null)?sc[k].pct:0;
        html+='<div class="rail-bar"><div class="row between"><span class="fine">'+k.charAt(0).toUpperCase()+k.slice(1)+'</span><span class="fine mono">'+p+'</span></div><div class="rail-track"><span style="width:'+p+'%"></span></div></div>';
      });
      if(firstR && lastR!==firstR && firstR.overall_pct!=null && lastR.overall_pct!=null){
        var mv=lastR.overall_pct-firstR.overall_pct;
        html+='<p class="fine" style="margin-top:12px">'+(mv>=0?'+':'')+mv+' since your first run. Movement is the point.</p>';
      }
      if(last && last.completed_at){
        var due=new Date(new Date(last.completed_at).getTime()+90*86400000);
        html += (due < new Date())
          ? '<p class="fine" style="margin-top:10px">Your ninety days are up. <a class="link" href="profile.html">Retake your baseline &rarr;</a></p>'
          : '<p class="fine" style="margin-top:10px">Baseline again on '+fmtDate(due)+'.</p>';
      }
      bars.innerHTML=html;
    }

    function renderFeed(enr, awards, courses, rec){
      var feed=$('homeFeed'); if(!feed) return;
      var bySlug={}; courses.forEach(function(c){bySlug[c.slug]=c;});
      var fund=bySlug['fundamentals'];
      var fundEnr = fund ? enr.filter(function(e){return e.course_id===fund.id;})[0] : null;
      var fundAw  = fund ? awards.filter(function(a){return a.course_id===fund.id;})[0] : null;

      var courseCard;
      if(fundAw && (fundAw.status==='signed'||fundAw.status==='awarded')){
        courseCard = card('YOUR CERTIFICATE','Fathering Fundamentals: earned.',
          'Verified, serialed, and publicly checkable. The next tracks are in development.',
          'verify.html','See how verification works');
      } else if(fundEnr){
        courseCard = card('CONTINUE YOUR CERTIFICATE','Fathering Fundamentals',
          'Pick up where you left off. Hours are logged as you watch; each lesson ends in a Checkpoint.',
          'course.html?cert=fundamentals','Continue the course');
      } else {
        courseCard = card('THE FREE COURSE','The 7 Secrets of Effective Fathers',
        'Dr. Ken Canfield\u2019s flagship, free to train. Certify it later for $79 if you want the proof.',
        'class.html','Start free');
      }

      var recCard = rec
        ? card('LATEST RECORDING', (rec.kind||'A message')+' \u00b7 '+new Date(rec.created_at).toLocaleDateString(),
            'Your voice, kept for them. Add one more tonight; two minutes is plenty.',
            'voice.html','Record another')
        : card('THE LEGACY ARCHIVE','No recordings yet.',
            'Sixty seconds of your voice outlasts almost everything else you will make this week.',
            'voice.html','Record your first');

      var tiles =
        '<div class="eyebrow" style="margin:26px 0 12px">THE TRACKS</div><div class="grid-3">'+
        tile('Fathering Fundamentals', fundAw?'EARNED':(fundEnr?'IN PROGRESS':'FREE'), fundEnr||fundAw?'course.html?cert=fundamentals':'class.html')+
        tile('Steady Under Pressure','IN DEVELOPMENT','certificates.html#waitlist')+
        tile('Coming Home Present','IN DEVELOPMENT','certificates.html#waitlist')+
        '</div>';

      feed.innerHTML = '<div class="eyebrow" style="margin:30px 0 12px">YOUR WORK</div>'+
        '<div class="grid-2" style="align-items:stretch">'+courseCard+recCard+'</div>'+tiles;

      function card(eyebrow,h,p,href,cta){
        return '<div class="card" style="padding:24px 26px;display:flex;flex-direction:column">'+
          '<div class="eyebrow" style="margin-bottom:10px">'+eyebrow+'</div>'+
          '<h3 style="margin-bottom:6px">'+esc(h)+'</h3>'+
          '<p class="small" style="color:var(--ash);flex:1">'+p+'</p>'+
          '<p style="margin-top:14px"><a class="btn btn-secondary btn-sm" href="'+href+'">'+cta+'</a></p></div>';
      }
      function tile(title,chip,href){
        return '<a class="card" href="'+href+'" style="padding:18px 20px;text-decoration:none">'+
          '<span class="pill" style="'+(chip==='IN DEVELOPMENT'?'opacity:.7':'')+'">'+chip+'</span>'+
          '<h4 style="margin:10px 0 0">'+esc(title)+'</h4></a>';
      }
    }
  });
})();
