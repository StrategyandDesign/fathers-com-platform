/* Certificate coursework player. The participant side of the accountability model.
   Watch videos in order (watch time tracked against known length), pass a Debrief
   after each, answer the final Q&A, submit for admin approval. Signed-in + enrolled.
   Reads and writes are RLS-gated (certificate_accountability.sql). */
(function(){
  var root = document.getElementById('cw-root');
  if (!root) return;
  function $(id){ return document.getElementById(id); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fmt(sec){ sec=Math.max(0,Math.floor(sec||0)); var m=Math.floor(sec/60), s=sec%60; return m+':'+(s<10?'0':'')+s; }
  function stage(html){ $('cw-stage').innerHTML = html; window.scrollTo({top:0,behavior:'smooth'}); }
  function note(html){ var n=$('cw-note'); if(n) n.innerHTML = html; }

  var demo = !(window.FC && FC.live);
  var slug = (new URLSearchParams(location.search).get('cert') || 'fundamentals').toLowerCase();
  var uid=null, course=null, videos=[], progress={}, awardStatus=null;

  // ---------- boot ----------
  function boot(){
    if (demo) { stage('<div class="notice brass">Course content loads with a signed-in account.</div>'); return; }
    FC.ready.then(function(){
      uid = FC.uid && FC.uid();
      if (!uid) { location.href = 'login.html?next=' + encodeURIComponent('course.html?cert='+slug); return; }
      load();
    });
  }

  function load(){
    stage('<p class="ash">Loading your course\u2026</p>');
    FC.sb.from('certificate_courses').select('id,slug,title,hours,published').eq('slug',slug).single().then(function(cr){
      if(cr.error || !cr.data){ stage('<div class="notice brass">Course not found.</div>'); return; }
      course = cr.data;
      $('cw-title').textContent = course.title;
      // must be enrolled
      FC.sb.from('certificate_enrollments').select('id').eq('user_id',uid).eq('course_id',course.id).maybeSingle().then(function(er){
        if(er.error){ stage('<div class="notice brass">'+esc(er.error.message)+'</div>'); return; }
        if(!er.data){ stage('<div class="notice brass">You are not enrolled in this certificate yet. <a class="link" href="enroll.html?cert='+esc(slug)+'">Enroll first</a>.</div>'); return; }
        // award status (may already be submitted/approved/signed)
        FC.sb.from('certificate_awards').select('status').eq('user_id',uid).eq('course_id',course.id).maybeSingle().then(function(ar){
          awardStatus = ar.data && ar.data.status;
          loadContent();
        });
      });
    });
  }

  function loadContent(){
    Promise.all([
      FC.sb.from('course_videos').select('*').eq('course_id',course.id).order('ord'),
      FC.sb.from('video_progress').select('video_id,watched_seconds,completed').eq('user_id',uid)
    ].map(function(p){return p.then(function(r){return r;},function(e){return {error:e};});})).then(function(res){
      if(res[0].error){ stage('<div class="notice brass">Could not load videos: '+esc(res[0].error.message)+'. If this mentions a missing table, run certificate_accountability.sql.</div>'); return; }
      videos = res[0].data || [];
      progress = {}; (res[1].data||[]).forEach(function(p){ progress[p.video_id]=p; });
      if(!videos.length){ stage('<div class="notice brass">This certificate has no lessons yet. An admin adds them in the Certificates tab.</div>'); return; }
      renderOutline();
    });
  }

  // ---------- outline ----------
  function videoDone(v){ var p=progress[v.id]; return !!(p && p.completed); }
  function firstUnfinishedIndex(){ for(var i=0;i<videos.length;i++){ if(!videoDone(videos[i])) return i; } return -1; }
  function allVideosDone(){ return firstUnfinishedIndex() === -1; }

  function renderOutline(){
    if (awardStatus==='submitted' || awardStatus==='approved' || awardStatus==='signed'){
      stage(statusPanel()); return;
    }
    var next = firstUnfinishedIndex();
    var rows = videos.map(function(v,i){
      var done = videoDone(v);
      var locked = i > 0 && !videoDone(videos[i-1]);   // sequential: must finish previous
      var state = done ? '<span class="cw-badge cw-done">Done</span>'
                : locked ? '<span class="cw-badge cw-locked">Locked</span>'
                : '<span class="cw-badge cw-now">Continue</span>';
      var action = (!done && !locked)
        ? '<button class="btn btn-primary btn-sm" data-open="'+i+'">'+(progress[v.id]?'Resume':'Start')+'</button>'
        : (done ? '<button class="btn btn-secondary btn-sm" data-open="'+i+'">Rewatch</button>' : '<button class="btn btn-secondary btn-sm" disabled>Locked</button>');
      return '<div class="cw-row"><div class="cw-row-main"><div class="cw-row-num">'+(i+1)+'</div>'+
        '<div><div class="cw-row-title">'+esc(v.title)+'</div><div class="fine">'+fmt(v.duration_seconds)+' \u00b7 Debrief after</div></div></div>'+
        '<div class="cw-row-right">'+state+action+'</div></div>';
    }).join('');

    var finalReady = allVideosDone();
    var finalBlock = '<div class="cw-row cw-final"><div class="cw-row-main"><div class="cw-row-num">\u2691</div>'+
      '<div><div class="cw-row-title">Final Q&amp;A and submit</div><div class="fine">'+(finalReady?'Ready':'Finish all lessons first')+'</div></div></div>'+
      '<div class="cw-row-right">'+(finalReady?'<button class="btn btn-primary btn-sm" id="cw-final-btn">Begin final</button>':'<span class="cw-badge cw-locked">Locked</span>')+'</div></div>';

    var done = videos.filter(videoDone).length;
    stage(
      '<div class="cw-progresshead"><div class="eyebrow brass">YOUR PROGRESS</div>'+
      '<div class="cw-bar"><div class="cw-bar-fill" style="width:'+Math.round(done/videos.length*100)+'%"></div></div>'+
      '<div class="fine" style="margin-top:8px">'+done+' of '+videos.length+' lessons complete</div></div>'+
      '<div class="cw-list">'+rows+finalBlock+'</div>'
    );
    root.querySelectorAll('[data-open]').forEach(function(b){ b.addEventListener('click', function(){ openVideo(parseInt(b.dataset.open,10)); }); });
    var fb=$('cw-final-btn'); if(fb) fb.addEventListener('click', openFinal);
  }

  function statusPanel(){
    var map = {
      submitted: ['Submitted for review','Your work is in. An administrator will review your Debriefs and final answers, then approve your certificate. You will be able to sign it here once approved.'],
      approved:  ['Approved','Your certificate is approved. The signing step will appear here.'],
      signed:    ['Signed','Your certificate is signed and complete. Well done.']
    };
    var m = map[awardStatus] || ['In progress',''];
    return '<div class="cw-status"><div class="cw-status-icon">\u2713</div><h2>'+esc(m[0])+'</h2><p>'+esc(m[1])+'</p>'+
      '<a class="btn btn-secondary" href="plan.html">Back to My Plan</a></div>';
  }

  // ---------- video + watch tracking ----------
  var watchTimer=null, watched=0, threshold=0, curVideo=null;

  // Accepts a bare Vimeo ID (e.g. 1198023217), a vimeo.com URL, or a full MP4 URL.
  function vimeoId(ref){
    if(!ref) return null;
    ref = String(ref).trim();
    if(/^\d+$/.test(ref)) return ref;                                  // bare id
    var m = ref.match(/vimeo\.com\/(?:video\/)?(\d+)/i);               // vimeo url
    return m ? m[1] : null;
  }

  function openVideo(i){
    curVideo = videos[i];
    var v = curVideo;
    watched = (progress[v.id] && progress[v.id].watched_seconds) || 0;
    // must reach ~95% of known length before the Debrief unlocks (min 5s for tiny demos)
    threshold = Math.max(5, Math.floor((v.duration_seconds||0) * 0.95));

    var ref = v.video_url || '';
    var vid = vimeoId(ref);
    var isMp4 = !vid && /^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(ref);

    var player;
    if (vid) {
      player = '<div class="cw-embed"><iframe id="cw-vimeo" src="https://player.vimeo.com/video/'+esc(vid)+'?title=0&byline=0&portrait=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    } else if (isMp4) {
      player = '<video id="cw-video" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000" src="'+esc(ref)+'"></video>';
    } else {
      player = '<div class="cw-novid"><div class="eyebrow brass" style="margin-bottom:10px">No video set</div><p class="small">An admin adds the Vimeo link or ID in the Certificates tab. For now you can simulate watching to preview the flow.</p><button class="btn btn-secondary btn-sm" id="cw-sim" style="margin-top:12px">Simulate watching</button></div>';
    }

    stage(
      '<button class="link ash" id="cw-back" style="margin-bottom:16px">\u2190 All lessons</button>'+
      '<div class="eyebrow brass">LESSON '+(i+1)+' OF '+videos.length+'</div>'+
      '<h2 class="cw-lesson-title">'+esc(v.title)+'</h2>'+
      '<div class="cw-video-wrap">'+player+'</div>'+
      '<div class="cw-watch"><div class="cw-watch-bar"><div class="cw-watch-fill" id="cw-watch-fill"></div></div>'+
      '<div class="fine" id="cw-watch-txt"></div></div>'+
      '<div class="cw-video-actions"><button class="btn btn-primary" id="cw-to-debrief" disabled>Continue to Debrief</button></div>'
    );
    $('cw-back').addEventListener('click', function(){ stopWatch(); teardownVimeo(); renderOutline(); });
    updateWatchUI();

    if (vid) {
      wireVimeo();
    } else {
      var el5 = $('cw-video');
      if (el5){
        el5.addEventListener('timeupdate', function(){ watched = Math.max(watched, Math.floor(el5.currentTime)); updateWatchUI(); });
        el5.addEventListener('play', startWatch);
        el5.addEventListener('pause', stopWatch);
        el5.addEventListener('ended', function(){ watched=Math.max(watched, threshold); stopWatch(); updateWatchUI(); });
      }
    }
    var sim=$('cw-sim');
    if (sim){ sim.addEventListener('click', function(){ startWatch(); sim.textContent='Watching\u2026'; sim.disabled=true; }); }

    var cont=$('cw-to-debrief');
    cont.addEventListener('click', function(){ stopWatch(); teardownVimeo(); saveProgress(true); openDebrief(); });
  }

  // ---- Vimeo Player API tracking (loads the SDK once) ----
  var vimeoPlayer=null;
  function ensureVimeoSDK(){
    return new Promise(function(resolve){
      if (window.Vimeo && window.Vimeo.Player) { resolve(); return; }
      var s=document.createElement('script'); s.src='https://player.vimeo.com/api/player.js';
      s.onload=function(){ resolve(); }; s.onerror=function(){ resolve(); };
      document.head.appendChild(s);
    });
  }
  function wireVimeo(){
    ensureVimeoSDK().then(function(){
      var iframe=$('cw-vimeo');
      if(!iframe || !(window.Vimeo && window.Vimeo.Player)){
        // SDK blocked: fall back to a manual "I watched it" affordance so a father is never stuck.
        var txt=$('cw-watch-txt'); if(txt) txt.innerHTML='Player could not report progress. <button class="link brass" id="cw-manual">I watched the whole lesson</button>';
        var mb=document.getElementById('cw-manual'); if(mb) mb.addEventListener('click', function(){ watched=threshold; updateWatchUI(); });
        return;
      }
      vimeoPlayer = new window.Vimeo.Player(iframe);
      vimeoPlayer.on('timeupdate', function(data){ watched = Math.max(watched, Math.floor(data.seconds||0)); updateWatchUI(); if(watched % 10 === 0) saveProgress(false); });
      vimeoPlayer.on('ended', function(){ watched=Math.max(watched, threshold); updateWatchUI(); saveProgress(true); });
    });
  }
  function teardownVimeo(){ if(vimeoPlayer){ try{ vimeoPlayer.unload(); }catch(e){} vimeoPlayer=null; } }

  function startWatch(){ if(watchTimer || vimeoPlayer) return; watchTimer=setInterval(function(){ watched+=1; updateWatchUI(); if(watched % 10 === 0) saveProgress(false); }, 1000); }
  function stopWatch(){ if(watchTimer){ clearInterval(watchTimer); watchTimer=null; saveProgress(watched>=threshold); } }

  function updateWatchUI(){
    var pct = threshold ? Math.min(100, Math.round(watched/threshold*100)) : 100;
    var fill=$('cw-watch-fill'); if(fill) fill.style.width = pct+'%';
    var txt=$('cw-watch-txt'); if(txt) txt.textContent = watched>=threshold ? 'Watched. Debrief unlocked.' : ('Watched '+fmt(watched)+' of about '+fmt(threshold)+' needed');
    var cont=$('cw-to-debrief'); if(cont) cont.disabled = watched < threshold;
  }

  function saveProgress(done){
    if(!curVideo) return;
    var completed = done || (progress[curVideo.id] && progress[curVideo.id].completed) || false;
    progress[curVideo.id] = { video_id:curVideo.id, watched_seconds:watched, completed:completed };
    FC.sb.from('video_progress').upsert({ user_id:uid, video_id:curVideo.id, watched_seconds:watched, completed:completed, updated_at:new Date().toISOString() }, { onConflict:'user_id,video_id' });
  }

  // ---------- debrief ----------
  function openDebrief(){
    stage('<p class="ash">Loading the Debrief\u2026</p>');
    FC.sb.from('quiz_questions').select('*').eq('video_id',curVideo.id).order('ord').then(function(r){
      if(r.error){ stage('<div class="notice brass">'+esc(r.error.message)+'</div>'); return; }
      var qs=r.data||[];
      if(!qs.length){ // no debrief authored: count the lesson done and move on
        markVideoComplete(); note(''); renderOutline(); return;
      }
      renderDebrief(qs, 0, {});
    });
  }

  function renderDebrief(qs, idx, answers){
    var q = qs[idx];
    var choices = (q.choices||[]).map(function(ch,ci){
      return '<button class="cw-choice" data-ci="'+ci+'"><span class="cw-choice-dot"></span>'+esc(ch)+'</button>';
    }).join('');
    stage(
      '<div class="eyebrow brass">DEBRIEF \u00b7 '+esc(curVideo.title)+'</div>'+
      '<div class="fine" style="margin:6px 0 18px">Question '+(idx+1)+' of '+qs.length+'</div>'+
      '<h2 class="cw-q">'+esc(q.prompt)+'</h2>'+
      '<div class="cw-choices">'+choices+'</div>'+
      '<div class="cw-q-actions"><button class="btn btn-primary" id="cw-q-next" disabled>'+(idx===qs.length-1?'Finish Debrief':'Next')+'</button></div>'
    );
    var chosen=null;
    root.querySelectorAll('.cw-choice').forEach(function(b){
      b.addEventListener('click', function(){
        root.querySelectorAll('.cw-choice').forEach(function(x){x.classList.remove('is-sel');});
        b.classList.add('is-sel'); chosen=parseInt(b.dataset.ci,10);
        $('cw-q-next').disabled=false;
      });
    });
    $('cw-q-next').addEventListener('click', function(){
      var correct = (chosen === q.correct_index);
      answers[q.id] = { chosen_index:chosen, correct:correct };
      FC.sb.from('quiz_responses').upsert({ user_id:uid, question_id:q.id, chosen_index:chosen, correct:correct }, { onConflict:'user_id,question_id' });
      if(idx < qs.length-1){ renderDebrief(qs, idx+1, answers); }
      else { finishDebrief(qs, answers); }
    });
  }

  function finishDebrief(qs, answers){
    var right = Object.keys(answers).filter(function(k){return answers[k].correct;}).length;
    var pass = right >= Math.ceil(qs.length*0.8);   // 80% to pass a Debrief
    if(pass){
      markVideoComplete();
      stage('<div class="cw-status"><div class="cw-status-icon">\u2713</div><h2>Debrief passed</h2><p>'+right+' of '+qs.length+' correct. Lesson complete.</p><button class="btn btn-primary" id="cw-continue">Continue</button></div>');
      $('cw-continue').addEventListener('click', renderOutline);
    } else {
      stage('<div class="cw-status"><div class="cw-status-icon cw-warn">!</div><h2>Not quite</h2><p>'+right+' of '+qs.length+' correct. Review the lesson and try the Debrief again.</p><div class="row" style="gap:12px;justify-content:center"><button class="btn btn-secondary" id="cw-rewatch">Rewatch lesson</button><button class="btn btn-primary" id="cw-retry">Retry Debrief</button></div></div>');
      $('cw-rewatch').addEventListener('click', function(){ var i=videos.indexOf(curVideo); openVideo(i); });
      $('cw-retry').addEventListener('click', openDebrief);
    }
  }

  function markVideoComplete(){
    progress[curVideo.id] = { video_id:curVideo.id, watched_seconds:Math.max(watched,threshold), completed:true };
    FC.sb.from('video_progress').upsert({ user_id:uid, video_id:curVideo.id, watched_seconds:Math.max(watched,threshold), completed:true, updated_at:new Date().toISOString() }, { onConflict:'user_id,video_id' });
  }

  // ---------- final Q&A + submit ----------
  function openFinal(){
    stage('<p class="ash">Loading the final Q&amp;A\u2026</p>');
    FC.sb.from('final_qa_questions').select('*').eq('course_id',course.id).order('ord').then(function(r){
      if(r.error){ stage('<div class="notice brass">'+esc(r.error.message)+'</div>'); return; }
      var qs=r.data||[];
      renderFinal(qs);
    });
  }

  function renderFinal(qs){
    var fields = qs.length ? qs.map(function(q,i){
      return '<div class="cw-qa-item"><label class="cw-qa-label">'+(i+1)+'. '+esc(q.prompt)+'</label>'+
        '<textarea class="cw-qa-input" data-qid="'+esc(q.id)+'" rows="4" placeholder="Write your answer"></textarea></div>';
    }).join('') : '<p class="fine">This certificate has no final questions. You can submit for approval.</p>';

    stage(
      '<button class="link ash" id="cw-back2" style="margin-bottom:16px">\u2190 All lessons</button>'+
      '<div class="eyebrow brass">FINAL Q&amp;A</div>'+
      '<h2 class="cw-lesson-title">Put it in your own words.</h2>'+
      '<p class="small" style="margin-bottom:22px">Answer honestly and in full. An administrator reads these when approving your certificate.</p>'+
      '<div class="cw-qa">'+fields+'</div>'+
      '<div class="cw-video-actions"><button class="btn btn-primary" id="cw-submit">Submit for approval</button><span class="fine" id="cw-submit-msg" style="margin-left:14px"></span></div>'
    );
    $('cw-back2').addEventListener('click', renderOutline);
    // prefill any prior answers
    qs.forEach(function(q){
      FC.sb.from('final_qa_responses').select('answer_text').eq('user_id',uid).eq('question_id',q.id).maybeSingle().then(function(rr){
        if(rr.data && rr.data.answer_text){ var t=root.querySelector('textarea[data-qid="'+q.id+'"]'); if(t) t.value=rr.data.answer_text; }
      });
    });
    $('cw-submit').addEventListener('click', function(){ submitFinal(qs); });
  }

  function submitFinal(qs){
    if(!allVideosDone()){ $('cw-submit-msg').textContent='Finish all lessons first.'; return; }
    var btn=$('cw-submit'); btn.disabled=true; btn.textContent='Submitting\u2026';
    // save all answers, then flip the award to submitted
    var saves = qs.map(function(q){
      var t=root.querySelector('textarea[data-qid="'+q.id+'"]');
      var val = t ? (t.value||'').trim() : '';
      return FC.sb.from('final_qa_responses').upsert({ user_id:uid, question_id:q.id, answer_text:val }, { onConflict:'user_id,question_id' });
    });
    Promise.all(saves.map(function(p){return p.then(function(r){return r;},function(e){return {error:e};});})).then(function(){
      FC.sb.from('certificate_awards').upsert({ user_id:uid, course_id:course.id, status:'submitted' }, { onConflict:'user_id,course_id' }).then(function(r){
        if(r.error){ btn.disabled=false; btn.textContent='Submit for approval'; $('cw-submit-msg').textContent='Could not submit: '+r.error.message; return; }
        awardStatus='submitted';
        stage(statusPanel());
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
