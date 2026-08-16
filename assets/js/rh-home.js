/* Returning Home homebase. After login this is the room: his name, the
   report glance, one Continue, the other trainings behind a disclose,
   and the writings. Assessment never gates the trainings. */
(function(){
  var root = document.getElementById('rhHome');
  if(!root) return;

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function humanizeHandle(raw){
    var token = String(raw||'').split(/[._+\-]/)[0] || '';
    if(!token) return '';
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  function firstNameFrom(raw){
    var n = String(raw||'').trim();
    if(!n) return '';
    if(n.indexOf('@')>=0) return humanizeHandle(n.split('@')[0]);
    var first = n.split(/\s+/)[0];
    if(!/\s/.test(n) && first === first.toLowerCase() && first.length >= 8 && !/[._-]/.test(first)){
      return humanizeHandle(first);
    }
    if(/[._-]/.test(first) && first === first.toLowerCase()) return humanizeHandle(first);
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  function firstName(){
    return firstNameFrom(profileName) || firstNameFrom((function(){
      var s = window.FC && FC.session;
      var u = s && s.user;
      var meta = u && u.user_metadata;
      return (meta && (meta.full_name || meta.name)) || (u && u.email) || '';
    })());
  }
  function fmt(iso){
    try { return new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
    catch(e){ return ''; }
  }
  function playerHref(slug){
    return (window.FCPath && FCPath.playerHref) ? FCPath.playerHref(slug) : ('course.html?preview=1&cert='+slug);
  }
  function courses(){
    return (window.FCPath && FCPath.courses) ? FCPath.courses : [];
  }
  function packFor(slug){
    return (window.FC_COURSE_DEMO && FC_COURSE_DEMO[slug]) || null;
  }
  function localState(slug){
    var progress={}, passes={}, writings={};
    try {
      var st = JSON.parse(localStorage.getItem('fc-cw-preview-'+slug)||'{}');
      progress = st.progress || {};
      passes = st.passes || {};
      writings = st.writings || {};
    } catch(e){}
    try {
      var w = JSON.parse(localStorage.getItem('fc-cw-preview-'+slug+'-writings')||'{}');
      if(w && typeof w==='object') writings = Object.assign({}, writings, w);
    } catch(e){}
    return { progress:progress, passes:passes, writings:writings };
  }
  function sessionDone(v, st){
    var w = st.writings[v.id];
    if(w && w.savedAt) return true;
    if(st.passes[v.id]) return true;
    var p = st.progress[v.id];
    return !!(p && p.completed);
  }
  function titleOf(slug){
    var list = courses();
    for(var i=0;i<list.length;i++){ if(list[i].slug===slug) return list[i].title; }
    var pack = packFor(slug);
    return (pack && pack.title) || slug;
  }
  var serverBySlug = {};
  var serverWritings = [];
  var profileName = '';
  var loadedResult = undefined;
  var loadedState = null;
  var reportPaintedFor = null;

  function mergeServer(rows){
    (rows||[]).forEach(function(row){
      var slug = row.course_slug;
      if(!serverBySlug[slug]) serverBySlug[slug] = { ids:{}, rows:[] };
      if(row.video_id) serverBySlug[slug].ids[row.video_id] = true;
      serverBySlug[slug].rows.push(row);
      serverWritings.push(row);
    });
  }

  function progressFor(slug){
    var pack = packFor(slug);
    var videos = (pack && pack.videos) || [];
    var st = localState(slug);
    var done = 0;
    var next = 0;
    videos.forEach(function(v, i){
      var ok = sessionDone(v, st) || !!(serverBySlug[slug] && serverBySlug[slug].ids[v.id]);
      if(ok){ done += 1; next = i+1; }
    });
    if(serverBySlug[slug] && serverBySlug[slug].rows.length > done){
      done = Math.min(videos.length, serverBySlug[slug].rows.length);
      next = done;
    }
    if(next >= videos.length) next = Math.max(0, videos.length-1);
    return { total: videos.length, done: done, next: next };
  }

  function writingsList(){
    var out = [];
    courses().forEach(function(c){
      var st = localState(c.slug);
      var pack = packFor(c.slug);
      var videos = (pack && pack.videos) || [];
      var seen = {};
      videos.forEach(function(v, i){
        var w = st.writings[v.id];
        if(!w || !w.savedAt) return;
        seen[v.id] = true;
        out.push({
          slug: c.slug, title: c.title, session: v.title || ('Session '+(i+1)),
          ord: v.ord || (i+1), savedAt: w.savedAt,
          learned: w.learned||'', meaning: w.meaning||'', apply: w.apply||'', share: w.share||''
        });
      });
      (serverBySlug[c.slug] && serverBySlug[c.slug].rows || []).forEach(function(row){
        if(seen[row.video_id]) return;
        out.push({
          slug: c.slug, title: titleOf(c.slug),
          session: row.session_title || ('Session '+(row.session_ord||'')),
          ord: row.session_ord || 0, savedAt: row.saved_at,
          learned: row.learned||'', meaning: row.meaning||'', apply: row.apply||'', share: row.share||''
        });
      });
    });
    out.sort(function(a,b){ return String(b.savedAt||'').localeCompare(String(a.savedAt||'')); });
    return out;
  }

  function lastLineFor(slug){
    var writes = writingsList();
    var i, w, line;
    for(i=0;i<writes.length;i++){
      if(slug && writes[i].slug !== slug) continue;
      w = writes[i];
      line = w.apply || w.meaning || w.learned || w.share || '';
      if(line) return line;
    }
    if(slug){
      for(i=0;i<writes.length;i++){
        w = writes[i];
        line = w.apply || w.meaning || w.learned || w.share || '';
        if(line) return line;
      }
    }
    return '';
  }

  function namedCourse(){
    if(loadedResult && loadedResult.gap_scale && window.FCPath && FCPath.courseForFocus){
      return FCPath.courseForFocus(loadedResult.gap_scale);
    }
    if(window.FCPath && FCPath.hasReport && FCPath.hasReport() && FCPath.courseForFocus){
      return FCPath.courseForFocus(FCPath.focusKey && FCPath.focusKey());
    }
    return null;
  }

  function lastTouchedSlug(rec){
    var writes = writingsList();
    if(writes.length) return writes[0].slug;
    var best = null, bestN = 0;
    courses().forEach(function(c){
      var p = progressFor(c.slug);
      if(p.done > bestN){ bestN = p.done; best = c.slug; }
    });
    if(best) return best;
    return rec ? rec.slug : null;
  }

  function continueTarget(){
    var rec = namedCourse();
    var slug = lastTouchedSlug(rec);
    if(!slug && rec) slug = rec.slug;
    if(!slug) return null;
    var list = courses();
    var course = null;
    for(var i=0;i<list.length;i++){ if(list[i].slug===slug) course = list[i]; }
    if(!course && rec) course = rec;
    if(!course) return null;
    return { course: course, p: progressFor(course.slug), named: !!(rec && rec.slug===course.slug) };
  }

  function clipLine(s){
    s = String(s||'').replace(/\s+/g,' ').trim();
    if(s.length > 160) s = s.slice(0,157).replace(/\s+\S*$/,'')+'…';
    return s;
  }

  function trainingRow(c, opts){
    opts = opts || {};
    var p = progressFor(c.slug);
    var quiet = !!opts.quiet;
    var label = '';
    if(!quiet){
      if(p.total && p.done>=p.total) label = 'Finished. '+p.total+' of '+p.total;
      else if(p.total) label = 'Session '+Math.min(p.done+1, p.total)+' of '+p.total;
      else label = c.span || '';
    } else if(p.done && p.total){
      label = 'Session '+Math.min(p.done+1, p.total)+' of '+p.total;
    }
    var go = p.done ? 'Resume' : 'Start';
    return '<a class="rh-home-row'+(quiet?' is-quiet':'')+'" href="'+esc(playerHref(c.slug))+'">'+
      '<span><span class="rh-home-row-t">'+esc(c.title)+'</span>'+
      (label?'<span class="rh-home-row-m">'+esc(label)+'</span>':'')+'</span>'+
      '<span class="rh-home-go">'+esc(go)+'</span></a>';
  }

  function paintReport(){
    var report = document.getElementById('rhHomeReport');
    if(!report) return;
    if(loadedResult === undefined){
      if(reportPaintedFor !== 'wait'){
        reportPaintedFor = 'wait';
        report.innerHTML = '<p class="rh-home-k">Your report</p><p class="rh-home-copy">One moment.</p>';
      }
      return;
    }
    if(!loadedResult){
      if(reportPaintedFor !== 'empty'){
        reportPaintedFor = 'empty';
        report.innerHTML =
          '<p class="rh-home-k">Your report</p>'+
          '<p class="rh-home-copy">The Profile is a short set of honest questions. You get a private report of where you stand as a father. It takes eight minutes. Nobody is grading you.</p>'+
          '<p class="rh-home-links"><a href="profile.html?start=quick&amp;path=rh">Take the Profile</a></p>';
      }
      return;
    }
    var key = String(loadedResult.completed_at||'')+'|'+String(loadedResult.gap_scale||'')+'|'+String(loadedResult.overall_pct||'');
    if(reportPaintedFor === key) return;
    reportPaintedFor = key;
    report.innerHTML = '<p class="rh-home-k">Your report</p><div id="rhReport"></div>';
    var host = document.getElementById('rhReport');
    if(host && window.FCReport && FCReport.render){
      FCReport.render(host, {
        result: loadedResult,
        state: loadedState || 'live',
        collapse: true,
        embed: true
      });
    }
  }

  function paintContinue(){
    var box = document.getElementById('rhHomeContinue');
    if(!box) return;
    var target = continueTarget();
    if(!target){ box.innerHTML = ''; return; }
    var c = target.course;
    var p = target.p;
    var finished = !!(p.total && p.done>=p.total);
    var sessionN = p.total ? Math.min(p.done+1, p.total) : 0;
    var label = finished
      ? ('Finished. '+p.total+' of '+p.total)
      : (p.total ? ('Session '+sessionN+' of '+p.total) : (c.span||''));
    var go = finished ? 'Open again' : (p.done ? 'Resume' : 'Start here');
    var pct = p.total ? Math.round((p.done/p.total)*100) : 0;
    if(!finished && p.total) pct = Math.max(pct, Math.round((Math.min(p.done, p.total-1)/p.total)*100));
    var wrote = clipLine(lastLineFor(c.slug));
    box.innerHTML =
      '<p class="rh-home-k">Continue</p>'+
      '<div class="rh-home-cont">'+
        '<p class="rh-home-cont-t">'+esc(c.title)+'</p>'+
        '<p class="rh-home-cont-m">'+esc(label)+'</p>'+
        (p.total ? '<div class="rh-home-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+p.total+'" aria-valuenow="'+p.done+'"><i style="width:'+pct+'%"></i></div>' : '')+
        (wrote ? '<p class="rh-home-wrote">You wrote: '+esc(wrote)+'</p>' : '')+
        '<a class="rh-home-go rh-home-cont-go" href="'+esc(playerHref(c.slug))+'">'+esc(go)+'</a>'+
      '</div>';
  }

  function paintTrainings(){
    var train = document.getElementById('rhHomeTrainings');
    if(!train) return;
    var cont = continueTarget();
    var hideSlug = cont ? cont.course.slug : null;
    var others = courses().filter(function(c){ return !hideSlug || c.slug !== hideSlug; });
    if(!others.length){ train.innerHTML = ''; return; }
    if(cont){
      train.innerHTML =
        '<details class="rh-home-more">'+
          '<summary>Your other trainings</summary>'+
          others.map(function(c){ return trainingRow(c, { quiet:true }); }).join('')+
        '</details>';
    } else {
      train.innerHTML = '<p class="rh-home-k">Your trainings</p>'+
        others.map(function(c){ return trainingRow(c, { quiet:true }); }).join('');
    }
  }

  function paintWork(){
    var work = document.getElementById('rhHomeWork');
    if(!work) return;
    var signed = !!(window.FC && FC.uid && FC.uid());
    var writes = writingsList();
    var keep = signed
      ? 'Saved to your account and this device.'
      : 'Saved on this device. An account keeps it.';
    if(!writes.length){
      work.innerHTML =
        '<p class="rh-home-k">Your work</p>'+
        '<p class="rh-home-copy">Finish a session. The four answers live here.</p>'+
        '<p class="rh-home-keep">'+esc(keep)+'</p>';
    } else {
      work.innerHTML = '<p class="rh-home-k">Your work</p>'+writes.slice(0,12).map(function(w){
        return '<article class="rh-home-write">'+
          '<p class="rh-home-write-h">'+esc(w.session)+' · '+esc(w.title)+(w.savedAt?' · '+esc(fmt(w.savedAt)):'')+'</p>'+
          (w.learned?'<p><b>What did you learn?</b> '+esc(w.learned)+'</p>':'')+
          (w.meaning?'<p><b>What does that mean to you?</b> '+esc(w.meaning)+'</p>':'')+
          (w.apply?'<p><b>How can you apply this moving forward?</b> '+esc(w.apply)+'</p>':'')+
          (w.share?'<p><b>What else would you like to share?</b> '+esc(w.share)+'</p>':'')+
        '</article>';
      }).join('')+'<p class="rh-home-keep">'+esc(keep)+'</p>';
    }
  }

  function paintGuest(){
    var guest = document.getElementById('rhHomeGuest');
    if(!guest) return;
    var signed = !!(window.FC && FC.uid && FC.uid());
    if(signed) guest.hidden = true;
    else {
      guest.hidden = false;
      guest.innerHTML = 'An account keeps this home. <a href="login.html?path=rh&amp;next=rh-home.html">Log in</a> · <a href="login.html?path=rh&amp;mode=signup&amp;next=rh-home.html">Create account</a>';
    }
  }

  function paint(){
    var name = firstName();
    var h1 = name ? ('Welcome back, '+name+'.') : 'Welcome back.';
    var h = document.getElementById('rhHomeH');
    if(h) h.textContent = h1;
    paintReport();
    paintContinue();
    paintTrainings();
    paintWork();
    paintGuest();
  }

  function acceptResult(result, state){
    loadedResult = result || null;
    loadedState = state || null;
    if(result && result.gap_scale && window.FCPath && FCPath.markReport){
      FCPath.markReport(result.gap_scale);
    }
    paint();
  }

  function loadProfileName(then){
    var s = window.FC && FC.session;
    var u = s && s.user;
    var meta = u && u.user_metadata;
    profileName = (meta && (meta.full_name || meta.name)) || '';
    var uid = window.FC && FC.uid && FC.uid();
    if(!uid || !FC.sb){ then(); return; }
    FC.sb.from('profiles').select('full_name,name').eq('id', uid).maybeSingle()
      .then(function(r){
        var row = r && r.data;
        if(row && (row.full_name || row.name)) profileName = row.full_name || row.name;
        then();
      }, function(){ then(); });
  }

  function loadServerThenPaint(){
    paint();
    function afterAuth(){
      loadProfileName(function(){
        paint();
        if(window.FCReport && FCReport.load){
          FCReport.load(function(result, state){ acceptResult(result, state); });
        } else {
          acceptResult(null, null);
        }
        var uid = FC.uid && FC.uid();
        if(!uid || !FC.sb) return;
        FC.sb.from('session_writings')
          .select('course_slug,session_ord,session_title,learned,meaning,apply,share,saved_at,video_id')
          .eq('user_id', uid)
          .then(function(r){
            if(r && r.data) mergeServer(r.data);
            paint();
          }, function(){ paint(); });
      });
    }
    if(window.FC && FC.ready){
      FC.ready.then(afterAuth, afterAuth);
    } else if(window.FCReport && FCReport.load){
      FCReport.load(function(result, state){ acceptResult(result, state); });
    } else {
      acceptResult(null, null);
    }
  }

  loadServerThenPaint();
})();
