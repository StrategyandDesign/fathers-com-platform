/* ============================================================
   Plan Controller: renders a man's personalized twelve-week plan.
   Reads his latest keystone_results, runs PLAN_ENGINE, and shows:
   - his focus dimension (from his real growth-focus)
   - this week's specific actions (checkable, saved)
   - his 12-week arc with current position
   - his strengths and supporting focus areas
   Handles: no result yet (-> take assessment), demo mode, live mode.
   ============================================================ */
(function(){
  var root = document.getElementById('planRoot');
  if(!root || !window.PLAN_ENGINE) return;

  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function firstSentence(t){ t=String(t||''); var i=t.indexOf('. '); return i>0? t.slice(0,i+1) : t; }

  /* A sitting finished while signed out lives in localStorage. Read it here so a
     man who just finished sees HIS plan rather than a sample. Without this, a man
     who took the Manhood Profile signed out was handed the father demo, which
     builds from father tracks and talks about his kids. */
  function pendingResult(){
    var raw = null;
    try { raw = localStorage.getItem('fc_pending_result'); } catch(e){ return null; }
    if(!raw) return null;
    try {
      var p = JSON.parse(raw);
      if(!p || !p.scored) return null;
      return {
        assessment_slug: p.assessment_slug || null,
        overall_pct: p.scored.overall, section_scores: p.scored.sections,
        scale_scores: p.scored.scales, gap_scale: p.scored.gap,
        strength_scale: p.scored.strength,
        completion_tier: p.completion_tier || 'full',
        completed_at: new Date(p.at || Date.now()).toISOString()
      };
    } catch(e){ return null; }
  }

  // ---------- entry ----------
  function load(){
    if(window.FC && FC.live && FC.uid()){
      // First: did he just finish the assessment and sign in? Save that pending result.
      claimServerPendingThen(function(){
      savePendingThen(function(){
        /* Every result, newest first. ?assessment=<slug> opens the plan for a
           specific profile, so a man who has done both keeps both plans instead
           of the newer one replacing the older. Legacy untagged rows are father
           results. */
        FC.sb.from('keystone_results').select('*').eq('user_id', FC.uid())
          .order('completed_at',{ascending:false})
          .then(function(r){
            var all = (r && r.data) || [];
            var want = null;
            try { want = new URLSearchParams(window.location.search).get('assessment'); } catch(e){}
            var pickRow = null;
            if(want){
              for(var i=0;i<all.length;i++){
                var slug = all[i].assessment_slug || 'keystone-father-profile';
                if(slug === want){ pickRow = all[i]; break; }
              }
            } else {
              pickRow = all.length ? all[0] : null;
            }
            if(pickRow){ render(pickRow, false); }
            else { needAssessment(); }
          }, function(){ needAssessment(); });
      });
      });
    } else {
      // Signed out: his own finished sitting first, the sample only if there is none.
      var pend = pendingResult();
      if(pend){ render(pend, false); return; }
      render(demoResult(), true);
    }
  }

  /* A sitting finished signed-out is parked server-side in pending_results,
     keyed by a claim token the email link carries. localStorage cannot make the
     trip to another device; a phone mail app opens its own browser and the
     result is gone. The token can. Claiming moves the row into
     keystone_results for this account and burns the token. */
  function claimServerPendingThen(next){
    var token = null;
    try { token = new URLSearchParams(window.location.search).get('claim'); } catch(e){}
    if(!token){ return next(); }
    FC.sb.rpc('claim_pending_result', { p_token: token }).then(function(){
      try {
        var u = new URL(window.location.href);
        u.searchParams.delete('claim');
        window.history.replaceState({}, '', u.toString());
      } catch(e){}
      next();
    }, function(){ next(); });
  }

  // If a completed-but-unsaved Keystone result is sitting in localStorage (from the email gate),
  // persist it to this now-authenticated account, then continue.
  function savePendingThen(next){
    var raw;
    try { raw = localStorage.getItem('fc_pending_result'); } catch(e){ return next(); }
    if(!raw){ return next(); }
    var pending;
    try { pending = JSON.parse(raw); } catch(e){ return next(); }
    if(!pending || !pending.scored){ return next(); }
    var scored = pending.scored;
    // write the result row directly (the session may not exist for this account yet)
    FC.sb.from('keystone_results').insert({
      user_id: FC.uid(),
      // Preserve which instrument produced this. Saving a pending result without
      // it turned every signed-out Manhood sitting into a Father result.
      assessment_slug: pending.assessment_slug || 'keystone-father-profile',
      overall_pct: scored.overall,
      section_scores: scored.sections,
      scale_scores: scored.scales,
      gap_scale: scored.gap,
      strength_scale: scored.strength,
      completion_tier: pending.completion_tier || 'full'
    }).then(function(){
      try { localStorage.removeItem('fc_pending_result'); } catch(e){}
      next();
    }, function(){ next(); }); // even if it fails, don't block the page
  }

  // ---------- no assessment yet ----------
  function needAssessment(){
    root.innerHTML =
      '<div class="center" style="max-width:560px;margin:60px auto">'+
      '<div class="eyebrow brass" style="margin-bottom:14px">YOUR PLAN STARTS WITH YOUR BASELINE</div>'+
      '<h1 class="d-36" style="margin-bottom:16px">Take the Keystone Profile first.</h1>'+
      '<p class="lead" style="margin-bottom:28px">Your twelve-week plan is built from your results: your real strengths, and the one dimension where growth will matter most. It takes about twenty minutes, and you can do it in sittings.</p>'+
      '<a class="btn btn-yellow" href="profile.html">Take your baseline</a>'+
      '</div>';
  }

  // ---------- main render ----------
  function render(result, isDemo){
    var plan = PLAN_ENGINE.build(result);
    var week = isDemo ? 3 : PLAN_ENGINE.currentWeek(result.completed_at);
    var wk = plan.weeks[week-1] || plan.weeks[0];
    var overall = Math.round(result.overall_pct || plan.overall || 0);
    /* Carry the profile through every outbound link, so a man holding two
       profiles stays on the one this plan was built from. */
    var q = result.assessment_slug ? '?assessment='+encodeURIComponent(result.assessment_slug) : '';

    var m = computeProgress(plan, week);

    // 1. THE HERO. The week number carries the page the way a chapter number
    //    carries the report. Answers "where am I" before he reads a word.
    var html =
      '<div class="pl-hero">'+
        '<div class="pl-hero-top">'+
          '<div class="pl-hero-eyebrow">Your twelve-week plan</div>'+
          '<span class="pl-hero-base">'+
            '<span class="pl-hero-base-k">Where you started</span>'+
            '<b>'+esc(((window.KS && KS.bandFor) ? KS.bandFor(overall).label : 'Your baseline'))+'</b>'+
          '</span>'+
        '</div>'+
        '<div class="pl-hero-row">'+
          '<div><span class="pl-hero-numlbl">Week</span><span class="pl-hero-num">'+week+'</span></div>'+
          '<div class="pl-hero-say">One move<br>at a time.</div>'+
        '</div>'+
        '<div class="pl-hero-focus">Built from your Keystone Profile. Your focus is <b>'+esc(plan.focusLabel)+'</b>.</div>'+
      '</div>';

    if(isDemo){
      /* The banner used to sit below the hero, where a man reading top-down had
         already absorbed a week number and a baseline before learning none of
         it was his. Sample status is the first thing on the page now, and the
         hero copy stops claiming the plan was built from his profile. */
      html = '<div class="notice brass" style="margin:0 0 20px"><b>This is a sample plan, not yours.</b> <a class="link" href="profile.html">Take your Profile</a> and your own twelve-week plan is built from your results.</div>' + html;
      html = html.replace('Built from your Keystone Profile. Your focus is', 'A sample focus: ');
      html = html.replace('<span class="pl-hero-base-k">Where you started</span>', '<span class="pl-hero-base-k">Sample baseline</span>');
    }

    if(!isDemo && result.completion_tier === 'quick'){
      var qSlug = result.assessment_slug || 'keystone-father-profile';
      var qManhood = qSlug === 'keystone-manhood-profile';
      var qDim = qManhood ? 'Manhood Dimensions' : 'Father Dimensions';
      var qFull = qManhood ? 'Manhood Profile' : 'Keystone';
      var qHref = 'profile.html?assessment=' + encodeURIComponent(qSlug);
      html = '<div class="notice brass" style="margin:0 0 20px"><b>Starting baseline from '+qDim+'.</b> This is not the full '+qFull+'. <a class="link" href="'+qHref+'">Finish the full Profile</a> when you want the complete picture. Your plan still builds from the scales you answered.</div>' + html;
    }

    // 2. THIS WEEK'S MOVE. Each action can carry a cue in his own words: when and
    //    where he will do it. A goal intention becomes an implementation intention,
    //    which is the difference between meaning to and doing it.
    html +=
      '<div class="card pl-focal">'+
        '<div class="row between" style="margin-bottom:12px"><div class="eyebrow brass" style="margin:0">DO THIS WEEK</div>'+
        '<span class="tag">'+esc(wk.phaseLabel).toUpperCase()+' &middot; PHASE '+(wk.phase+1)+'</span></div>'+
        '<h2 class="pl-focal-name">'+esc(plan.focusLabel)+'</h2>'+
        '<p class="pl-focal-sub">'+esc(firstSentence(plan.focusText))+'</p>'+
        '<div class="stack-16">'+
          wk.actions.map(function(a, i){
            var key = 'fc_plan_w'+week+'_a'+i;
            return '<div class="pl-act">'+
              '<label class="actionrow"><input type="checkbox" data-persist="'+key+'">'+
                '<div style="flex:1"><div class="txt">'+esc(a)+'</div></div></label>'+
              '<div class="pl-when">'+
                '<div class="pl-when-said" data-said="'+key+'"><span class="k">Your cue</span><span data-saidtxt="'+key+'"></span></div>'+
                '<button type="button" class="pl-when-set" data-whenbtn="'+key+'"><span>+</span> Set when and where</button>'+
                '<div class="pl-when-edit" data-whenedit="'+key+'">'+
                  '<input class="input" data-wheninput="'+key+'" placeholder="Tuesday at 7pm, from the truck">'+
                  '<button type="button" class="btn btn-secondary btn-sm" data-whensave="'+key+'">Save</button>'+
                '</div>'+
              '</div>'+
            '</div>';
          }).join('')+
        '</div>'+
        '<div class="pl-cheer" id="plCheer" hidden></div>'+
        '<p class="fine" style="margin-top:16px">Mark them when they happen. Honest beats perfect. Miss a day and the week still counts.</p>'+
      '</div>';

    // 2b. THE MATCHED COURSE. Excitement without a catalog dump. One film path
    //     tied to his focus, then browse-all as secondary.
    if(window.FCFocusCourse){
      var course = FCFocusCourse.forFocus(plan.focusScale || plan.focusLabel);
      html += FCFocusCourse.cardHtml(course, {
        esc: esc,
        kicker: 'TRAIN THIS FOCUS',
        focusLabel: plan.focusLabel,
        cta: 'Open ' + course.title,
        href: course.href
      });
    } else {
      html +=
        '<div class="card" style="padding:24px;margin-bottom:22px">'+
          '<div class="eyebrow brass" style="margin-bottom:10px">TRAIN THIS FOCUS</div>'+
          '<b style="font-size:18px">Film courses matched to how you father</b>'+
          '<p class="small ash" style="margin:8px 0 14px">Self-paced film with a Certified Facilitator available for questions. Free when your seat is claimed.</p>'+
          '<a class="btn btn-yellow btn-sm" href="certificates.html">See the courses</a>'+
        '</div>';
    }

    // 3. Calm progress. Goal-gradient and endowed progress, never a punitive streak.
    //    "Weeks you showed up" is cumulative, not a chain that breaks.
    html +=
      '<div class="card pl-progress">'+
        '<div class="row between" style="margin-bottom:14px"><div class="eyebrow" style="margin:0">YOUR TWELVE WEEKS</div>'+
        '<span class="fine mono">'+m.pctThroughPlan+'% through</span></div>'+
        '<div class="pl-arc">'+
          plan.weeks.map(function(w){
            var cls = w.week < week ? 'done' : (w.week === week ? 'now' : '');
            return '<span class="'+cls+'"></span>';
          }).join('')+
        '</div>'+
        '<div class="phaselabels"><span>WKS 1-4 ESTABLISH</span><span>5-8 DEEPEN</span><span>9-12 SUSTAIN</span></div>'+
        '<div class="pl-stat">'+
          '<div><span class="pl-stat-n">'+m.actionsDone+'</span><span class="pl-stat-l">Action'+(m.actionsDone===1?'':'s')+' done</span></div>'+
          '<div><span class="pl-stat-n">'+m.weeksWithAction+'</span><span class="pl-stat-l">Week'+(m.weeksWithAction===1?'':'s')+' you showed up</span></div>'+
          '<div><span class="pl-stat-n">'+m.cuesSet+'</span><span class="pl-stat-l">Cue'+(m.cuesSet===1?'':'s')+' set</span></div>'+
        '</div>'+
      '</div>';

    // 4. Secondary depth. Available, not competing with this week's move.
    var depth = '';
    if(plan.strengthLabel){
      depth +=
        '<div style="margin-bottom:14px">'+
          '<div class="eyebrow" style="margin-bottom:8px">LEAD FROM YOUR STRENGTH</div>'+
          '<b style="font-family:var(--font-display);font-size:18px;font-weight:600">'+esc(plan.strengthLabel)+'</b>'+
          '<p class="small ash" style="margin-top:6px">This is working. Keep it working while you build the rest.</p>'+
        '</div>';
    }
    if(plan.supporting && plan.supporting.length){
      depth +=
        '<div class="eyebrow" style="margin-bottom:8px">ALSO WORTH TENDING</div>'+
        plan.supporting.map(function(sp){
            var bd = (window.KS && KS.bandFor) ? KS.bandFor(sp.pct).label : '';
            return '<div class="row between" style="margin-bottom:8px;gap:14px"><span class="small">'+esc(sp.label)+'</span>'+
              '<span class="pl-tend-band">'+esc(bd)+'</span></div>';
          }).join('');
    }
    if(depth){
      html += '<details class="pl-depth card" style="padding:20px 22px;margin-bottom:22px"><summary class="pl-depth-sum">More from your Profile</summary><div style="margin-top:16px">'+depth+'</div></details>';
    }

    // 5. Proof, quiet. The course card above already carries excitement.
    html +=
      '<p class="fine ash" style="text-align:center;margin:8px 0 22px;max-width:56ch;margin-left:auto;margin-right:auto">Finish the plan and a film course and you earn a <a class="link" href="certificates.html">verified Certificate of Completion</a>. Hours logged. A serial anyone can check. You earn it. You do not buy it.</p>';

    // 6. Tertiary, quiet.
    html +=
      '<nav class="pl-foot" aria-label="Where to next">'+
        '<a class="pl-foot-home" href="dashboard.html'+q+'"><i aria-hidden="true">&larr;</i> Home</a>'+
        '<span class="pl-foot-links">'+
          '<a class="link ash" href="report.html'+q+'">Your full report</a>'+
          '<a class="link ash" href="certificates.html">All courses</a>'+
          '<a class="link ash" href="profile.html'+q+'">Retake the Profile</a>'+
        '</span>'+
      '</nav>';

    root.innerHTML = html;
    restoreChecks();
    wireCues();
  }

  /* ---------- if-then cues ----------
     A goal intention says what. An implementation intention says when and where,
     and that is the version people actually carry out. Stored locally so it works
     signed out, and mirrored to the account when live so it follows him. */
  function cueKey(k){ return k + '_when'; }

  function readCue(k){
    try { return localStorage.getItem(cueKey(k)) || ''; } catch(e){ return ''; }
  }

  function paintCue(key, val){
    var said = root.querySelector('[data-said="'+key+'"]');
    var txt  = root.querySelector('[data-saidtxt="'+key+'"]');
    var btn  = root.querySelector('[data-whenbtn="'+key+'"]');
    if(txt) txt.textContent = val;
    if(said) said.classList.toggle('show', !!val);
    if(btn) btn.innerHTML = val ? '<span>+</span> Change when and where'
                                : '<span>+</span> Set when and where';
  }

  function saveCue(key, val){
    try { val ? localStorage.setItem(cueKey(key), val) : localStorage.removeItem(cueKey(key)); } catch(e){}
    paintCue(key, val);
    if(window.FC && FC.live && FC.uid()){
      FC.sb.from('plan_checkins').upsert({
        user_id: FC.uid(), action_key: key, cue: val || null,
        updated_at: new Date().toISOString()
      }, {onConflict:'user_id,action_key'}).then(function(){}, function(){});
    }
  }

  function wireCues(){
    root.querySelectorAll('[data-whenbtn]').forEach(function(btn){
      var key = btn.getAttribute('data-whenbtn');
      var box = root.querySelector('[data-whenedit="'+key+'"]');
      var inp = root.querySelector('[data-wheninput="'+key+'"]');
      var sav = root.querySelector('[data-whensave="'+key+'"]');
      paintCue(key, readCue(key));
      btn.addEventListener('click', function(){
        var open = box.classList.toggle('open');
        if(open){ inp.value = readCue(key); inp.focus(); }
      });
      function commit(){
        saveCue(key, (inp.value||'').trim());
        box.classList.remove('open');
      }
      if(sav) sav.addEventListener('click', commit);
      if(inp) inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); commit(); } });
    });
  }

  // A small, varied affirmation when he marks an action done. Variable reinforcement,
  // in the brand's voice. Not a badge, not points. Just a man being told it mattered.
  var CHEERS = ['That is the work.', 'Your kid felt that.', 'One more brick laid.',
    'That is presence, not theory.', 'Small and real beats big and never.', 'Kept your word. That is everything.'];
  function cheer(){
    var el = document.getElementById('plCheer'); if(!el) return;
    el.textContent = CHEERS[Math.floor(Math.random()*CHEERS.length)];
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('show'); }, 2600);
  }

  // ---------- persistence for the weekly checkboxes ----------
  function restoreChecks(){
    root.querySelectorAll('input[data-persist]').forEach(function(cb){
      var key = cb.getAttribute('data-persist');
      try { if(localStorage.getItem(key)==='1') cb.checked = true; } catch(e){}
      cb.addEventListener('change', function(){
        try { localStorage.setItem(key, cb.checked?'1':'0'); } catch(e){}
        var row = cb.closest('.actionrow'); if(row) row.classList.toggle('done', cb.checked);
        if(cb.checked) cheer();
        // if live, also persist to the account so it syncs across devices
        if(window.FC && FC.live && FC.uid()){
          FC.sb.from('plan_checkins').upsert({
            user_id: FC.uid(), action_key: key, done: cb.checked,
            updated_at: new Date().toISOString()
          }, {onConflict:'user_id,action_key'}).then(function(){}, function(){});
        }
      });
      if(cb.checked){ var row = cb.closest('.actionrow'); if(row) row.classList.add('done'); }
    });
  }

  // Calm progress only. Cumulative actions and weeks-shown-up, and how far through the
  // twelve weeks he is (goal-gradient). No consecutive streak, because a broken streak
  // shames the exact users who miss weeks for real reasons. No badge theater.
  function computeProgress(plan, week){
    var actionsDone = 0, weeksWithAction = 0, cuesSet = 0;
    for(var w=1; w<=12; w++){
      var wkDone = 0;
      for(var a=0; a<2; a++){
        var k = 'fc_plan_w'+w+'_a'+a;
        try { if(localStorage.getItem(k)==='1'){ actionsDone++; wkDone++; } } catch(e){}
        try { if(localStorage.getItem(k+'_when')){ cuesSet++; } } catch(e){}
      }
      if(wkDone>0) weeksWithAction++;
    }
    var pctThroughPlan = Math.min(100, Math.round((week/12)*100));
    return { actionsDone: actionsDone, weeksWithAction: weeksWithAction,
             cuesSet: cuesSet, pctThroughPlan: pctThroughPlan };
  }

  // ---------- a representative demo result (signed-out preview) ----------
  function demoResult(){
    return {
      // Tagged so the engine builds it from the father tracks on purpose,
      // rather than by falling through an untagged result.
      assessment_slug: 'keystone-father-profile',
      overall_pct: 64,
      gap_scale: 'consistency',
      strength_scale: 'involvement',
      section_scores: {dimensions:62, practices:68, satisfaction:60},
      scale_scores: {
        involvement:{label:'Involvement', pct:81},
        consistency:{label:'Consistency', pct:44},
        awareness:{label:'Awareness', pct:58},
        time_commitment:{label:'Time Commitment', pct:49},
        emotional_regulation:{label:'Emotional Regulation', pct:71}
      },
      completed_at: new Date(Date.now() - 14*86400000).toISOString()
    };
  }

  /* Boot only after FC.ready settles. This file used to call load() at parse
     time; on a magic-link landing the session was still being exchanged, so a
     just-signed-in man read as signed out and was handed the demo plan. The
     same deferred boot the report uses, for the same reason. */
  (function boot(){
    var started = false, run = function(){ if(!started){ started = true; load(); } };
    if(window.FC && FC.ready && typeof FC.ready.then === 'function'){
      FC.ready.then(run, run); setTimeout(run, 5000); return;
    }
    var tries = 0, iv = setInterval(function(){
      if(window.FC && FC.ready && typeof FC.ready.then === 'function'){
        clearInterval(iv); FC.ready.then(run, run); setTimeout(run, 5000);
      } else if(++tries >= 60){ clearInterval(iv); run(); }
    }, 50);
  })();
})();
