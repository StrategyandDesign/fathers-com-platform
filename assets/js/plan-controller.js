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

    // header
    var html =
      '<div class="row between wrap" style="margin-bottom:32px">'+
        '<div><h1 class="d-36">Your ninety-day plan.</h1>'+
        '<p class="lead" style="margin-top:8px;max-width:52ch">Built from your Keystone Profile. Your focus: <b class="brass">'+esc(plan.focusLabel)+'</b>.</p></div>'+
        '<div class="row" style="align-items:center;gap:10px">'+
          '<span class="chip" style="cursor:default">Baseline <b class="mono" style="margin-left:8px">'+overall+'</b></span>'+
          '<span class="chip" style="cursor:default">Week '+week+' of 12</span>'+
        '</div>'+
      '</div>';

    if(isDemo){
      html += '<div class="notice brass" style="margin-bottom:28px">This is a sample plan. <a class="link" href="login.html">Sign in</a> and take your baseline to get yours.</div>';
    }

    // ---- MOMENTUM BAND: the retention engine (streak, actions done, achievements) ----
    var m = computeMomentum(plan, week);
    html +=
      '<div class="mo-band">'+
        '<div class="mo-stat">'+
          '<div class="mo-num">'+m.streak+'</div>'+
          '<div class="mo-lbl">week'+(m.streak===1?'':'s')+' with action</div>'+
        '</div>'+
        '<div class="mo-stat">'+
          '<div class="mo-num">'+m.actionsDone+'</div>'+
          '<div class="mo-lbl">actions completed</div>'+
        '</div>'+
        '<div class="mo-stat">'+
          '<div class="mo-num">'+m.pctThroughPlan+'%</div>'+
          '<div class="mo-lbl">through your ninety days</div>'+
        '</div>'+
        '<div class="mo-stat mo-next">'+
          '<div class="mo-lbl" style="margin-bottom:4px">DO NEXT</div>'+
          '<div class="mo-next-txt">'+esc(m.doNext)+'</div>'+
        '</div>'+
      '</div>';

    // achievements earned so far
    if(m.achievements.length){
      html += '<div class="mo-achievements">'+
        m.achievements.map(function(a){
          return '<div class="mo-badge'+(a.earned?' earned':'')+'" title="'+esc(a.desc)+'">'+
            '<span class="mo-badge-icon">'+(a.earned?'\u2713':'\u25CB')+'</span>'+
            '<span>'+esc(a.label)+'</span></div>';
        }).join('')+
      '</div>';
    }

    // focus card: what this plan is about
    html +=
      '<div class="card brass-card" style="padding:28px;margin-bottom:28px">'+
        '<div class="eyebrow brass" style="margin-bottom:10px">YOUR GROWTH FOCUS</div>'+
        '<h2 class="d-28" style="margin-bottom:8px">'+esc(plan.focusLabel)+'</h2>'+
        '<p class="ash" style="max-width:60ch">'+esc(plan.focusText)+' This is where your next ninety days concentrate. Not because you are failing here, but because growth here changes the most.</p>'+
      '</div>';

    // this week's actions
    html +=
      '<div class="card" style="padding:32px;margin-bottom:28px">'+
        '<div class="row between" style="margin-bottom:8px"><div class="eyebrow">THIS WEEK</div>'+
        '<span class="tag">'+esc(wk.phaseLabel).toUpperCase()+' &middot; PHASE '+(wk.phase+1)+'</span></div>'+
        '<h2 class="d-28" style="margin-bottom:22px">Week '+week+'</h2>'+
        '<div class="stack-16">'+
          wk.actions.map(function(a, i){
            var key = 'fc_plan_w'+week+'_a'+i;
            return '<label class="actionrow"><input type="checkbox" data-persist="'+key+'">'+
              '<div style="flex:1"><div class="txt">'+esc(a)+'</div>'+
              '<div class="meta">'+esc(plan.focusLabel)+'</div></div></label>';
          }).join('')+
        '</div>'+
        '<p class="fine" style="margin-top:16px">Mark them when they happen. Honest beats perfect.</p>'+
      '</div>';

    // the 12-week arc
    html +=
      '<div class="card" style="padding:28px;margin-bottom:28px">'+
        '<div class="eyebrow" style="margin-bottom:16px">YOUR NINETY DAYS</div>'+
        '<div class="weeks">'+
          plan.weeks.map(function(w){
            var cls = w.week < week ? 'done' : (w.week === week ? 'now' : '');
            return '<span class="'+cls+'"></span>';
          }).join('')+
        '</div>'+
        '<div class="phaselabels"><span>WKS 1-4 &middot; ESTABLISH</span><span>5-8 &middot; DEEPEN</span><span>9-12 &middot; SUSTAIN</span></div>'+
      '</div>';

    // strengths + supporting focus
    html += '<div class="grid-2" style="gap:20px;margin-bottom:20px">';
    if(plan.strengthLabel){
      html +=
        '<div class="card" style="padding:24px">'+
          '<div class="eyebrow" style="margin-bottom:10px">YOUR STRENGTH</div>'+
          '<b style="font-family:var(--font-display);font-size:20px;font-weight:500">'+esc(plan.strengthLabel)+'</b>'+
          '<p class="small ash" style="margin-top:8px">Lead from here. This is working, keep it working.</p>'+
        '</div>';
    }
    if(plan.supporting && plan.supporting.length){
      html +=
        '<div class="card" style="padding:24px">'+
          '<div class="eyebrow" style="margin-bottom:10px">ALSO WORTH TENDING</div>'+
          plan.supporting.map(function(s){
            return '<div class="row between" style="margin-bottom:8px"><span class="small">'+esc(s.label)+'</span>'+
              '<span class="mono small ash">'+Math.round(s.pct)+'</span></div>';
          }).join('')+
        '</div>';
    }
    html += '</div>';

    // earn a certificate: the obvious next step from the plan
    html +=
      '<div class="card" style="padding:24px;margin-top:8px;border:1px solid var(--brass)">'+
        '<div class="row between wrap" style="gap:16px;align-items:center">'+
          '<div style="max-width:58ch">'+
            '<div class="eyebrow brass" style="margin-bottom:8px">EARN A CERTIFICATE</div>'+
            '<b style="font-size:16px">Ready for proof you did the work?</b>'+
            '<p class="small" style="margin-top:6px">Turn your plan into a court-ready, verified certificate. Identity checked, hours logged, a serial anyone can confirm. Free with your program code.</p>'+
          '</div>'+
          '<a class="btn btn-yellow" href="certificates.html" style="white-space:nowrap">See certificates</a>'+
        '</div>'+
      '</div>';

    // retake + link to full results
    html +=
      '<div class="row wrap" style="gap:14px;margin-top:8px">'+
        '<a class="btn btn-secondary" href="profile.html">Retake the Profile</a>'+
        '<a class="link ash" href="classes.html" style="align-self:center">Browse classes for this focus &rarr;</a>'+
      '</div>';

    root.innerHTML = html;
    restoreChecks();
  }

  // ---------- persistence for the weekly checkboxes ----------
  function restoreChecks(){
    root.querySelectorAll('input[data-persist]').forEach(function(cb){
      var key = cb.getAttribute('data-persist');
      try { if(localStorage.getItem(key)==='1') cb.checked = true; } catch(e){}
      cb.addEventListener('change', function(){
        try { localStorage.setItem(key, cb.checked?'1':'0'); } catch(e){}
        var row = cb.closest('.actionrow'); if(row) row.classList.toggle('done', cb.checked);
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

  // Compute the retention mechanics: streak, actions completed, plan progress, next action, achievements.
  function computeMomentum(plan, week){
    var answers = {}; // read completed checkboxes from localStorage
    var actionsDone = 0, weeksWithAction = 0;
    for(var w=1; w<=12; w++){
      var wkDone = 0;
      for(var a=0; a<2; a++){
        try { if(localStorage.getItem('fc_plan_w'+w+'_a'+a)==='1'){ actionsDone++; wkDone++; } } catch(e){}
      }
      if(wkDone>0) weeksWithAction++;
    }
    // streak = consecutive recent weeks (through current) with at least one action
    var streak = 0;
    for(var w2=week; w2>=1; w2--){
      var any=false;
      for(var a2=0;a2<2;a2++){ try { if(localStorage.getItem('fc_plan_w'+w2+'_a'+a2)==='1') any=true; } catch(e){} }
      if(any) streak++; else break;
    }
    var pctThroughPlan = Math.min(100, Math.round((week/12)*100));

    // do-next: the first uncompleted action in the current week, else next week's first
    var doNext = plan.weeks[week-1] ? plan.weeks[week-1].actions[0] : 'Keep going.';
    for(var a3=0;a3<2;a3++){
      var k = 'fc_plan_w'+week+'_a'+a3;
      var done=false; try { done = localStorage.getItem(k)==='1'; } catch(e){}
      if(!done && plan.weeks[week-1]){ doNext = plan.weeks[week-1].actions[a3]; break; }
    }

    // achievements: concrete, earnable milestones
    var achievements = [
      {label:'Baseline set', desc:'You took your Keystone Profile.', earned:true},
      {label:'First action', desc:'Complete your first plan action.', earned: actionsDone>=1},
      {label:'One week in', desc:'Act on your plan for a full week.', earned: weeksWithAction>=1},
      {label:'Phase one', desc:'Finish the first four weeks.', earned: week>4 && weeksWithAction>=3},
      {label:'Halfway', desc:'Reach week six.', earned: week>=6},
      {label:'Ten actions', desc:'Complete ten plan actions.', earned: actionsDone>=10},
      {label:'Ninety days', desc:'Complete your plan and retake.', earned: week>=12 && actionsDone>=15}
    ];
    return { streak: streak, actionsDone: actionsDone, pctThroughPlan: pctThroughPlan, doNext: doNext, achievements: achievements };
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
