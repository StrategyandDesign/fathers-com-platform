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
      safe(sb.from('circle_posts').select('id',{count:'exact',head:true}).eq('user_id',uid)),
      safe(sb.from('certificate_awards').select('status,course_id').eq('user_id',uid)),
      safe(sb.from('certificate_pursuits').select('course_id,status,state,effective_state').eq('user_id',uid)),
      safe(sb.from('certificate_courses').select('id,slug,title'))
    ]).then(function(res){
      var sess=(res[0].data||[]), cN=res[1].count||0,
          awards=(res[2].data||[]), enr=(res[3].data||[]), courses=(res[4].data||[]);
      var last = sess[sess.length-1] || null;

      var sessIds = sess.map(function(s){return s.id;});
      var pResults = sessIds.length
        ? safe(sb.from('keystone_results').select('session_id,overall_pct,scale_scores').in('session_id', sessIds))
        : Promise.resolve({data:[]});

      pResults.then(function(rr){
        var byS={}; (rr.data||[]).forEach(function(x){ byS[x.session_id]=x; });
        var firstR=null, lastR=null;
        sess.forEach(function(s){ var x=byS[s.id]; if(!x) return; if(!firstR) firstR=x; lastR=x; });
        // Hero dial and the left rail were removed in the single-column redesign.
        // The plan itself (plan-controller.js) is the focus now. Keep the work feed.
        renderFeed(enr, awards, courses, sess);
      });
    });

    function renderFeed(enr, awards, courses, sess){
      var feed=$('homeFeed'); if(!feed) return;
      var bySlug={}; courses.forEach(function(c){bySlug[c.slug]=c;});
      var fund=bySlug['fundamentals'];
      var fundEnr = fund ? enr.filter(function(e){return e.course_id===fund.id;})[0] : null;
      var fundAw  = fund ? awards.filter(function(a){return a.course_id===fund.id;})[0] : null;

      var courseCard;
      if(fundAw && (fundAw.status==='signed'||fundAw.status==='awarded')){
        courseCard = card('YOUR CERTIFICATE OF COMPLETION','Fathering Fundamentals: complete.',
          'Verified, serialed, and publicly checkable. The next courses are in development.',
          'verify.html','See how verification works');
      } else if(fundEnr && fundEnr.effective_state==='stalled'){
        courseCard = card('PICK IT BACK UP','Fathering Fundamentals',
          'Three weeks since your last lesson. Ten minutes tonight restarts the clock; every hour and Checkpoint you logged is still yours.',
          'course.html?cert=fundamentals','Continue the course');
      } else if(fundEnr){
        courseCard = card('CONTINUE YOUR CERTIFICATE','Fathering Fundamentals',
          'Pick up where you left off. Hours are logged as you watch; each lesson ends in a Checkpoint.',
          'course.html?cert=fundamentals','Continue the course');
      } else {
        courseCard = card('THE FREE COURSE','The 7 Secrets of Effective Fathers',
        'Dr. Ken Canfield\u2019s flagship, free to train. Finish it and your Certificate of Completion is issued at no cost.',
        'class.html','Start free');
      }

      var recCard = card('THE PROOF','The Certificate of Completion',
        'Hours logged, checkpoints passed, a final at eighty percent. Serialed, signed, and publicly verifiable. Free to the man who earns it.',
        'certificates.html','See how it works');

      var staleCard = '';
      var lastS = (sess||[])[(sess||[]).length - 1];
      if (lastS && lastS.completed_at){
        var days = Math.floor((Date.now() - new Date(lastS.completed_at).getTime()) / 86400000);
        if (days > 90){
          staleCard = card('THE NINETY DAYS ARE UP','Retake the Keystone Profile',
            'Your last measure was ' + new Date(lastS.completed_at).toLocaleDateString() + ', ' + days + ' days ago. Retake it and see the movement since.',
            'profile.html','Retake now');
        }
      }
      var vetCard = '';

      var tiles =
        '<div class="eyebrow" style="margin:26px 0 12px">THE THREE COURSES</div><div class="grid-3">'+
        tile('Fathering Fundamentals', fundAw?'EARNED':(fundEnr?'IN PROGRESS':'FREE'), fundEnr||fundAw?'course.html?cert=fundamentals':'class.html')+
        tile('Steady Under Pressure','IN DEVELOPMENT','certificates.html#waitlist')+
        tile('Coming Home Present','IN DEVELOPMENT','certificates.html#waitlist')+
        '</div>';

      feed.innerHTML = '<div class="eyebrow" style="margin:30px 0 12px">YOUR WORK</div>'+staleCard+vetCard+
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
