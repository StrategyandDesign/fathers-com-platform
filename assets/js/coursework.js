/* Certificate coursework player. The participant side of the accountability model.
   Twelve-week loop for Steady / Coming Home / Same Team: watch the film, pass the
   checkpoint, complete the lived practice. Session complete is those three, not
   seat time. Fundamentals keep the older film-plus-checkpoint flow.
   Signed-in. Films open without a claim; certificate submit needs enrollment. */
(function(){
  var root = document.getElementById('cw-root');
  if (!root) return;
  function $(id){ return document.getElementById(id); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fmt(sec){ sec=Math.max(0,Math.floor(sec||0)); var m=Math.floor(sec/60), s=sec%60; return m+':'+(s<10?'0':'')+s; }
  function stage(html){ $('cw-stage').innerHTML = html; window.scrollTo({top:0,behavior:'smooth'}); }
  function note(html){ var n=$('cw-note'); if(n) n.innerHTML = html; }

  var qs = new URLSearchParams(location.search);
  var demo = qs.get('preview') === '1' || qs.get('demo') === '1' || !(window.FC && FC.live);
  var slug = (qs.get('cert') || 'anger').toLowerCase();
  // Film-first coursework. Session guides remain available as support.
  /* Manhood is an assessment track, not a film course page (no course-the-man-before-you.html). */
  var SESSIONS_PAGE = {reentry:'course-coming-home-present.html', anger:'course-steady-under-pressure.html', coparenting:'course-same-team.html', fundamentals:'course-fathering-fundamentals.html'};
  var SESSION_ANCHOR = {anger:'b', reentry:'a', coparenting:'c', fundamentals:'f'};
  function sessionGuideHref(sessionIndex){
    var page = SESSIONS_PAGE[slug]; if(!page) return '';
    var prefix = SESSION_ANCHOR[slug] || '';
    if(!prefix || sessionIndex == null) return page;
    /* Fathering Fundamentals guide ids are f0..f8 (Intro through Bonus). */
    var n = (slug === 'fundamentals') ? sessionIndex : (sessionIndex + 1);
    return page + '#' + prefix + String(n);
  }
  var uid=null, course=null, videos=[], progress={}, awardStatus=null, passes={}, finalQa=[];
  var practices={}, practiceLogs={};
  var courseWelcome=null;
  var LOOP_SLUGS = {anger:1, reentry:1, coparenting:1};
  var PREVIEW_STORE = 'fc-cw-preview-';

  // ---------- boot ----------
  function boot(){
    if (demo) { bootDemo(); return; }
    FC.ready.then(function(){
      uid = FC.uid && FC.uid();
      if (!uid) { location.href = 'login.html?next=' + encodeURIComponent('course.html?preview=1&cert='+slug); return; }
      load();
    });
  }

  /* Full offline player for stakeholders and local preview.
     Same outline, session, checkpoint, and final flow as live. */
  function bootDemo(){
    var pack = (window.FC_COURSE_DEMO && FC_COURSE_DEMO[slug]) || null;
    if(!pack){
      stage('<div class="notice brass">Preview catalog missing for this course. Try <a class="link" href="course.html?preview=1&amp;cert=anger">Steady Under Pressure</a>.</div>');
      return;
    }
    course = { id: pack.id, slug: pack.slug, title: pack.title, hours: pack.hours, published: true };
    courseWelcome = pack.welcome || null;
    videos = (pack.videos || []).map(function(v){
      return {
        id: v.id, ord: v.ord, title: v.title, vimeo_id: v.vimeo_id || null,
        duration_seconds: v.duration_seconds || 720,
        video_url: v.video_url || null,
        poster: v.poster || null,
        checkpoint_json: v.checkpoint_json || v.checkpoint || [],
        practice: v.practice || null,
        practice_replay: v.practice_replay || null
      };
    });
    finalQa = pack.final_qa || [];
    progress = {}; passes = {}; practices = {}; practiceLogs = {}; awardStatus = null; enrollId = null;
    loadPreviewState();
    if($('cw-title')) $('cw-title').textContent = course.title + ' (preview)';
    var signedIn = !!(window.FC && FC.uid && FC.uid());
    note('<div class="notice brass" style="margin:0 0 14px"><b>Preview player.</b> <span class="fine">Walk the real week: play the film, pass the checkpoint, complete this week\'s practice. Films are not live yet, so play runs a short stand-in.'+(signedIn?'':' No account needed.')+' When you want proof later, a Certified Facilitator claims your seat and you earn a serial.</span></div>');
    if (shouldOpenWelcome()) openWelcome();
    else {
      var land = firstUnfinishedIndex();
      if(land >= 0) openVideo(land);
      else renderOutline();
    }
  }

  function load(){
    stage('<p class="ash">Loading your course\u2026</p>');
    FC.sb.from('certificate_courses').select('id,slug,title,hours,published').eq('slug',slug).single().then(function(cr){
      if(cr.error || !cr.data){ stage('<div class="notice brass">Course not found.</div>'); return; }
      // A draft is not open to participants. It used to be reachable by typing
      // the slug into the URL, which meant unfinished material could be taken.
      if(cr.data.published === false){
        stage('<div class="notice brass">This course is not open yet. <a class="link" href="certificates.html">See the courses that are</a>.</div>'); return; }
      course = cr.data;
      $('cw-title').textContent = course.title;
      // must be enrolled
      FC.sb.from('certificate_enrollments').select('id,state').eq('user_id',uid).eq('course_id',course.id).maybeSingle().then(function(er){
        if(er.error){ stage('<div class="notice brass">'+esc(er.error.message)+'</div>'); return; }
        if(!er.data){
          enrollId = null; enrollState = null; awardStatus = null;
          note('<div class="notice brass" style="margin:0 0 14px"><b>Films are open.</b> <span class="fine">Watch and practice. A certificate needs a facilitator to claim your seat, then enroll.</span></div>');
          loadContent();
          return;
        }
        enrollId = er.data.id; enrollState = er.data.state || 'enrolled';
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
      FC.sb.from('video_progress').select('video_id,watched_seconds,completed').eq('user_id',uid),
      FC.sb.from('checkpoint_passes').select('video_id').eq('user_id',uid),
      FC.sb.from('practice_completions').select('video_id').eq('user_id',uid)
    ].map(function(p){return p.then(function(r){return r;},function(e){return {error:e};});})).then(function(res){
      if(res[0].error){ stage('<div class="notice brass">Could not load the course right now: '+esc(res[0].error.message)+'. Try again in a moment, or tell your facilitator.</div>'); return; }
      videos = res[0].data || [];
      attachPracticeFromCatalog();
      progress = {}; (res[1].data||[]).forEach(function(p){ progress[p.video_id]=p; });
      passes = {}; ((res[2]&&res[2].data)||[]).forEach(function(p){ passes[p.video_id]=true; });
      practices = {}; ((res[3]&&res[3].data)||[]).forEach(function(p){ practices[p.video_id]={completed:true}; });
      if(!videos.length){
        var sp = SESSIONS_PAGE[slug];
        stage(sp
          ? '<div class="notice brass">This course is film-first. When session films are ready they play here. Until then use <a class="link" href="course.html?preview=1&amp;cert='+esc(slug)+'">the preview player</a> or the written outline on the course page.</div>'
          : '<div class="notice brass">This course is film-first. Session films play here when ready.</div>');
        return;
      }
      attachWelcomeFromCatalog();
      if (shouldOpenWelcome()) openWelcome();
      else renderOutline();
    });
  }

  // ---------- outline ----------
  function hasFilm(v){ return !!(v.duration_seconds && v.duration_seconds > 0); }
  function attachWelcomeFromCatalog(){
    var pack = window.FC_COURSE_DEMO && FC_COURSE_DEMO[slug];
    if (pack && pack.welcome) courseWelcome = pack.welcome;
  }
  function attachPracticeFromCatalog(){
    var pack = window.FC_COURSE_DEMO && FC_COURSE_DEMO[slug];
    if (!pack || !pack.videos) return;
    var byOrd = {};
    pack.videos.forEach(function(v){ byOrd[v.ord] = v; });
    videos.forEach(function(v){
      var cat = byOrd[v.ord];
      if (!cat) return;
      if (!v.practice && cat.practice) v.practice = cat.practice;
      if (!v.practice_replay && cat.practice_replay) v.practice_replay = cat.practice_replay;
    });
  }
  function hasPractice(v){ return !!(v && v.practice && (v.practice.title || v.practice.prompt)); }
  function filmDone(v){
    if (hasFilm(v)) { var p=progress[v.id]; return !!(p && p.completed); }
    return true;
  }
  function checkDone(v){ return !!passes[v.id]; }
  function practiceDone(v){
    if (!hasPractice(v)) return true;
    return !!(practices[v.id] && practices[v.id].completed);
  }
  // Loop courses: film + checkpoint + practice. Fundamentals: film (or checkpoint if no film).
  function videoDone(v){
    if (hasPractice(v) || LOOP_SLUGS[slug]) {
      return filmDone(v) && checkDone(v) && practiceDone(v);
    }
    if (hasFilm(v)) { var p=progress[v.id]; return !!(p && p.completed); }
    return !!passes[v.id];
  }
  function pipClass(on){ return 'cw-loop-pip'+(on?' is-on':''); }
  function loopPipsHtml(v){
    if (!(hasPractice(v) || LOOP_SLUGS[slug])) return '';
    return '<div class="cw-loop-pips" aria-label="Film, checkpoint, practice">'+
      '<span class="'+pipClass(filmDone(v))+'" title="Film"></span>'+
      '<span class="'+pipClass(checkDone(v))+'" title="Checkpoint"></span>'+
      '<span class="'+pipClass(practiceDone(v))+'" title="Practice"></span>'+
      '<span class="cw-loop-legend fine">film / check / practice</span></div>';
  }
  function loadPreviewState(){
    if (!demo) return;
    try {
      var raw = localStorage.getItem(PREVIEW_STORE + slug);
      if (!raw) return;
      var st = JSON.parse(raw);
      progress = st.progress || progress;
      passes = st.passes || passes;
      practices = st.practices || practices;
      practiceLogs = st.logs || practiceLogs;
    } catch(e){}
  }
  function savePreviewState(){
    if (!demo) return;
    try {
      localStorage.setItem(PREVIEW_STORE + slug, JSON.stringify({
        progress: progress, passes: passes, practices: practices, logs: practiceLogs
      }));
    } catch(e){}
  }
  function firstUnfinishedIndex(){ for(var i=0;i<videos.length;i++){ if(!videoDone(videos[i])) return i; } return -1; }
  function allVideosDone(){ return firstUnfinishedIndex() === -1; }

  function welcomeForced(){
    var h = (location.hash || '').replace('#','');
    return qs.get('welcome') === '1' || h === 'welcome' || h === 'start-here';
  }
  function welcomeSeen(){
    try { return localStorage.getItem(PREVIEW_STORE + slug + '-welcome') === '1'; } catch(e){ return false; }
  }
  function markWelcomeSeen(){
    try { localStorage.setItem(PREVIEW_STORE + slug + '-welcome', '1'); } catch(e){}
  }
  function anySessionStarted(){
    return videos.some(function(v){
      return !!(progress[v.id] || passes[v.id] || (practices[v.id] && practices[v.id].completed));
    });
  }
  function shouldOpenWelcome(){
    if (!courseWelcome) return false;
    if (welcomeForced()) return true;
    if (welcomeSeen()) return false;
    if (anySessionStarted()) return false;
    return true;
  }
  function goSession1FromWelcome(){
    markWelcomeSeen();
    if (videos.length) openVideo(0);
    else renderOutline();
  }
  function openWelcome(){
    var w = courseWelcome || {};
    var ref = w.video || '';
    var poster = w.poster || '';
    var media = '';
    if (ref) {
      media = '<div class="cw-welcome-media" id="cw-welcome-media">'+
        '<video id="cw-welcome-vid" class="cw-html5" controls playsinline preload="metadata"'+
        (poster ? ' poster="'+esc(poster)+'"' : '')+
        ' src="'+esc(ref)+'"></video></div>';
    }
    stage(
      '<button class="link ash" id="cw-back-welcome" style="margin-bottom:16px">\u2190 All lessons</button>'+
      '<div class="eyebrow brass">START HERE \u00b7 OPTIONAL</div>'+
      '<h2 class="cw-lesson-title">'+esc(w.title || 'Start here')+'</h2>'+
      '<p class="fine ash" style="margin:0 0 16px">'+esc(w.speakers || 'Ken Canfield and Micah Canfield')+'. Not a week. Skip anytime.</p>'+
      media+
      '<div class="cw-welcome-copy">'+
        '<div class="cw-welcome-block"><div class="eyebrow brass">KEN</div><p>'+esc(w.ken || '')+'</p></div>'+
        '<div class="cw-welcome-block"><div class="eyebrow brass">MICAH</div><p>'+esc(w.micah || '')+'</p></div>'+
      '</div>'+
      '<div class="cw-welcome-actions">'+
        '<button class="btn btn-primary" id="cw-welcome-go">Continue to session 1</button>'+
        '<button class="btn btn-secondary" id="cw-welcome-skip">Skip</button>'+
      '</div>'
    );
    var back = $('cw-back-welcome'); if (back) back.addEventListener('click', function(){ markWelcomeSeen(); renderOutline(); });
    var go = $('cw-welcome-go'); if (go) go.addEventListener('click', goSession1FromWelcome);
    var sk = $('cw-welcome-skip'); if (sk) sk.addEventListener('click', goSession1FromWelcome);
    var vid = $('cw-welcome-vid');
    if (vid){
      vid.addEventListener('error', function(){
        var m = $('cw-welcome-media'); if (m) m.style.display = 'none';
      });
      vid.addEventListener('ended', goSession1FromWelcome);
    }
  }

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
      var started = !!(progress[v.id] || passes[v.id] || (practices[v.id] && practices[v.id].completed));
      var action = (!done && !locked)
        ? '<button class="btn btn-primary btn-sm" data-open="'+i+'">'+(started?'Resume':'Start')+'</button>'
        : (done ? '<button class="btn btn-secondary btn-sm" data-open="'+i+'">Rewatch</button>' : '<button class="btn btn-secondary btn-sm" disabled>Locked</button>');
      var sub = (hasPractice(v) || LOOP_SLUGS[slug])
        ? ('Week '+(i+1)+' of '+videos.length)
        : (fmt(v.duration_seconds)+' \u00b7 Checkpoint after');
      return '<div class="cw-row"><div class="cw-row-main"><div class="cw-row-num">'+(i+1)+'</div>'+
        '<div><div class="cw-row-title">'+esc(v.title)+'</div><div class="fine">'+sub+'</div>'+loopPipsHtml(v)+'</div></div>'+
        '<div class="cw-row-right">'+state+action+'</div></div>';
    }).join('');

    var welcomeRow = '';
    if (courseWelcome) {
      welcomeRow = '<div class="cw-row cw-welcome-row"><div class="cw-row-main"><div class="cw-row-num">\u2022</div>'+
        '<div><div class="cw-row-title">'+esc(courseWelcome.title || 'Start here')+'</div>'+
        '<div class="fine">'+esc(courseWelcome.speakers || 'Ken Canfield and Micah Canfield')+' \u00b7 optional</div></div></div>'+
        '<div class="cw-row-right"><span class="cw-badge">Optional</span>'+
        '<button class="btn btn-secondary btn-sm" id="cw-open-welcome">Watch</button></div></div>';
    }

    var finalReady = allVideosDone() && !!enrollId;
    var finalHint = !allVideosDone() ? 'Finish all lessons first' : (!enrollId ? 'Certificate needs a claimed seat' : 'Ready');
    var finalRight = finalReady
      ? '<button class="btn btn-primary btn-sm" id="cw-final-btn">Begin final</button>'
      : (!allVideosDone()
          ? '<span class="cw-badge cw-locked">Locked</span>'
          : '<a class="btn btn-secondary btn-sm" href="enroll.html?cert='+esc(slug)+'">Claim seat for certificate</a>');
    var finalBlock = '<div class="cw-row cw-final"><div class="cw-row-main"><div class="cw-row-num">\u2691</div>'+
      '<div><div class="cw-row-title">Final Q&amp;A and submit</div><div class="fine">'+finalHint+'</div></div></div>'+
      '<div class="cw-row-right">'+finalRight+'</div></div>';

    var done = videos.filter(videoDone).length;
    stage(
      '<div class="cw-progresshead"><div class="eyebrow brass">YOUR PROGRESS</div>'+
      '<div class="cw-bar"><div class="cw-bar-fill" style="width:'+Math.round(done/videos.length*100)+'%"></div></div>'+
      '<div class="fine" style="margin-top:8px">'+(LOOP_SLUGS[slug]
        ? (done+' of '+videos.length+' weeks complete. Film, checkpoint, and practice each count.')
        : (done+' of '+videos.length+' lessons complete'))+'</div></div>'+
      '<div class="cw-list">'+welcomeRow+rows+finalBlock+'</div>'
    );
    root.querySelectorAll('[data-open]').forEach(function(b){ b.addEventListener('click', function(){ openVideo(parseInt(b.dataset.open,10)); }); });
    var wb=$('cw-open-welcome'); if(wb) wb.addEventListener('click', openWelcome);
    var fb=$('cw-final-btn'); if(fb) fb.addEventListener('click', openFinal);
  }

  function statusPanel(){
    var map = {
      submitted: ['Submitted for review','Your work is in. An administrator will review your Checkpoints and final answers, then approve your certificate. You will be able to sign it here once approved.'],
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

  function openVideo(i, forceFilm){
    curVideo = videos[i];
    var v = curVideo;
    if (!forceFilm && hasPractice(v) && filmDone(v) && checkDone(v) && !practiceDone(v)) {
      openPractice();
      return;
    }
    watched = (progress[v.id] && progress[v.id].watched_seconds) || 0;
    // must reach ~95% of known length before the Checkpoint unlocks (min 5s for tiny demos)
    threshold = Math.max(5, Math.floor((v.duration_seconds||0) * 0.95));

    var ref = v.video_url || '';
    var vid = vimeoId(ref);
    var isMp4 = !!(ref && /\.mp4($|\?)/i.test(ref));
    var poster = v.poster || '';

    var player;
    if (vid) {
      player = '<div class="cw-embed"><iframe id="cw-vimeo" src="https://player.vimeo.com/video/'+esc(vid)+'?title=0&byline=0&portrait=0&pip=0&speed=0&dnt=1" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    } else if (isMp4) {
      player = '<div class="cw-poster-wrap"><video id="cw-video" class="cw-html5" controls playsinline preload="metadata"'+(poster?' poster="'+esc(poster)+'"':'')+' src="'+esc(ref)+'"></video></div>';
    } else if (demo) {
      /* Preview must stay playable even when Supabase is live. Prefer a shape
         still poster when present; otherwise keep the short stand-in sim. */
      if (poster) {
        /* Media stays a clean 16:9 still. Labels + Play sit below, never on the image. */
        player = '<div class="cw-poster-wrap">'+
          '<img src="'+esc(poster)+'" alt="">'+
          '</div>'+
          '<div class="cw-sim-below">'+
          '<div class="eyebrow brass">SHAPE PREVIEW · PLACEHOLDER</div>'+
          '<p class="small ash">Final film goes here. Press play for a short stand-in, then take the checkpoint.</p>'+
          '<button class="btn btn-yellow btn-sm" id="cw-sim">Play preview session</button>'+
          '</div>';
    } else {
        player = '<div class="cw-novid" style="padding:28px 24px;border:1px solid rgba(127,127,127,.28);border-radius:14px;background:rgba(255,255,255,.03)">'+
          '<div class="eyebrow brass" style="margin-bottom:10px">PREVIEW SESSION · PLACEHOLDER</div>'+
          '<h3 style="margin:0 0 8px;font-family:var(--font-display);font-size:26px">'+esc(v.title)+'</h3>'+
          '<p class="small ash" style="margin:0 0 16px;max-width:48ch">Press play to run this session the way the live player will. About eight seconds stands in for the film. Then take the checkpoint.</p>'+
          '<button class="btn btn-yellow" id="cw-sim">Play preview session</button></div>';
      }
    } else {
      var sessHref = sessionGuideHref(i);
      var sessLink = sessHref ? '<a class="btn btn-secondary btn-sm" style="margin-top:12px" href="'+sessHref+'">Read this session\u2019s outline \u2192</a>' : '';
      var posterBlock = poster ? '<div class="cw-poster-wrap" style="margin-bottom:14px"><img src="'+esc(poster)+'" alt=""></div>' : '';
      player = '<div class="cw-novid">'+posterBlock+'<div class="eyebrow brass" style="margin-bottom:10px">Film loading soon</div><p class="small">This session plays on Vimeo here when the film is live. For now, read the outline, then take the checkpoint below.</p>'+sessLink+'</div>';
    }

    var prevOk = i > 0;
    var nextExists = i + 1 < videos.length;
    stage(
      '<div class="row between" style="margin-bottom:16px;align-items:center">'+
        '<button class="link ash" id="cw-back">\u2190 All lessons</button>'+
        '<div class="row" style="gap:10px">'+
          '<button class="btn btn-secondary btn-sm" id="cw-prev"'+(prevOk?'':' disabled')+'>\u2190 Previous</button>'+
          '<button class="btn btn-secondary btn-sm" id="cw-next"'+((nextExists && videoDone(v))?'':' disabled')+
            (nextExists && !videoDone(v) ? ' title="Finish this session to unlock the next"' : '')+'>Next \u2192</button>'+
        '</div>'+
      '</div>'+
      '<div class="eyebrow brass">LESSON '+(i+1)+' OF '+videos.length+'</div>'+
      '<h2 class="cw-lesson-title">'+esc(v.title)+'</h2>'+
      '<div class="cw-video-wrap">'+player+'</div>'+
      '<div class="cw-watch"><div class="cw-watch-bar"><div class="cw-watch-fill" id="cw-watch-fill"></div></div>'+
      '<div class="fine" id="cw-watch-txt"></div></div>'+
      '<div class="cw-video-actions"><button class="btn btn-primary" id="cw-to-debrief" disabled>Continue to Checkpoint</button></div>'
    );
    $('cw-back').addEventListener('click', function(){ stopWatch(); teardownVimeo(); renderOutline(); });
    function goRel(delta){
      var t = i + delta;
      if (t < 0 || t >= videos.length) return;
      if (delta > 0 && !videoDone(videos[i])) return; // forward only through finished work
      stopWatch(); teardownVimeo(); openVideo(t);
    }
    var pv=$('cw-prev'); if(pv) pv.addEventListener('click', function(){ goRel(-1); });
    var nx=$('cw-next'); if(nx) nx.addEventListener('click', function(){ goRel(1); });
    if (window.__cwKeys) document.removeEventListener('keydown', window.__cwKeys);
    window.__cwKeys = function(e){
      if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
      if (!curVideo) return;
      if (e.key === 'ArrowLeft') goRel(-1);
      if (e.key === 'ArrowRight') goRel(1);
    };
    document.addEventListener('keydown', window.__cwKeys);
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
    if (sim){
      sim.addEventListener('click', function(){
        sim.disabled=true; sim.textContent='Playing preview\u2026';
        startWatch();
        // Stakeholder demo: advance a 12-min session in ~8 seconds
        var tick = setInterval(function(){
          watched = Math.min(threshold, watched + Math.max(1, Math.ceil(threshold/8)));
          updateWatchUI();
          if(watched >= threshold){
            clearInterval(tick); stopWatch();
            sim.textContent='Watched (preview)';
          }
        }, 1000);
      });
    }

    var cont=$('cw-to-debrief');
    var filmless = !demo && !vid && !!(window.FC && FC.live);
    if (filmless) {
      cont.disabled = false;
      cont.textContent = passes[v.id] ? 'Retake the checkpoint' : 'Take the checkpoint';
      var wb = root.querySelector('.cw-watch'); if (wb) wb.style.display = 'none';
      cont.addEventListener('click', function(){ openCheckpoint(); });
    } else {
      cont.addEventListener('click', function(){ stopWatch(); teardownVimeo(); saveProgress(true); openCheckpoint(); });
    }
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
        var txt=$('cw-watch-txt'); if(txt) txt.innerHTML='Player could not report progress on this network; hours are credited only from measured playback, so this button alone cannot complete the session. Tell your facilitator, and share docs/NETWORK-REQUIREMENTS.md with the IT desk. <button class="link brass" id="cw-manual">Show my place in the film</button>';
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
    var txt=$('cw-watch-txt'); if(txt) txt.textContent = watched>=threshold ? 'Watched. Checkpoint unlocked.' : ('Watched '+fmt(watched)+' of about '+fmt(threshold)+' needed');
    var cont=$('cw-to-debrief'); if(cont) cont.disabled = watched < threshold;
  }

  var enrollId=null, enrollState=null, lastTouch=0;
  function touchEnrollment(){
    // Certification P0: hours-of-record heartbeat. Keeps last_activity_at honest and
    // flips enrolled -> in_progress on first real work. Throttled to once a minute.
    if(!enrollId) return;
    var flip = enrollState==='enrolled';
    if(!flip && Date.now()-lastTouch < 60000) return;
    lastTouch = Date.now();
    var patch = { last_activity_at: new Date().toISOString() };
    if(flip){ patch.state='in_progress'; enrollState='in_progress'; }
    // Activity and state are derived server-side from progress events; the client no longer writes them.
  }
  function saveProgress(done){
    if(!curVideo) return;
    var completed = done || (progress[curVideo.id] && progress[curVideo.id].completed) || false;
    progress[curVideo.id] = { video_id:curVideo.id, watched_seconds:watched, completed:completed };
    if (demo) { savePreviewState(); return; }
    FC.sb.functions.invoke('progress_beat', { body: { video_id: curVideo.id, position_seconds: watched } }).then(function(){}, function(){});
    touchEnrollment();
  }

  // ---------- debrief ----------
  function openCheckpoint(){
    stage('<p class="ash">Loading the Checkpoint\u2026</p>');
    if (demo){
      var raw = curVideo.checkpoint_json || [];
      var qs = raw.map(function(q, i){
        return {
          id: 'demo-q-'+curVideo.id+'-'+i,
          video_id: curVideo.id,
          ord: i+1,
          prompt: q.prompt,
          choices: q.choices,
          correct_index: (typeof q.correct_index === 'number' ? q.correct_index : 0)
        };
      });
      if(!qs.length){ afterCheckpointPass(); return; }
      renderCheckpoint(qs, 0, {});
      return;
    }
    FC.sb.from('quiz_questions_public').select('id,video_id,ord,prompt,choices').eq('video_id',curVideo.id).order('ord').then(function(r){
      if(r.error){ stage('<div class="notice brass">'+esc(r.error.message)+'</div>'); return; }
      var qs=r.data||[];
      if(!qs.length){ // no debrief authored: still require practice on loop courses
        afterCheckpointPass(); return;
      }
      renderCheckpoint(qs, 0, {});
    });
  }

  function renderCheckpoint(qs, idx, answers){
    var q = qs[idx];
    var choices = (q.choices||[]).map(function(ch,ci){
      return '<button class="cw-choice" data-ci="'+ci+'"><span class="cw-choice-dot"></span>'+esc(ch)+'</button>';
    }).join('');
    stage(
      '<div class="eyebrow brass">DEBRIEF \u00b7 '+esc(curVideo.title)+'</div>'+
      '<div class="fine" style="margin:6px 0 18px">Question '+(idx+1)+' of '+qs.length+'</div>'+
      '<h2 class="cw-q">'+esc(q.prompt)+'</h2>'+
      '<div class="cw-choices">'+choices+'</div>'+
      '<div class="cw-q-actions"><button class="btn btn-primary" id="cw-q-next" disabled>'+(idx===qs.length-1?'Finish Checkpoint':'Next')+'</button></div>'
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
      // The server grades. The client only records what was chosen.
      answers[q.id] = { question_id:q.id, chosen_index:chosen };
      if(idx < qs.length-1){ renderCheckpoint(qs, idx+1, answers); }
      else { submitCheckpointAnswers(qs, answers); }
    });
  }

  function submitCheckpointAnswers(qs, answers){
    if (demo){
      var right = 0;
      qs.forEach(function(q){
        var a = answers[q.id];
        var chosen = a && typeof a.chosen_index === 'number' ? a.chosen_index : -1;
        if (chosen === (typeof q.correct_index === 'number' ? q.correct_index : 0)) right++;
      });
      var pass = right >= Math.ceil(qs.length * 0.8);
      if (pass) passes[curVideo.id] = true;
      showCheckpointResult(pass, right, qs.length);
      return;
    }
    var payload = { video_id: curVideo.id, answers: Object.keys(answers).map(function(k){ return answers[k]; }) };
    FC.sb.functions.invoke('checkpoint_submit', { body: payload }).then(function(res){
      var d = res && res.data;
      if(d && d.locked){
        var mins = d.retry_after_minutes || 60;
        stage('<div class="notice brass">Three tries this hour. Take a break, reread the session, and try again in about '+mins+' minutes. Or grab your facilitator; that is what the room is for.</div>');
        return;
      }
      if((res && res.error) || !d){
        stage('<div class="notice brass">Checkpoint grading runs on the server, and the grading function is not deployed yet. Nothing was recorded; tell your facilitator.</div>');
        return;
      }
      if (d && d.passed && curVideo && !(curVideo.duration_seconds > 0)) { passes[curVideo.id] = true; }
      showCheckpointResult(d.passed, d.right, d.total);
    }, function(){
      stage('<div class="notice brass">Could not reach the grading server. Nothing was recorded; try again in a moment.</div>');
    });
  }
  var LOCK_LINES = {
    anger: {
      1: 'Surge named. Early cues next.',
      2: 'Early cues marked. Six seconds next.',
      3: 'Six seconds in hand. The long exhale next.',
      4: 'Exhale locked in. Step away next.',
      5: 'Step away marked. The leave-line next.',
      6: 'Leave-line set. Naming the feeling next.',
      7: 'Feeling named. Without weapons next.',
      8: 'Loaded words out. Own it same day next.',
      9: 'Owned same day. The short apology next.',
      10: 'Apology kept short. Sleep, food, movement next.',
      11: 'Boring hours marked. Your steady week next.',
      12: 'Steady week set. Final questions when you are ready.'
    }
  };

  function lockLine(v){
    var map = LOCK_LINES[slug] || {};
    if (map[v.ord]) return map[v.ord];
    if (v.ord >= videos.length) return 'Session '+v.ord+' locked in.';
    return 'Session '+v.ord+' locked in. Next up when you are ready.';
  }

  function lockPipsHtml(doneOrd){
    var html = '';
    for (var i = 1; i <= videos.length; i++){
      var cls = 'course-pip';
      if (i < doneOrd) cls += ' is-done';
      else if (i === doneOrd) cls += ' is-done is-here';
      html += '<span class="'+cls+'"></span>';
    }
    return html;
  }

  function afterCheckpointPass(){
    if (!curVideo) return;
    passes[curVideo.id] = true;
    if (demo) savePreviewState();
    if (hasPractice(curVideo) && !practiceDone(curVideo)) { openPractice(); return; }
    markVideoComplete(); note(''); renderOutline();
  }

  function showCheckpointResult(pass, right, total){
    if(pass){
      passes[curVideo.id] = true;
      if (demo) savePreviewState();
      if (hasPractice(curVideo) && !practiceDone(curVideo)) {
        openPractice();
        return;
      }
      markVideoComplete();
      var nextIdx = videos.indexOf(curVideo) + 1;
      var hasNext = nextIdx > 0 && nextIdx < videos.length;
      var btnLabel = hasNext ? ('Continue to Session '+(nextIdx+1)) : 'Continue';
      stage(
        '<div class="cw-lock" data-motion="fade-up">'+
          '<div class="cw-lock-mark" aria-hidden="true">\u2713</div>'+
          '<div class="cw-lock-pips" aria-label="Progress">'+lockPipsHtml(curVideo.ord)+'</div>'+
          '<div class="eyebrow brass" style="margin-bottom:10px">SESSION '+curVideo.ord+' OF '+videos.length+'</div>'+
          '<h2>'+esc(lockLine(curVideo))+'</h2>'+
          '<p>Checkpoint locked in.</p>'+
          '<button class="btn btn-primary" id="cw-continue">'+esc(btnLabel)+'</button>'+
        '</div>'
      );
      if (window.FCMotion && FCMotion.pulseSuccess){
        var mark = root.querySelector('.cw-lock-mark');
        if (mark) FCMotion.pulseSuccess(mark);
      }
      $('cw-continue').addEventListener('click', function(){
        if (hasNext) openVideo(nextIdx);
        else if (demo) openFinal();
        else renderOutline();
      });
    } else {
      stage('<div class="cw-status"><div class="cw-status-icon cw-warn">!</div><h2>Not quite</h2><p>'+right+' of '+total+' correct. Review the lesson and try the Checkpoint again.</p><div class="row" style="gap:12px;justify-content:center"><button class="btn btn-secondary" id="cw-rewatch">Rewatch lesson</button><button class="btn btn-primary" id="cw-retry">Retry Checkpoint</button></div></div>');
      $('cw-rewatch').addEventListener('click', function(){ var i=videos.indexOf(curVideo); openVideo(i); });
      $('cw-retry').addEventListener('click', openCheckpoint);
    }
  }

  function markVideoComplete(){
    progress[curVideo.id] = { video_id:curVideo.id, watched_seconds:Math.max(watched,threshold), completed:true };
    passes[curVideo.id] = true;
    if (demo) { savePreviewState(); return; }
    FC.sb.functions.invoke('progress_beat', { body: { video_id: curVideo.id, position_seconds: Math.max(watched,threshold) } }).then(function(){}, function(){});
  }

  function replayUrl(v){
    var u = v && (v.practice_replay || (v.practice && v.practice.replay));
    u = (u==null?'':String(u)).trim();
    return u;
  }

  function openPractice(){
    var v = curVideo;
    var prac = (v && v.practice) || {};
    var cols = (prac.cols && prac.cols.length) ? prac.cols : ['Trigger', 'What you noticed'];
    var saved = (practiceLogs[v.id] && practiceLogs[v.id].rows) || [];
    var rowsHtml = '';
    for (var r=0; r<3; r++){
      var row = saved[r] || ['',''];
      rowsHtml += '<div class="cw-log-row">'+
        '<span class="cw-log-n">'+(r+1)+'</span>'+
        '<input class="cw-log-in" data-r="'+r+'" data-c="0" maxlength="240" placeholder="'+esc(cols[0]||'')+'" value="'+esc(row[0]||'')+'">'+
        '<input class="cw-log-in" data-r="'+r+'" data-c="1" maxlength="240" placeholder="'+esc(cols[1]||cols[0]||'')+'" value="'+esc(row[1]||'')+'">'+
        '</div>';
    }
    var how = (prac.how||[]).map(function(line){ return '<li>'+esc(line)+'</li>'; }).join('');
    var replay = replayUrl(v);
    var replayBtn = replay
      ? '<button class="btn btn-secondary" type="button" id="cw-replay">Practice replay</button>'
      : '';
    var already = practiceDone(v);
    var nextIdx = videos.indexOf(v) + 1;
    var hasNext = nextIdx > 0 && nextIdx < videos.length;
    var contLabel = hasNext ? ('Continue to week '+(nextIdx+1)) : 'Continue';
    stage(
      '<div class="row between" style="margin-bottom:16px;align-items:center">'+
        '<button class="link ash" id="cw-back-pr">\u2190 All weeks</button>'+
        '<button class="link ash" id="cw-rewatch-film">Rewatch film</button>'+
      '</div>'+
      '<div class="cw-practice">'+
        '<div class="eyebrow brass">PRACTICE \u00b7 WEEK '+esc(String(v.ord))+' OF '+videos.length+'</div>'+
        '<h2 class="cw-lesson-title">'+esc(prac.title || 'This week\'s practice')+'</h2>'+
        '<p class="small" style="margin:0 0 14px;max-width:52ch">'+esc(prac.prompt || '')+'</p>'+
        (how ? '<ul class="cw-how">'+how+'</ul>' : '')+
        '<div class="cw-log" id="cw-log">'+
          '<div class="cw-log-head fine"><span></span><span>'+esc(cols[0]||'')+'</span><span>'+esc(cols[1]||'')+'</span></div>'+
          rowsHtml+
        '</div>'+
        '<p class="fine" id="cw-prac-msg" style="margin:10px 0 0">'+(already?'Saved. The week counts when film, checkpoint, and practice are all done.':'Your notes stay on this device. The Desk only sees that you finished.')+'</p>'+
        '<div id="cw-replay-wrap" class="cw-replay-wrap" hidden></div>'+
        '<div class="cw-video-actions" style="gap:10px;flex-wrap:wrap;margin-top:18px">'+
          '<button class="btn btn-primary" id="cw-prac-save">'+(already?'Update practice':'Save this week\'s practice')+'</button>'+
          replayBtn+
          '<button class="btn btn-secondary" id="cw-prac-next"'+(already?'':' disabled')+'>'+esc(contLabel)+'</button>'+
        '</div>'+
      '</div>'
    );
    $('cw-back-pr').addEventListener('click', function(){ renderOutline(); });
    var rw = $('cw-rewatch-film');
    if (rw) rw.addEventListener('click', function(){ openVideo(videos.indexOf(v), true); });
    $('cw-prac-save').addEventListener('click', function(){ savePractice(false); });
    var nx = $('cw-prac-next');
    if (nx) nx.addEventListener('click', function(){
      if (!practiceDone(v)) return;
      if (hasNext) openVideo(nextIdx);
      else if (demo) openFinal();
      else renderOutline();
    });
    var rb = $('cw-replay');
    if (rb && replay) rb.addEventListener('click', function(){ showPracticeReplay(replay); });
  }

  function readPracticeRows(){
    var rows = [[],[],[]];
    root.querySelectorAll('.cw-log-in').forEach(function(inp){
      var r = parseInt(inp.getAttribute('data-r'),10);
      var c = parseInt(inp.getAttribute('data-c'),10);
      if (!rows[r]) rows[r] = [];
      rows[r][c] = (inp.value||'').trim();
    });
    return rows.map(function(row){ return [row[0]||'', row[1]||'']; });
  }

  function savePractice(){
    if (!curVideo) return;
    var rows = readPracticeRows();
    var filled = rows.filter(function(row){ return (row[0]||row[1]); }).length;
    var msg = $('cw-prac-msg');
    if (!filled){
      if (msg) msg.textContent = 'Log at least one row so the week has a real rep.';
      return;
    }
    practiceLogs[curVideo.id] = { rows: rows };
    practices[curVideo.id] = { completed: true };
    markVideoComplete();
    if (demo) savePreviewState();
    else {
      FC.sb.from('practice_completions').upsert(
        { user_id: uid, video_id: curVideo.id },
        { onConflict: 'user_id,video_id' }
      ).then(function(){}, function(){});
    }
    var nx = $('cw-prac-next'); if (nx) nx.disabled = false;
    var btn = $('cw-prac-save'); if (btn) btn.textContent = 'Update practice';
    if (msg) msg.textContent = 'Saved. Film, checkpoint, and practice are done for this week.';
  }

  function showPracticeReplay(url){
    var wrap = $('cw-replay-wrap');
    if (!wrap) return;
    wrap.hidden = false;
    wrap.innerHTML = '<video id="cw-replay-vid" class="cw-replay-vid" controls playsinline preload="metadata" src="'+esc(url)+'"></video>'+
      '<p class="fine" id="cw-replay-miss" hidden>Replay is not available yet.</p>';
    var vid = $('cw-replay-vid');
    if (!vid) return;
    vid.addEventListener('error', function(){
      vid.style.display = 'none';
      var miss = $('cw-replay-miss'); if (miss) miss.hidden = false;
      var rb = $('cw-replay'); if (rb) rb.style.display = 'none';
    });
  }

  // ---------- final Q&A + submit ----------
  function openFinal(){
    stage('<p class="ash">Loading the final Q&amp;A\u2026</p>');
    if (demo){
      var qs = (finalQa||[]).map(function(q,i){
        return { id: 'demo-final-'+i, ord: i+1, prompt: q.prompt || q };
      });
      renderFinal(qs);
      return;
    }
    FC.sb.from('final_qa_questions').select('*').eq('course_id',course.id).order('ord').then(function(r){
      if(r.error){ stage('<div class="notice brass">'+esc(r.error.message)+'</div>'); return; }
      var qs=r.data||[];
      renderFinal(qs);
    });
  }

  function renderFinal(qs){
    var fields = qs.length ? qs.map(function(q,i){
      return '<div class="cw-qa-item"><label class="cw-qa-label">'+(i+1)+'. '+esc(q.prompt)+'</label>'+
        '<textarea class="cw-qa-input" data-qid="'+esc(q.id)+'" rows="4" placeholder="Write your answer. You do not need to use real names here."></textarea><p class="fine" style="margin-top:4px;color:var(--ash)">You do not need to use real names here.</p></div>';
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
  if(!enrollId){ $('cw-submit-msg').textContent='A certificate needs a facilitator to claim your seat.'; return; }
    var btn=$('cw-submit'); btn.disabled=true; btn.textContent='Submitting\u2026';
    if (demo){
      awardStatus='submitted';
      stage('<div class="cw-status"><div class="cw-status-icon">\u2713</div><h2>Preview finished</h2><p>You walked the session flow. This is not a Certificate of Completion and does not create a serial. To earn proof, a Certified Facilitator claims your seat through a Certified Organization.</p><a class="btn btn-primary" href="organizations.html">How organizations verify men</a> <a class="btn btn-secondary" style="margin-left:8px" href="certificates.html">Back to courses</a></div>');
      return;
    }

    // save all answers, then flip the award to submitted
    var saves = qs.map(function(q){
      var t=root.querySelector('textarea[data-qid="'+q.id+'"]');
      var val = t ? (t.value||'').trim() : '';
      return FC.sb.from('final_qa_responses').upsert({ user_id:uid, question_id:q.id, answer_text:val }, { onConflict:'user_id,question_id' });
    });
    Promise.all(saves.map(function(p){return p.then(function(r){return r;},function(e){return {error:e};});})).then(function(){
      FC.sb.functions.invoke('submit_award', { body: { course_id: course.id } }).then(function(r){
        if(r.error){ btn.disabled=false; btn.textContent='Submit for approval'; $('cw-submit-msg').textContent='Could not submit: '+r.error.message; return; }
        awardStatus='submitted';
        stage(statusPanel());
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
