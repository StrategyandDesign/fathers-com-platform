/* ============================================================
   Plan Controller: renders a man's personalized 90-day plan.
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

  // ---------- entry ----------
  function load(){
    if(window.FC && FC.live && FC.uid()){
      // First: did he just finish the assessment and sign in? Save that pending result.
      savePendingThen(function(){
        FC.sb.from('keystone_results').select('*').eq('user_id', FC.uid())
          .order('completed_at',{ascending:false}).limit(1).maybeSingle()
          .then(function(r){
            if(r.data){ render(r.data, false); }
            else { needAssessment(); }
          }).catch(function(){ needAssessment(); });
      });
    } else {
      render(demoResult(), true);
    }
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
      overall_pct: scored.overall,
      section_scores: scored.sections,
      scale_scores: scored.scales,
      gap_scale: scored.gap,
      strength_scale: scored.strength
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
      '<p class="lead" style="margin-bottom:28px">Your ninety-day plan is built from your results: your real strengths, and the one dimension where growth will matter most. It takes about twenty minutes, and you can do it in sittings.</p>'+
      '<a class="btn btn-yellow" href="profile.html">Take your baseline</a>'+
      '</div>';
  }

  // ---------- main render ----------
  function render(result, isDemo){
    var plan = PLAN_ENGINE.build(result);
    var week = isDemo ? 3 : PLAN_ENGINE.currentWeek(result.completed_at);
    var wk = plan.weeks[week-1] || plan.weeks[0];
    var overall = Math.round(result.overall_pct || plan.overall || 0);

    var m = computeProgress(plan, week);

    // 1. Compact header. The question a returning man asks: what week am I on, what do I do.
    var html =
      '<div class="pl-head">'+
        '<div><div class="eyebrow" style="margin-bottom:8px">YOUR NINETY-DAY PLAN</div>'+
        '<h1 class="d-36" style="margin-bottom:8px">Week '+week+'. One move at a time.</h1>'+
        '<p class="lead" style="max-width:52ch;margin:0">Built from your Keystone Profile. Your focus is <b class="brass">'+esc(plan.focusLabel)+'</b>.</p></div>'+
        '<span class="chip" style="cursor:default;align-self:flex-start">Baseline <b class="mono" style="margin-left:8px">'+overall+'</b></span>'+
      '</div>';

    if(isDemo){
      html += '<div class="notice brass" style="margin:0 0 26px">This is a sample plan. <a class="link" href="profile.html">Take your baseline</a> and this becomes yours, free.</div>';
    }

    // 2. THE FOCAL POINT: this week's action, marked done. First thing he sees, answers
    //    "what do I do right now." Fresh-start framing so a missed week never shames him.
    html +=
      '<div class="card pl-focal">'+
        '<div class="row between" style="margin-bottom:8px"><div class="eyebrow brass" style="margin:0">DO THIS WEEK</div>'+
        '<span class="tag">'+esc(wk.phaseLabel).toUpperCase()+' &middot; PHASE '+(wk.phase+1)+'</span></div>'+
        '<h2 class="d-28" style="margin-bottom:6px">'+esc(plan.focusLabel)+'</h2>'+
        '<p class="ash" style="margin-bottom:22px;max-width:58ch">'+esc(firstSentence(plan.focusText))+'</p>'+
        '<div class="stack-16">'+
          wk.actions.map(function(a, i){
            var key = 'fc_plan_w'+week+'_a'+i;
            return '<label class="actionrow"><input type="checkbox" data-persist="'+key+'">'+
              '<div style="flex:1"><div class="txt">'+esc(a)+'</div></div></label>';
          }).join('')+
        '</div>'+
        '<div class="pl-cheer" id="plCheer" hidden></div>'+
        '<p class="fine" style="margin-top:16px">Mark them when they happen. Honest beats perfect. Miss a day and the week still counts.</p>'+
      '</div>';

    // 3. Calm progress. Goal-gradient and endowed progress, never a punitive streak.
    //    "Weeks you showed up" is cumulative, not a chain that breaks.
    html +=
      '<div class="card pl-progress">'+
        '<div class="row between" style="margin-bottom:14px"><div class="eyebrow" style="margin:0">YOUR NINETY DAYS</div>'+
        '<span class="fine mono">'+m.pctThroughPlan+'% through</span></div>'+
        '<div class="weeks">'+
          plan.weeks.map(function(w){
            var cls = w.week < week ? 'done' : (w.week === week ? 'now' : '');
            return '<span class="'+cls+'"></span>';
          }).join('')+
        '</div>'+
        '<div class="phaselabels"><span>WKS 1-4 ESTABLISH</span><span>5-8 DEEPEN</span><span>9-12 SUSTAIN</span></div>'+
        '<div class="pl-prog-foot"><span>'+m.actionsDone+' action'+(m.actionsDone===1?'':'s')+' done</span>'+
          '<span>'+m.weeksWithAction+' week'+(m.weeksWithAction===1?'':'s')+' you showed up</span></div>'+
      '</div>';

    // 4. Secondary: lead-from-strength and the areas also worth tending.
    html += '<div class="grid-2" style="gap:16px;margin-bottom:22px">';
    if(plan.strengthLabel){
      html +=
        '<div class="card" style="padding:24px">'+
          '<div class="eyebrow" style="margin-bottom:10px">LEAD FROM YOUR STRENGTH</div>'+
          '<b style="font-family:var(--font-display);font-size:20px;font-weight:600">'+esc(plan.strengthLabel)+'</b>'+
          '<p class="small ash" style="margin-top:8px">This is working. Keep it working while you build the rest.</p>'+
        '</div>';
    }
    if(plan.supporting && plan.supporting.length){
      html +=
        '<div class="card" style="padding:24px">'+
          '<div class="eyebrow" style="margin-bottom:10px">ALSO WORTH TENDING</div>'+
          plan.supporting.map(function(sp){
            return '<div class="row between" style="margin-bottom:8px"><span class="small">'+esc(sp.label)+'</span>'+
              '<span class="mono small ash">'+Math.round(sp.pct)+'</span></div>';
          }).join('')+
        '</div>';
    }
    html += '</div>';

    // 5. The certificate as the EARNED OUTCOME of finishing, not a competing upsell.
    //    Demoted: ghost button, end of page, framed as something he earns.
    html +=
      '<div class="card pl-cert">'+
        '<div class="eyebrow" style="margin-bottom:8px">WHEN YOU FINISH</div>'+
        '<b style="font-size:16px">These ninety days end in proof.</b>'+
        '<p class="small ash" style="margin:6px 0 14px;max-width:60ch">Finish your plan and the course and you earn a verified Certificate of Completion. Identity checked, hours logged, a serial anyone can confirm, recognized where it counts. You do not buy it. You earn it.</p>'+
        '<a class="btn btn-secondary btn-sm" href="certificates.html">See how the certificate works</a>'+
      '</div>';

    // 6. Tertiary, quiet.
    html +=
      '<div class="row wrap" style="gap:12px;margin-top:20px;align-items:center">'+
        '<a class="link ash" href="profile.html">Retake the Profile</a>'+
        '<span class="fine ash">&middot;</span>'+
        '<a class="link ash" href="report.html">Your full report</a>'+
        '<span class="fine ash">&middot;</span>'+
        '<a class="link ash" href="classes.html">Browse classes for this focus &rarr;</a>'+
      '</div>';

    root.innerHTML = html;
    restoreChecks();
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
  // ninety days he is (goal-gradient). No consecutive streak, because a broken streak
  // shames the exact users who miss weeks for real reasons. No badge theater.
  function computeProgress(plan, week){
    var actionsDone = 0, weeksWithAction = 0;
    for(var w=1; w<=12; w++){
      var wkDone = 0;
      for(var a=0; a<2; a++){
        try { if(localStorage.getItem('fc_plan_w'+w+'_a'+a)==='1'){ actionsDone++; wkDone++; } } catch(e){}
      }
      if(wkDone>0) weeksWithAction++;
    }
    var pctThroughPlan = Math.min(100, Math.round((week/12)*100));
    return { actionsDone: actionsDone, weeksWithAction: weeksWithAction, pctThroughPlan: pctThroughPlan };
  }

  // ---------- a representative demo result (signed-out preview) ----------
  function demoResult(){
    return {
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

  load();
})();
