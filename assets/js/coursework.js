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
  function onRh(){ return !!(window.FCPath && FCPath.isRH()); }
  function rhReturnHref(){
    if(window.FCPath && FCPath.homebaseHref && uid) return FCPath.homebaseHref();
    if(window.FCPath && FCPath.deskHref) return FCPath.deskHref();
    return 'rh-desk.html';
  }
  function unit(form){
    var rh = onRh();
    if(form==='cap') return rh ? 'Training' : 'Film';
    if(form==='plural') return rh ? 'trainings' : 'films';
    return rh ? 'training' : 'film';
  }

  var qs = new URLSearchParams(location.search);
  var demo = qs.get('preview') === '1' || qs.get('demo') === '1';
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
  var practices={}, practiceLogs={}, writings={};
  var courseWelcome=null;
  var WRITE_PROMPTS = [
    { key:'learned', label:'What did you learn?', required:true },
    { key:'meaning', label:'What does that mean to you?', required:true },
    { key:'apply', label:'How can you apply this moving forward?', required:true },
    { key:'share', label:'What else would you like to share?', required:false }
  ];
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
    progress = {}; passes = {}; practices = {}; practiceLogs = {}; writings = {}; awardStatus = null; enrollId = null;
    loadPreviewState();
    loadWritingsLocal();
    if($('cw-title')) $('cw-title').textContent = course.title;
    var rh = window.FCPath && FCPath.isRH();
    var eye = document.querySelector('.cw-head .eyebrow');
    if (eye && rh) eye.textContent = 'YOUR TRAINING';
    if (rh) note('');
    else note('<div class="notice brass" style="margin:0 0 14px"><b>Preview.</b> <span class="fine">Play the training. No account needed.</span></div>');
    landPlayer();
  }

  function load(){
    stage('<p class="ash">Loading your course\u2026</p>');
    FC.sb.from('certificate_courses').select('id,slug,title,hours,published').eq('slug',slug).single().then(function(cr){
      if(cr.error || !cr.data){ stage('<div class="notice brass">Course not found.</div>'); return; }
      // A draft is not open to participants. It used to be reachable by typing
      // the slug into the URL, which meant unfinished material could be taken.
      if(cr.data.published === false){
        stage('<div class="notice brass">This course is not open yet. <a class="link" href="'+(window.FCPath && FCPath.catalogHref ? FCPath.catalogHref() : 'certificates.html')+'">See the courses that are</a>.</div>'); return; }
      course = cr.data;
      $('cw-title').textContent = course.title;
      var rh = window.FCPath && FCPath.isRH();
      var eye = document.querySelector('.cw-head .eyebrow');
      if (eye && rh) eye.textContent = 'YOUR TRAINING';
      // must be enrolled
      FC.sb.from('certificate_enrollments').select('id,state').eq('user_id',uid).eq('course_id',course.id).maybeSingle().then(function(er){
        if(er.error){ stage('<div class="notice brass">'+esc(er.error.message)+'</div>'); return; }
        if(!er.data){
          enrollId = null; enrollState = null; awardStatus = null;
          if (rh) note('');
          else note('<div class="notice brass" style="margin:0 0 14px"><b>Films are open.</b> <span class="fine">Watch and practice. A certificate needs a facilitator to claim your seat, then enroll.</span></div>');
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
      FC.sb.from('practice_completions').select('video_id').eq('user_id',uid),
      FC.sb.from('session_writings').select('video_id,session_ord,session_title,learned,meaning,apply,share,saved_at').eq('user_id',uid).eq('course_slug',slug)
    ].map(function(p){return p.then(function(r){return r;},function(e){return {error:e};});})).then(function(res){
      if(res[0].error){ stage('<div class="notice brass">Could not load the course right now: '+esc(res[0].error.message)+'. Try again in a moment, or tell your facilitator.</div>'); return; }
      videos = res[0].data || [];
      attachPracticeFromCatalog();
      progress = {}; (res[1].data||[]).forEach(function(p){ progress[p.video_id]=p; });
      passes = {}; ((res[2]&&res[2].data)||[]).forEach(function(p){ passes[p.video_id]=true; });
      practices = {}; ((res[3]&&res[3].data)||[]).forEach(function(p){ practices[p.video_id]={completed:true}; });
      loadWritingsLocal();
      ((res[4]&&res[4].data)||[]).forEach(function(row){
        writings[row.video_id] = {
          learned: row.learned||'', meaning: row.meaning||'', apply: row.apply||'',
          share: row.share||'', savedAt: row.saved_at||new Date().toISOString()
        };
      });
      saveWritingsLocal();
      if(!videos.length){
        var sp = SESSIONS_PAGE[slug];
        stage(sp
          ? '<div class="notice brass">This course is '+unit()+'-first. When session '+unit('plural')+' are ready they play here. Until then use <a class="link" href="course.html?preview=1&amp;cert='+esc(slug)+'">the preview player</a> or the written outline on the course page.</div>'
          : '<div class="notice brass">This course is '+unit()+'-first. Session '+unit('plural')+' play here when ready.</div>');
        return;
      }
      attachWelcomeFromCatalog();
      landPlayer();
    });
  }

  // ---------- outline ----------
  function hasFilm(v){
    var ref = (v && (v.video_url || v.vimeo_id)) || '';
    if (v && v.vimeo_id && /^\d+$/.test(String(v.vimeo_id))) return true;
    return !!(vimeoId(ref) || youtubeId(ref) || /\.mp4($|\?)/i.test(String(ref)));
  }
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
      if (!v.keyline && cat.keyline) v.keyline = cat.keyline;
    });
  }
  function hasPractice(v){ return !!(v && v.practice && (v.practice.title || v.practice.prompt)); }
  function sessionKeyline(v){
    if (v && v.keyline) return String(v.keyline);
    var pack = window.FC_COURSE_DEMO && FC_COURSE_DEMO[slug];
    if (pack && pack.videos && v){
      for (var i=0;i<pack.videos.length;i++){
        var cat = pack.videos[i];
        if ((cat.id === v.id || cat.ord === v.ord) && cat.keyline) return String(cat.keyline);
      }
    }
    return '';
  }
  function sessionIndexOf(v){
    var i = videos.indexOf(v);
    return i >= 0 ? i : Math.max(0, (v && v.ord ? v.ord : 1) - 1);
  }
  function sessionProgressLabel(v){
    return 'Session '+(sessionIndexOf(v)+1)+' of '+videos.length;
  }
  function writingDone(v){ return !!(v && writings[v.id] && writings[v.id].savedAt); }
  function writingsStoreKey(){ return PREVIEW_STORE + slug + '-writings'; }
  function loadWritingsLocal(){
    try {
      var raw = localStorage.getItem(writingsStoreKey());
      if (!raw) return;
      var st = JSON.parse(raw);
      if (st && typeof st === 'object') writings = Object.assign({}, writings, st);
    } catch(e){}
  }
  function saveWritingsLocal(){
    try { localStorage.setItem(writingsStoreKey(), JSON.stringify(writings)); } catch(e){}
  }
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
      return filmDone(v) && checkDone(v) && writingDone(v) && practiceDone(v);
    }
    if (hasFilm(v)) { var p=progress[v.id]; return !!(p && p.completed) && writingDone(v); }
    return !!passes[v.id] && writingDone(v);
  }
  function pipClass(on){ return 'cw-loop-pip'+(on?' is-on':''); }
  function loopPipsHtml(v){
    if (!(hasPractice(v) || LOOP_SLUGS[slug])) return '';
    return '<div class="cw-loop-pips" aria-label="'+unit('cap')+', checkpoint, practice">'+
      '<span class="'+pipClass(filmDone(v))+'" title="'+unit('cap')+'"></span>'+
      '<span class="'+pipClass(checkDone(v))+'" title="Checkpoint"></span>'+
      '<span class="'+pipClass(practiceDone(v))+'" title="Practice"></span>'+
      '<span class="cw-loop-legend fine">'+unit()+' / check / practice</span></div>';
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
      writings = st.writings || writings;
    } catch(e){}
  }
  function savePreviewState(){
    if (!demo) return;
    try {
      localStorage.setItem(PREVIEW_STORE + slug, JSON.stringify({
        progress: progress, passes: passes, practices: practices, logs: practiceLogs, writings: writings
      }));
    } catch(e){}
  }
  function firstUnfinishedIndex(){ for(var i=0;i<videos.length;i++){ if(!videoDone(videos[i])) return i; } return -1; }
  function allVideosDone(){ return firstUnfinishedIndex() === -1; }
  function isGuestPlay(){ return demo || !uid; }
  function isLoopCourse(){ return !!LOOP_SLUGS[slug]; }
  function sessionWord(form){
    if (isLoopCourse()) return form==='plural' ? 'weeks' : 'week';
    return form==='plural' ? 'lessons' : 'lesson';
  }
  function backLabel(){
    var name = (course && course.title) ? course.title : ('All '+sessionWord('plural'));
    return '\u2190 '+name;
  }

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
      return !!(progress[v.id] || passes[v.id] || writingDone(v) || (practices[v.id] && practices[v.id].completed));
    });
  }
  function shouldOpenWelcome(){
    if (!courseWelcome) return false;
    if (welcomeForced()) return true;
    if (qs.get('welcome') === '0') return false;
    /* Unsigned / preview: do not resume a stranger into the middle.
       Fundamentals opens on the Ken preview. The week trainings open at week 1. */
    if (isGuestPlay()) return slug === 'fundamentals';
    if (welcomeSeen()) return false;
    if (anySessionStarted()) return false;
    return true;
  }
  function landPlayer(){
    if (shouldOpenWelcome()) { openWelcome(); return; }
    if (isGuestPlay() && videos.length) { openVideo(0); return; }
    renderOutline();
  }
  function goSession1FromWelcome(){
    markWelcomeSeen();
    if (videos.length) openVideo(0);
    else renderOutline();
  }
  function openWelcome(){
    var w = courseWelcome || {};
    var ref = w.video || '';
    var poster = w.poster || 'assets/img/ken-and-micah.jpg';
    var media = mediaFrame(ref, poster, 'cw-welcome-vid');
    var nextWord = isLoopCourse() ? 'week 1' : 'lesson 1';
    stage(
      '<button class="link ash" id="cw-back-welcome" style="margin-bottom:16px">'+esc(backLabel())+'</button>'+
      '<div class="eyebrow brass">PREVIEW</div>'+
      '<h2 class="cw-lesson-title">'+esc(w.title || 'Ken and Micah')+'</h2>'+
      '<p class="fine ash" style="margin:0 0 16px">'+esc(w.speakers || 'Ken Canfield and Micah Canfield')+' open this training. Then '+nextWord+'.</p>'+
      media+
      '<div class="cw-placeholder" id="cw-welcome-ph"'+(ref ? ' hidden' : '')+'><p class="small" style="margin:0">Ken and Micah open this training. Then you start lesson 1.</p></div>'+
      '<div class="cw-welcome-actions">'+
        '<button class="btn btn-primary" id="cw-welcome-go">Continue to '+nextWord+'</button>'+
        '<button class="btn btn-secondary" id="cw-welcome-skip">Skip</button>'+
      '</div>'
    );
    var back = $('cw-back-welcome'); if (back) back.addEventListener('click', function(){ markWelcomeSeen(); renderOutline(); });
    var go = $('cw-welcome-go'); if (go) go.addEventListener('click', goSession1FromWelcome);
    var sk = $('cw-welcome-skip'); if (sk) sk.addEventListener('click', goSession1FromWelcome);
    var vid = $('cw-welcome-vid');
    if (vid){
      vid.addEventListener('error', function(){
        var m = $('cw-welcome-media'); if (m) m.style.display = 'none'; var ph = $('cw-welcome-ph'); if (ph) ph.hidden = false;
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
      var started = !!(progress[v.id] || passes[v.id] || writingDone(v) || (practices[v.id] && practices[v.id].completed));
      var action = (!done && !locked)
        ? '<button class="btn btn-primary btn-sm" data-open="'+i+'">'+(started?'Resume':'Start')+'</button>'
        : (done ? '<button class="btn btn-secondary btn-sm" data-open="'+i+'">Rewatch</button>' : '<button class="btn btn-secondary btn-sm" disabled>Locked</button>');
      var sub = (hasPractice(v) || isLoopCourse())
        ? ('Week '+(i+1)+' of '+videos.length)
        : ('Lesson '+(i+1)+' of '+videos.length);
      return '<div class="cw-row"><div class="cw-row-main"><div class="cw-row-num">'+(i+1)+'</div>'+
        '<div><div class="cw-row-title">'+esc(v.title)+'</div><div class="fine">'+sub+'</div>'+loopPipsHtml(v)+'</div></div>'+
        '<div class="cw-row-right">'+state+action+'</div></div>';
    }).join('');

    var welcomeRow = '';
    if (courseWelcome) {
      welcomeRow = '<div class="cw-row cw-welcome-row"><div class="cw-row-main"><div class="cw-row-num">\u2022</div>'+
        '<div><div class="cw-row-title">'+esc(courseWelcome.title || 'Ken and Micah')+'</div>'+
        '<div class="fine">'+esc(courseWelcome.speakers || 'Ken Canfield and Micah Canfield')+' \u00b7 preview</div></div></div>'+
        '<div class="cw-row-right"><span class="cw-badge">Preview</span>'+
        '<button class="btn btn-secondary btn-sm" id="cw-open-welcome">Watch</button></div></div>';
    }

    var finalBlock = '';
    if (!onRh()) {
      var finalReady = allVideosDone() && !!enrollId;
      var finalHint = !allVideosDone() ? 'Finish all lessons first' : (!enrollId ? 'Certificate needs a claimed seat' : 'Ready');
      var finalRight = finalReady
        ? '<button class="btn btn-primary btn-sm" id="cw-final-btn">Begin final</button>'
        : (!allVideosDone()
            ? '<span class="cw-badge cw-locked">Locked</span>'
            : '<a class="btn btn-secondary btn-sm" href="enroll.html?cert='+esc(slug)+'">Claim seat for certificate</a>');
      finalBlock = '<div class="cw-row cw-final"><div class="cw-row-main"><div class="cw-row-num">\u2691</div>'+
        '<div><div class="cw-row-title">Final Q&amp;A and submit</div><div class="fine">'+finalHint+'</div></div></div>'+
        '<div class="cw-row-right">'+finalRight+'</div></div>';
    }

    var done = videos.filter(videoDone).length;
    var writeCards = videos.filter(writingDone).map(function(v){
      var w = writings[v.id] || {};
      var when = w.savedAt ? new Date(w.savedAt).toLocaleDateString() : '';
      return '<div class="cw-write-card">'+
        '<h3>'+esc(v.title)+'</h3>'+
        '<p class="fine" style="margin:0 0 10px">'+esc(sessionProgressLabel(v))+(when?' \u00b7 '+esc(when):'')+'</p>'+
        WRITE_PROMPTS.map(function(p){
          var ans = (w[p.key]||'').trim();
          if (!ans) return '';
          return '<p class="small" style="margin:0 0 8px"><b>'+esc(p.label)+'</b><br>'+esc(ans)+'</p>';
        }).join('')+
        '<button class="btn btn-secondary btn-sm" data-write="'+videos.indexOf(v)+'">Edit</button></div>';
    }).join('');
    var writeBlock = writeCards
      ? '<div class="cw-write-list" style="margin-top:28px"><div class="eyebrow brass">YOUR WRITING</div>'+writeCards+'</div>'
      : '';
    stage(
      '<div class="cw-progresshead"><div class="eyebrow brass">YOUR PROGRESS</div>'+
      '<div class="cw-bar"><div class="cw-bar-fill" style="width:'+Math.round(done/videos.length*100)+'%"></div></div>'+
      '<div class="fine" style="margin-top:8px">'+(isLoopCourse()
        ? (done+' of '+videos.length+' weeks complete. '+unit('cap')+', checkpoint, writing, and practice each count.')
        : (done+' of '+videos.length+' sessions complete'))+'</div></div>'+
      '<div class="cw-list">'+welcomeRow+rows+finalBlock+'</div>'+writeBlock
    );
    root.querySelectorAll('[data-open]').forEach(function(b){ b.addEventListener('click', function(){ openVideo(parseInt(b.dataset.open,10)); }); });
    root.querySelectorAll('[data-write]').forEach(function(b){ b.addEventListener('click', function(){
      curVideo = videos[parseInt(b.dataset.write,10)];
      if (curVideo) openWriting();
    }); });
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
      '<a class="btn btn-secondary" href="'+(onRh() ? rhReturnHref() : 'plan.html')+'">'+(onRh() ? 'Back to your home' : 'Back to My Plan')+'</a></div>';
  }

  // ---------- video + watch tracking ----------
  var watchTimer=null, watched=0, threshold=0, curVideo=null, needWatch=true, gradeLocal=false;

  // Accepts a bare Vimeo ID (e.g. 1198023217), a vimeo.com URL, or a full MP4 URL.
  function vimeoId(ref){
    if(!ref) return null;
    ref = String(ref).trim();
    if(/^\d+$/.test(ref)) return ref;                                  // bare id
    var m = ref.match(/vimeo\.com\/(?:video\/)?(\d+)/i);               // vimeo url
    return m ? m[1] : null;
  }
  function youtubeId(ref){
    if(!ref) return null;
    ref = String(ref).trim();
    var m = ref.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return m ? m[1] : null;
  }
  function mediaFrame(ref, poster, videoId){
    var vid = vimeoId(ref);
    var yt = youtubeId(ref);
    var isMp4 = !!(ref && /\.mp4($|\?)/i.test(ref));
    var vidEl = videoId || 'cw-video';
    if (vid) {
      return '<div class="cw-embed" id="cw-welcome-media">'+
        '<iframe id="cw-vimeo" src="https://player.vimeo.com/video/'+esc(vid)+'?title=0&byline=0&portrait=0&pip=0&speed=0&dnt=1" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    }
    if (yt) {
      return '<div class="cw-embed" id="cw-welcome-media">'+
        '<iframe id="cw-youtube" src="https://www.youtube.com/embed/'+esc(yt)+'?rel=0&modestbranding=1&playsinline=1" allow="autoplay; fullscreen; encrypted-media" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    }
    if (isMp4) {
      return '<div class="cw-welcome-media" id="cw-welcome-media">'+
        '<video id="'+esc(vidEl)+'" class="cw-html5" controls playsinline preload="metadata"'+
        (poster ? ' poster="'+esc(poster)+'"' : '')+
        ' src="'+esc(ref)+'"></video></div>';
    }
    return '';
  }

  function openVideo(i, forceFilm){
    curVideo = videos[i];
    var v = curVideo;
    if (!forceFilm && hasPractice(v) && filmDone(v) && checkDone(v) && !practiceDone(v)) {
      openPractice();
      return;
    }
    watched = (progress[v.id] && progress[v.id].watched_seconds) || 0;
    needWatch = true;
    // must reach ~95% of known length before the Checkpoint unlocks (min 5s for tiny demos)
    threshold = Math.max(5, Math.floor((v.duration_seconds||0) * 0.95));

    var ref = v.video_url || '';
    var vid = vimeoId(ref);
    var yt = youtubeId(ref);
    var isMp4 = !!(ref && /\.mp4($|\?)/i.test(ref));
    var poster = v.poster || '';
    var hasMedia = !!(vid || yt || isMp4);

    var player;
    if (vid) {
      player = '<div class="cw-embed"><iframe id="cw-vimeo" src="https://player.vimeo.com/video/'+esc(vid)+'?title=0&byline=0&portrait=0&pip=0&speed=0&dnt=1" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    } else if (yt) {
      player = '<div class="cw-embed"><iframe id="cw-youtube" src="https://www.youtube.com/embed/'+esc(yt)+'?rel=0&modestbranding=1&playsinline=1" allow="autoplay; fullscreen; encrypted-media" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>';
    } else if (isMp4) {
      player = '<div class="cw-poster-wrap"><video id="cw-video" class="cw-html5" controls playsinline preload="metadata"'+(poster?' poster="'+esc(poster)+'"':'')+' src="'+esc(ref)+'"></video></div>';
    } else if (demo && slug !== 'fundamentals' && poster) {
      player = '<div class="cw-poster-wrap">'+
        '<img src="'+esc(poster)+'" alt="">'+
        '</div>'+
        '<div class="cw-sim-below">'+
        '<button class="btn btn-yellow btn-sm" id="cw-sim">Play</button>'+
        '</div>';
    } else if (demo && slug !== 'fundamentals') {
      player = '<div class="cw-poster-wrap cw-film-slot">'+
        '<button class="btn btn-yellow" id="cw-sim">Play</button></div>';
    } else {
      var line = sessionKeyline(v);
      var outline = line
        ? '<div class="cw-sess-outline"><div class="eyebrow brass">THIS SESSION</div><p class="small">'+esc(line)+'</p></div>'
        : '';
      player = '<div class="cw-novid"><p class="small" style="margin:0">Take the checkpoint when you are ready.</p>'+outline+'</div>';
    }
    var voiceNote = (slug === 'anger' && isMp4)
      ? '<p class="fine ash" style="margin:10px 0 0">This voice is a stand-in. A person still has to read it.</p>'
      : '';

    var prevOk = i > 0;
    var nextExists = i + 1 < videos.length;
    stage(
      '<div class="row between" style="margin-bottom:16px;align-items:center">'+
        '<button class="link ash" id="cw-back">'+esc(backLabel())+'</button>'+
        '<div class="row" style="gap:10px">'+
          '<button class="btn btn-secondary btn-sm" id="cw-prev"'+(prevOk?'':' disabled')+'>\u2190 Previous</button>'+
          '<button class="btn btn-secondary btn-sm" id="cw-next"'+((nextExists && videoDone(v))?'':' disabled')+
            (nextExists && !videoDone(v) ? ' title="Finish this session to unlock the next"' : '')+'>Next \u2192</button>'+
        '</div>'+
      '</div>'+
      '<div class="eyebrow brass">'+(isLoopCourse()?'WEEK':'LESSON')+' '+(i+1)+' OF '+videos.length+'</div>'+
      '<h2 class="cw-lesson-title">'+esc(v.title)+'</h2>'+
      '<div class="cw-video-wrap">'+player+'</div>'+voiceNote+
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

    var cont=$('cw-to-debrief');
    function unlockFilmlessCheckpoint(){
      if (!cont) return;
      hasMedia = false;
      needWatch = false;
      cont.disabled = false;
      cont.textContent = passes[v.id] ? 'Retake the checkpoint' : 'Take the checkpoint';
      var wb = root.querySelector('.cw-watch'); if (wb) wb.style.display = 'none';
    }
    if (!hasMedia) unlockFilmlessCheckpoint();
    if (cont) cont.addEventListener('click', function(){
      if (hasMedia && watched < threshold) return;
      stopWatch(); teardownVimeo();
      if (hasMedia) saveProgress(watched>=threshold);
      openCheckpoint();
    });

    if (vid) {
      wireVimeo();
    } else if (yt) {
      unlockFilmlessCheckpoint();
      var ytxt=$('cw-watch-txt');
      if (ytxt) ytxt.textContent = 'This player cannot measure watch time. Take the checkpoint when you have watched.';
    } else {
      var el5 = $('cw-video');
      if (el5){
        function syncFromMedia(){
          watched = Math.max(watched, Math.floor(el5.currentTime || 0));
          var real = el5.duration && isFinite(el5.duration) ? el5.duration : 0;
          if (real > 0) threshold = Math.max(5, Math.floor(real * 0.95));
          updateWatchUI();
        }
        el5.addEventListener('loadedmetadata', syncFromMedia);
        el5.addEventListener('timeupdate', syncFromMedia);
        el5.addEventListener('seeked', syncFromMedia);
        el5.addEventListener('play', startWatch);
        el5.addEventListener('pause', stopWatch);
        el5.addEventListener('ended', function(){ watched=Math.max(watched, threshold); stopWatch(); updateWatchUI(); });
        el5.addEventListener('error', function(){ unlockFilmlessCheckpoint(); });
        if (el5.error) unlockFilmlessCheckpoint();
        setTimeout(function(){
          if (!needWatch) return;
          var real = el5.duration && isFinite(el5.duration) ? el5.duration : 0;
          if (real <= 0) unlockFilmlessCheckpoint();
        }, 4000);
      }
    }
    var sim=$('cw-sim');
    if (sim){
      sim.addEventListener('click', function(){
        sim.disabled=true; sim.textContent='No film here yet';
      });
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
        var txt=$('cw-watch-txt'); if(txt) txt.innerHTML='Player could not report progress on this network; hours are credited only from measured playback, so this button alone cannot complete the session. Tell your facilitator, and share docs/NETWORK-REQUIREMENTS.md with the IT desk. <button class="link brass" id="cw-manual">Show my place in the '+unit()+'</button>';
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
    var cont=$('cw-to-debrief'); if(cont) cont.disabled = needWatch && watched < threshold;
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
    var earned = !!(done && hasFilm(curVideo) && watched >= 5);
    var completed = earned || (progress[curVideo.id] && progress[curVideo.id].completed) || false;
    progress[curVideo.id] = { video_id:curVideo.id, watched_seconds:watched, completed:completed };
    if (demo) { savePreviewState(); return; }
    FC.sb.functions.invoke('progress_beat', { body: { video_id: curVideo.id, position_seconds: watched } }).then(function(){}, function(){});
    touchEnrollment();
  }

  // ---------- debrief ----------
  function catalogQuestions(video){
    var pack = window.FC_COURSE_DEMO && FC_COURSE_DEMO[slug];
    if (!pack || !pack.videos || !video) return [];
    var cat = null;
    pack.videos.forEach(function(x){
      if (x.ord === video.ord || x.id === video.id) cat = x;
    });
    var raw = (video.checkpoint_json && video.checkpoint_json.length)
      ? video.checkpoint_json
      : ((cat && (cat.checkpoint_json || cat.checkpoint)) || []);
    return raw.map(function(q, i){
      return {
        id: 'demo-q-'+video.id+'-'+i,
        video_id: video.id,
        ord: i+1,
        prompt: q.prompt,
        choices: q.choices,
        correct_index: (typeof q.correct_index === 'number' ? q.correct_index : 0)
      };
    });
  }
  function openEmptyCheckpoint(){
    stage(
      '<div class="eyebrow brass">CHECKPOINT</div>'+
      '<div class="fine" style="margin:6px 0 12px">'+esc(sessionProgressLabel(curVideo))+'</div>'+
      '<div class="notice brass">This checkpoint is not written yet. No score was recorded. You can continue the training.</div>'+
      '<div class="cw-video-actions"><button class="btn btn-primary" id="cw-empty-next">Continue</button></div>'
    );
    var b=$('cw-empty-next');
    if (b) b.addEventListener('click', function(){
      passes[curVideo.id] = true;
      if (demo) savePreviewState();
      openWriting();
    });
  }
  function openCheckpoint(){
    stage('<p class="ash">Loading the Checkpoint\u2026</p>');
    gradeLocal = false;
    if (demo){
      var qs = catalogQuestions(curVideo);
      if(!qs.length){ openEmptyCheckpoint(); return; }
      gradeLocal = true;
      renderCheckpoint(qs, 0, {});
      return;
    }
    FC.sb.from('quiz_questions_public').select('id,video_id,ord,prompt,choices').eq('video_id',curVideo.id).order('ord').then(function(r){
      var qs=r.data||[];
      if(!r.error && qs.length){ renderCheckpoint(qs, 0, {}); return; }
      var fallback = catalogQuestions(curVideo);
      if (fallback.length){
        gradeLocal = true;
        renderCheckpoint(fallback, 0, {});
        return;
      }
      if(r.error){ stage('<div class="notice brass">'+esc(r.error.message)+' Log in again if this keeps happening, then retry the checkpoint.</div>'); return; }
      openEmptyCheckpoint();
    }, function(){
      var fallback = catalogQuestions(curVideo);
      if (fallback.length){ gradeLocal = true; renderCheckpoint(fallback, 0, {}); return; }
      stage('<div class="notice brass">Could not load the checkpoint. Check your connection and try again. If you are signed out, log in and reopen this training.</div>');
    });
  }

  function renderCheckpoint(qs, idx, answers){
    var q = qs[idx];
    var choices = (q.choices||[]).map(function(ch,ci){
      return '<button class="cw-choice" data-ci="'+ci+'"><span class="cw-choice-dot"></span>'+esc(ch)+'</button>';
    }).join('');
    stage(
      '<div class="eyebrow brass">DEBRIEF</div>'+
      '<div class="fine" style="margin:6px 0 18px">'+esc(sessionProgressLabel(curVideo))+' \u00b7 Question '+(idx+1)+' of '+qs.length+' \u00b7 '+esc(curVideo.title)+'</div>'+
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
    if (demo || gradeLocal){
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
    openWriting();
  }

  function showCheckpointResult(pass, right, total){
    if(pass){
      passes[curVideo.id] = true;
      if (demo) savePreviewState();
      openWriting();
    } else {
      stage('<div class="fine" style="margin:0 0 12px">'+esc(sessionProgressLabel(curVideo))+'</div><div class="cw-status"><div class="cw-status-icon cw-warn">!</div><h2>Not quite</h2><p>'+right+' of '+total+' correct. Review the lesson and try the Checkpoint again.</p><div class="row" style="gap:12px;justify-content:center"><button class="btn btn-secondary" id="cw-rewatch">Rewatch lesson</button><button class="btn btn-primary" id="cw-retry">Retry Checkpoint</button></div></div>');
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

  function persistWriting(payload){
    if (!curVideo) return;
    writings[curVideo.id] = payload;
    saveWritingsLocal();
    if (demo) savePreviewState();
    if (isGuestPlay()) return;
    if (!uid || !FC.sb) return;
    FC.sb.from('session_writings').upsert({
      user_id: uid,
      course_slug: slug,
      video_id: String(curVideo.id),
      session_ord: curVideo.ord || (sessionIndexOf(curVideo)+1),
      session_title: curVideo.title || '',
      learned: payload.learned,
      meaning: payload.meaning,
      apply: payload.apply,
      share: payload.share,
      saved_at: payload.savedAt
    }, { onConflict: 'user_id,course_slug,video_id' }).then(function(){}, function(){});
  }

  function continueAfterWriting(){
    markVideoComplete();
    if (hasPractice(curVideo) && !practiceDone(curVideo)) { openPractice(); return; }
    var nextIdx = videos.indexOf(curVideo) + 1;
    if (nextIdx > 0 && nextIdx < videos.length) openVideo(nextIdx);
    else if (demo) openFinal();
    else renderOutline();
  }

  function openWriting(){
    var v = curVideo;
    if (!v) { renderOutline(); return; }
    var saved = writings[v.id] || {};
    var fields = WRITE_PROMPTS.map(function(p){
      return '<div class="cw-write-item"><label for="cw-w-'+p.key+'">'+esc(p.label)+'</label>'+
        '<textarea class="cw-qa-input" id="cw-w-'+p.key+'" data-wk="'+p.key+'" rows="3" maxlength="2000">'+esc(saved[p.key]||'')+'</textarea></div>';
    }).join('');
    var keep = isGuestPlay()
      ? 'Saved on this device. An account keeps it.'
      : 'Saved to your account and this device.';
    var already = writingDone(v);
    stage(
      '<button class="link ash" id="cw-back-w" style="margin-bottom:16px">'+esc(backLabel())+'</button>'+
      '<div class="cw-write">'+
        '<div class="eyebrow brass">WRITE</div>'+
        '<div class="fine" style="margin:6px 0 12px">'+esc(sessionProgressLabel(v))+'</div>'+
        '<h2 class="cw-lesson-title">Write this session.</h2>'+
        '<p class="small" style="margin:0 0 18px;max-width:52ch">Four answers. You save them. Your case worker can see you finished.</p>'+
        fields+
        '<p class="fine" id="cw-w-msg" style="margin:8px 0 0">'+(already?keep:'')+'</p>'+
        '<div class="cw-video-actions" style="margin-top:18px">'+
          '<button class="btn btn-primary" id="cw-w-save">'+(already?'Update and continue':'Save and continue')+'</button>'+
        '</div>'+
      '</div>'
    );
    $('cw-back-w').addEventListener('click', renderOutline);
    $('cw-w-save').addEventListener('click', function(){
      var payload = { learned:'', meaning:'', apply:'', share:'', savedAt: new Date().toISOString() };
      WRITE_PROMPTS.forEach(function(p){
        var t = $('cw-w-'+p.key);
        payload[p.key] = t ? (t.value||'').trim() : '';
      });
      var msg = $('cw-w-msg');
      var missing = WRITE_PROMPTS.filter(function(p){ return p.required && !payload[p.key]; });
      if (missing.length){
        if (msg) msg.textContent = 'Write the first three. The last one is yours if you want it.';
        return;
      }
      persistWriting(payload);
      if (shouldAskGuestAttach()){
        try { localStorage.setItem('fc_rh_attach_asked','1'); } catch(e){}
        showGuestAttach();
        return;
      }
      if (msg) msg.textContent = keep;
      continueAfterWriting();
    });
  }

  function shouldAskGuestAttach(){
    if (!isGuestPlay()) return false;
    if (!onRh()) return false;
    try { if (localStorage.getItem('fc_rh_attach_asked') === '1') return false; } catch(e){}
    return true;
  }

  function showGuestAttach(){
    stage(
      '<div class="cw-write">'+
        '<p class="small" style="margin:0 0 10px">This stays with you.</p>'+
        '<p class="fine" style="margin:0 0 18px">An account keeps it on every device. '+
          '<a href="login.html?path=rh&amp;next=rh-home.html">Log in</a> · '+
          '<a href="login.html?path=rh&amp;mode=signup&amp;next=rh-home.html">Create account</a></p>'+
        '<div class="cw-video-actions">'+
          '<button class="btn btn-primary" id="cw-w-keep">Continue</button>'+
        '</div>'+
      '</div>'
    );
    var keepBtn = $('cw-w-keep');
    if (keepBtn) keepBtn.addEventListener('click', continueAfterWriting);
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
        '<button class="link ash" id="cw-back-pr">'+esc(backLabel())+'</button>'+
        '<button class="link ash" id="cw-rewatch-film">Rewatch '+unit()+'</button>'+
      '</div>'+
      '<div class="cw-practice">'+
        '<div class="eyebrow brass">PRACTICE</div>'+
        '<div class="fine" style="margin:6px 0 12px">'+esc(sessionProgressLabel(v))+'</div>'+
        '<h2 class="cw-lesson-title">'+esc(prac.title || 'This week\'s practice')+'</h2>'+
        '<p class="small" style="margin:0 0 14px;max-width:52ch">'+esc(prac.prompt || '')+'</p>'+
        (how ? '<ul class="cw-how">'+how+'</ul>' : '')+
        '<div class="cw-log" id="cw-log">'+
          '<div class="cw-log-head fine"><span></span><span>'+esc(cols[0]||'')+'</span><span>'+esc(cols[1]||'')+'</span></div>'+
          rowsHtml+
        '</div>'+
        '<p class="fine" id="cw-prac-msg" style="margin:10px 0 0">'+(already?'Saved. The week counts when '+unit()+', checkpoint, and practice are all done.':'Your notes stay on this device. The Desk only sees that you finished.')+'</p>'+
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
    if (msg) msg.textContent = 'Saved. '+unit('cap')+', checkpoint, and practice are done for this week.';
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
      '<button class="link ash" id="cw-back2" style="margin-bottom:16px">'+esc(backLabel())+'</button>'+
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
      stage((window.FCPath && FCPath.isRH())
        ? '<div class="cw-status"><div class="cw-status-icon">\u2713</div><h2>Session finished</h2><p>You can keep watching.</p><a class="btn btn-primary" href="'+rhReturnHref()+'">Back to your home</a></div>'
        : '<div class="cw-status"><div class="cw-status-icon">\u2713</div><h2>Preview finished</h2><p>You walked the session flow. This is not a Certificate of Completion and does not create a serial. To earn proof, a Certified Facilitator claims your seat through a Certified Organization.</p><a class="btn btn-primary" href="organizations.html">How organizations verify men</a> <a class="btn btn-secondary" style="margin-left:8px" href="certificates.html">Back to courses</a></div>');
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
