/* Keystone full assessment UI: mode choice, sectioned runner, resume, 26-scale results. */
(function(){
  var root = document.getElementById('keystone');
  if(!root || !window.KEYSTONE || !window.KS) return;

  KS.init(window.KEYSTONE);
  var order = KS.sectionKeys();     // full set; path narrows it via KS.pathSectionKeys()
  var curSection = null, curIndex = 0, curItems = [];

  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function pct(a,b){ return b? Math.round((a/b)*100):0; }

  /* ---------- funnel instrumentation ---------- */
  function ksEv(name, meta){
    try {
      if (window.FC && FC.live && FC.sb) {
        FC.sb.from('funnel_events').insert({ user_id:(FC.uid&&FC.uid())||null, event:name, meta:meta||{} }).then(function(){},function(){});
      }
    } catch(e){}
  }
  var _ksStarted = false;
  function ksStart(){ if(_ksStarted) return; _ksStarted = true; ksEv('assessment_start', {}); }

  /* Once the Profile has begun, the intro invitation must be gone. Any screen the
     assessment paints means he is in it, so the hero comes down and the app comes up.
     Driven from here, not from sessionStorage, so it survives a new tab and a resume. */
  function enterAssessment(){
    var intro = document.getElementById('ksIntro');
    if (intro && !intro.hidden) intro.hidden = true;
    if (root && root.hidden) root.hidden = false;
    try { sessionStorage.setItem('ks_intro_done','1'); } catch(e){}
  }

  /* ---------- did he serve? asked once, plainly ---------- */
  function servedAsked(){ try { return localStorage.getItem('fc_served') !== null; } catch(e){ return false; } }
  function servedGate(next){
    enterAssessment();
    if (servedAsked()) { next(); return; }
    root.innerHTML = shell(
      '<div class="eyebrow" style="margin-bottom:14px">BEFORE YOU START</div>'+
      '<h2 style="margin:0 0 10px">Did you serve in the military?</h2>'+
      '<p class="helper">Everything on Fathers.com is free, forever, for those who served. Nothing here changes your scores.</p>'+
      '<div class="ks-modes" style="margin-top:28px">'+
        '<button class="ks-mode" data-served="1"><b>Yes, I served</b>'+
          '<span>Veteran. The whole platform is yours at no cost, always.</span></button>'+
        '<button class="ks-mode" data-served="1"><b>I am serving now</b>'+
          '<span>Active duty, Guard, or Reserve. Free, forever.</span></button>'+
        '<button class="ks-mode" data-served="0"><b>No, I did not serve</b>'+
          '<span>Go straight to your Profile.</span></button>'+
      '</div>');
    root.querySelectorAll('.ks-mode').forEach(function(b){
      b.onclick = function(){
        var yes = b.dataset.served === '1';
        try { localStorage.setItem('fc_served', yes ? '1' : '0'); } catch(e){}
        ksEv('served_answered', { served: yes });
        if (yes && window.FC && FC.live && FC.uid && FC.uid()) {
          try { FC.sb.from('profiles').update({ served: true }).eq('id', FC.uid()).then(function(){},function(){}); } catch(e){}
        }
        next();
      };
    });
  }

  // ---------- entry: choose mode, or resume ----------
  function start(){
    // An explicit track choice on the homepage always wins, signed in or not.
    var intent = null;
    try { intent = localStorage.getItem('fc_intent_path'); if(intent) localStorage.removeItem('fc_intent_path'); } catch(e){}
    if(intent === 'preparing'){ KS.setPath('preparing'); servedGate(preparingIntro); return; }
    if(intent === 'father'){ KS.setPath('father'); servedGate(chooseMode); return; }
    if(window.FC && FC.live && FC.uid()){
      // Did he just save-and-signup mid-assessment? Restore his local work into his new account.
      var resuming = false;
      try { resuming = localStorage.getItem('fc_resume_intent') === '1'; } catch(e){}
      if(resuming){
        try { localStorage.removeItem('fc_resume_intent'); } catch(e){}
        var local = KS.restoreLocal();
        if(local){
          // create a session for this account and persist his answers, then resume in place.
          KS.setPath(local.path || 'father');
          KS.resumeOrStart('all_at_once').then(function(){
            // push each locally-held answer up to the new account session
            var keys = Object.keys(local.answers || {});
            var chain = Promise.resolve();
            keys.forEach(function(k){ chain = chain.then(function(){ return KS.saveAnswer(k, local.answers[k]); }); });
            chain.then(function(){ resumeInPlace(); });
          });
          return;
        }
      }
      // otherwise, offer resume from an existing account session, or start fresh
      FC.sb.from('keystone_sessions').select('*').eq('user_id',FC.uid()).eq('status','in_progress')
        .order('updated_at',{ascending:false}).limit(1).maybeSingle().then(function(r){
          if(r.data){ KS.setPath(r.data.path||'father'); offerResume(r.data); } else { startFresh(); }
        }).catch(startFresh);
    } else { startFresh(); }
  }

  // Resume the assessment at the first unanswered question of the current path.
  function resumeInPlace(){
    enterAssessment();
    var pathOrder = KS.pathSectionKeys();
    var ans = KS.getAnswers();
    // find the first section with an unanswered item
    for(var si=0; si<pathOrder.length; si++){
      var items = KS.itemsInSection(pathOrder[si]);
      for(var i=0;i<items.length;i++){
        if(ans[items[i].key]==null){ runSection(pathOrder[si]); return; }
      }
    }
    // everything answered already -> go to finish
    finish();
  }

  // If the man already chose his path on the homepage hero, honor it and skip the gate.
  function startFresh(){
    enterAssessment();
    var pre = null;
    try { pre = localStorage.getItem('fc_intent_path'); localStorage.removeItem('fc_intent_path'); } catch(e){}
    if(pre === 'father'){ KS.setPath('father'); chooseMode(); return; }
    if(pre === 'preparing'){ KS.setPath('preparing'); preparingIntro(); return; }
    gate();  // no pre-selection: show the full gate question
  }

  // THE GATE: one question that routes every man to the right starting point.
  // All men are sons; not all are fathers. Both belong here.
  function gate(){
    root.innerHTML = shell(
      '<div class="eyebrow brass" style="margin-bottom:18px">BEFORE WE BEGIN</div>'+
      '<h2 style="margin:0 0 8px">Where are you in the journey?</h2>'+
      '<p class="helper">Every man here is someone\'s son. Not every man is a father yet. Your answer sets your starting point.</p>'+
      '<div class="ks-modes" style="margin-top:32px">'+
        '<button class="ks-mode" data-path="father">'+
          '<b>I\'m raising children now</b>'+
          '<span>You\'ll take the full Keystone Father Profile: the complete validated inventory of how you father today.</span></button>'+
        '<button class="ks-mode" data-path="preparing">'+
          '<b>I\'m preparing, mentoring, or growing</b>'+
          '<span>Expectant fathers, future fathers, mentors, and men breaking a cycle. You\'ll start by reflecting on your own upbringing, then explore the path.</span></button>'+
      '</div>');
    root.querySelectorAll('.ks-mode').forEach(function(b){
      b.onclick = function(){
        KS.setPath(b.dataset.path);
        servedGate(b.dataset.path === 'father' ? chooseMode : preparingIntro);
      };
    });
  }

  // Non-father path: welcoming intro, then the childhood-reflection questions (no mode choice needed, it's short).
  function preparingIntro(){
    enterAssessment();
    ksStart();
    var items = KS.pathItems();
    if(!items.length){ gate(); return; }
    root.innerHTML = shell(
      '<div class="eyebrow brass" style="margin-bottom:18px">YOUR STARTING POINT</div>'+
      '<h2 style="margin:0 0 8px">Start with the father you had.</h2>'+
      '<p class="helper">Before a man fathers well, it helps to understand how he was fathered. These '+items.length+' questions are about your own upbringing. There are no wrong answers, and your reflections are private.</p>'+
      '<button class="btn btn-yellow" style="width:100%;margin-top:28px" id="ks-prep-begin">Begin</button>'+
      '<p class="fine" style="margin-top:16px;text-align:center"><a href="certificates.html" class="link ash" style="font-size:12px">Or browse the certificate paths first</a></p>');
    document.getElementById('ks-prep-begin').onclick = function(){
      KS.resumeOrStart('all_at_once').then(function(){ runSection(KS.pathSectionKeys()[0]); });
    };
  }

  function offerResume(sess){
    enterAssessment();
    KS.resumeOrStart(sess.mode).then(function(){
      var done = KS.sectionsDone().length, total = order.length;
      var answered = KS.answeredCount(), all = KS.totalCount();
      root.innerHTML = shell(
        '<div class="eyebrow">WELCOME BACK</div>'+
        '<h2 style="margin:10px 0 6px">Pick up where you left off.</h2>'+
        '<p class="helper">You have answered '+answered+' of '+all+' items. '+done+' of '+total+' sections complete.</p>'+
        '<div class="stack-16" style="margin-top:24px">'+
          '<button class="btn btn-primary" style="width:100%" id="ks-resume">Continue</button>'+
          '<button class="btn btn-secondary" style="width:100%" id="ks-restart">Start over</button>'+
        '</div>');
      document.getElementById('ks-resume').onclick = function(){ routeNext(); };
      document.getElementById('ks-restart').onclick = function(){
        if(confirm('Start the Keystone over? Your previous answers stay saved but a new run begins.')) gate();
      };
    });
  }

  function chooseMode(){
    enterAssessment();
    ksStart();
    var dCount = KS.itemsInSection('dimensions').length,
        pCount = KS.itemsInSection('practices').length,
        sCount = KS.itemsInSection('satisfaction').length,
        totalItems = dCount+pCount+sCount;
    root.innerHTML = shell(
      '<div class="eyebrow">THE KEYSTONE FATHER PROFILE</div>'+
      '<h2 style="margin:10px 0 6px">'+totalItems+' questions. Your call how you take them.</h2>'+
      '<p class="helper">The complete validated inventory, normed on 9,232 fathers. Answer honestly. Your results are private.</p>'+
      '<div class="ks-modes">'+
        '<button class="ks-mode" data-mode="all_at_once">'+
          '<b>All at once</b><span>One sitting, about 20 minutes. Best if you have the time now.</span></button>'+
        '<button class="ks-mode" data-mode="by_section">'+
          '<b>Section by section</b><span>Three shorter sittings. We save your place after each. Best for a busy week.</span>'+
          '<em>Dimensions ('+dCount+') · Practices ('+pCount+') · Satisfaction ('+sCount+')</em></button>'+
      '</div>');
    root.querySelectorAll('.ks-mode').forEach(function(b){
      b.onclick = function(){
        KS.resumeOrStart(b.dataset.mode).then(function(){ routeNext(); });
      };
    });
  }

  // ---------- decide what to show next ----------
  function routeNext(){
    var pathOrder = KS.pathSectionKeys();
    var done = KS.sectionsDone();
    var next = pathOrder.find(function(s){ return done.indexOf(s)<0; });
    if(!next){ return finish(); }
    if(KS.getMode()==='by_section' && done.length>0 && KS.answeredCount(next)===0){
      sectionIntro(next);   // pause between sections in sectioned mode
    } else {
      runSection(next);
    }
  }

  function sectionIntro(secKey){
    enterAssessment();
    var meta = KS.sectionMeta(secKey);
    var idx = KS.pathSectionKeys().indexOf(secKey)+1;
    root.innerHTML = shell(
      '<div class="eyebrow">SECTION '+idx+' OF '+KS.pathSectionKeys().length+'</div>'+
      '<h2 style="margin:10px 0 6px">'+esc(meta.title)+'</h2>'+
      '<p class="helper">'+esc(meta.instruction)+'</p>'+
      '<p class="fine" style="margin-top:14px">'+KS.itemsInSection(secKey).length+' questions in this section.</p>'+
      '<button class="btn btn-primary" style="width:100%;margin-top:24px" id="ks-begin">Begin section</button>'+
      (KS.sectionsDone().length>0 ? '<p class="fine" style="margin-top:16px;text-align:center"><a href="plan.html" class="link ash" style="font-size:12px">Save and finish later</a></p>':''));
    document.getElementById('ks-begin').onclick = function(){ runSection(secKey); };
  }

  // ---------- run one section, item by item ----------
  function runSection(secKey){
    curSection = secKey;
    curItems = KS.itemsInSection(secKey);
    // resume at first unanswered in this section; if all are answered, go past
    // the end so drawItem() routes to endSection() instead of redrawing the last item.
    var ans = KS.getAnswers();
    curIndex = curItems.length;
    for(var i=0;i<curItems.length;i++){ if(ans[curItems[i].key]==null){ curIndex=i; break; } }
    drawItem();
  }

  function drawItem(){
    enterAssessment();
    if(curIndex>=curItems.length) return endSection();
    var it = curItems[curIndex];
    var ans = KS.getAnswers();
    var meta = KS.sectionMeta(curSection);
    var secIdx = KS.pathSectionKeys().indexOf(curSection)+1;
    var answeredInSec = curItems.filter(function(f){return ans[f.key]!=null;}).length;
    root.innerHTML = shell(
      '<div class="ks-top">'+
        '<div class="ks-crumb"><span>'+esc(meta.title.toUpperCase())+'</span>'+
        '<span>'+(curIndex+1)+' / '+curItems.length+'</span></div>'+
        '<div class="progress-track"><div class="progress-fill" style="width:'+pct(curIndex, curItems.length)+'%"></div></div>'+
        (KS.getMode()==='by_section' ? '<div class="ks-sections">'+KS.pathSectionKeys().map(function(s,i){
          var done = KS.sectionsDone().indexOf(s)>=0;
          var active = s===curSection;
          return '<span class="ks-seg'+(done?' done':'')+(active?' active':'')+'"></span>';
        }).join('')+'</div>' : '')+
      '</div>'+
      '<div class="ks-q">'+
        '<div class="ks-scalelabel">'+esc(it.scaleLabel)+'</div>'+
        '<h2 class="ks-prompt">'+esc(it.prompt)+'</h2>'+
        '<div class="ks-opts ks-'+it.kind+'">'+
          it.labels.map(function(lab,i){
            var val=i+1, sel = ans[it.key]===val;
            return '<button class="ks-opt'+(sel?' selected':'')+'" data-v="'+val+'">'+
              '<span class="ks-dot"></span><span class="ks-lab">'+esc(lab)+'</span></button>';
          }).join('')+
        '</div>'+
        '<div class="ks-foot">'+
          '<button class="ks-back" '+(curIndex===0?'style="visibility:hidden"':'')+'>Back</button>'+
          '<span class="fine">'+answeredInSec+' answered</span>'+
        '</div>'+
        '<p class="fine ks-savelink" style="margin-top:18px;text-align:center"><button class="ks-save-btn" id="ksSaveLater">Save and continue later</button></p>'+
      '</div>');

    root.querySelectorAll('.ks-opt').forEach(function(b){
      b.onclick = function(){
        var v = parseInt(b.dataset.v,10);
        KS.saveAnswer(it.key, v);
        root.querySelectorAll('.ks-opt').forEach(function(x){x.classList.remove('selected');});
        b.classList.add('selected');
        setTimeout(function(){ curIndex++; drawItem(); }, 180); // brief beat, then advance
      };
    });
    var back = root.querySelector('.ks-back');
    if(back) back.onclick = function(){ if(curIndex>0){curIndex--; drawItem();} };
    var saveBtn = document.getElementById('ksSaveLater');
    if(saveBtn) saveBtn.onclick = function(){ saveAndContinueLater(); };
  }

  // ---------- SAVE AND CONTINUE LATER (from any question) ----------
  // Signed in: just confirm it's saved (answers already persist per-answer) and route out.
  // Signed out: capture email, sign him up, and mark his in-progress work to resume on return.
  function saveAndContinueLater(){
    KS.persistLocal();
    var signedIn = window.FC && FC.live && FC.uid();
    if(signedIn){
      root.innerHTML = shell(
        '<div class="center" style="padding:50px 0">'+
          '<div class="ks-check">\u2713</div>'+
          '<h2 style="margin:8px 0">Saved.</h2>'+
          '<p class="helper">Your progress is saved to your account. Come back anytime and pick up right where you left off.</p>'+
          '<a class="btn btn-primary" style="margin-top:24px" href="plan.html">Go to my plan</a>'+
          '<p class="fine" style="margin-top:14px"><a class="link ash" href="profile.html" style="font-size:12px">Or keep going now</a></p>'+
        '</div>');
      return;
    }
    // signed out: email capture to save + create account
    var answered = KS.answeredCount();
    root.innerHTML = shell(
      '<div class="ks-gate" style="max-width:480px">'+
        '<div class="eyebrow brass" style="margin-bottom:14px">SAVE YOUR PROGRESS</div>'+
        '<h2 style="margin:0 0 6px">Keep your place. Finish when you have time.</h2>'+
        '<p class="helper" style="margin-bottom:22px">You\'ve answered '+answered+' question'+(answered===1?'':'s')+' so far. Enter your email and we\'ll save your progress and send you a link to pick up exactly where you left off, on any device.</p>'+
        '<div class="ks-gate-form">'+
          '<input class="input" type="email" id="ksSaveEmail" placeholder="you@email.com" autocomplete="email">'+
          '<button class="btn btn-yellow" id="ksSaveGo" style="width:100%;margin-top:12px">Save my progress</button>'+
          '<p class="ksmsg fine" id="ksSaveMsg" style="margin-top:12px;text-align:center"></p>'+
        '</div>'+
        '<p class="fine" style="margin-top:16px;text-align:center"><button class="ks-save-btn" id="ksSaveBack">Not now, keep going</button></p>'+
      '</div>');
    var input = document.getElementById('ksSaveEmail');
    var go = document.getElementById('ksSaveGo');
    var msg = document.getElementById('ksSaveMsg');
    var backBtn = document.getElementById('ksSaveBack');
    function submit(){
      var email = (input.value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent='Enter a valid email.'; msg.style.color='var(--error)'; return; }
      go.disabled = true; go.textContent = 'Saving...'; msg.textContent='';
      // flag that this is a resume (not a completed result) so return lands back in the assessment
      try { localStorage.setItem('fc_resume_intent','1'); } catch(e){}
      if(window.FC && FC.signIn){
        FC.signIn(email, 'profile.html').then(function(r){
          if(r && r.error){ msg.textContent='Something went wrong. Try again.'; msg.style.color='var(--error)'; go.disabled=false; go.textContent='Save my progress'; return; }
          root.innerHTML = shell(
            '<div class="center" style="padding:44px 0">'+
              '<div class="ks-check">\u2713</div>'+
              '<h2 style="margin:8px 0">Check your email.</h2>'+
              '<p class="helper">We saved your progress and sent a link to <b>'+esc(email)+'</b>. Click it to sign in and pick up right where you left off.</p>'+
              '<p class="fine" style="margin-top:20px">No password needed. Your answers are waiting.</p>'+
            '</div>');
        });
      }
    }
    go.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){ if(e.key==='Enter') submit(); });
    if(backBtn) backBtn.onclick = function(){ drawItem(); };
    input.focus();
  }

  function endSection(){
    var pathOrder = KS.pathSectionKeys(); var nextKey = pathOrder[pathOrder.indexOf(curSection)+1] || null;
    KS.markSectionDone(curSection, nextKey).then(function(){
      if(KS.getMode()==='all_at_once'){ routeNext(); return; }
      // sectioned mode: celebrate the checkpoint
      if(!nextKey){ finish(); return; }
      var doneN = KS.sectionsDone().length;
      root.innerHTML = shell(
        '<div class="eyebrow">SECTION COMPLETE</div>'+
        '<div class="ks-check">✓</div>'+
        '<h2 style="margin:6px 0">'+doneN+' of '+KS.pathSectionKeys().length+' done.</h2>'+
        '<p class="helper">Your answers are saved. Keep going, or come back anytime.</p>'+
        '<div class="stack-16" style="margin-top:24px">'+
          '<button class="btn btn-primary" style="width:100%" id="ks-cont">Next section</button>'+
          '<a class="btn btn-secondary" style="width:100%" href="plan.html">Finish later</a>'+
        '</div>');
      document.getElementById('ks-cont').onclick = function(){ routeNext(); };
    });
  }

  // ---------- results: all 26 scales ----------
  function finish(){
    var scored = KS.score();
    ksEv('assessment_complete', { preparing: KS.isPreparing() });
    // Preserve the completed result locally so it survives the magic-link round trip.
    try { localStorage.setItem('fc_pending_result', JSON.stringify({
      scored: scored, preparing: KS.isPreparing(), at: Date.now()
    })); } catch(e){}

    var signedIn = window.FC && FC.live && FC.uid();
    if(signedIn){ KS.saveResult(scored); }

    if(KS.isPreparing()){
      return finishPreparing(scored);
    }
    // Spool's rule: never wall the value a man just earned. Full results show to everyone;
    // the email becomes a save action below the results, not a paywall in front of them.
    return showResults(scored);
  }

  // ---------- SAVE THE PLAN (no paywall) ----------
  // The full results are already on screen. This only emails the plan and creates the
  // account via magic link, so he can retake later and track movement. Save, not unlock.
  function sendPlanLink(email, btn, msg){
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent='Enter a valid email.'; msg.style.color='var(--error)'; return; }
    btn.disabled=true; btn.textContent='Sending your plan\u2026'; msg.textContent='';
    ksEv('plan_email_submitted', {});
    if(window.FC && FC.signIn){
      FC.signIn(email,'plan.html').then(function(r){
        if(r && r.error){ msg.textContent='Something went wrong. Try again.'; msg.style.color='var(--error)'; btn.disabled=false; btn.textContent='Email me my plan'; return; }
        root.innerHTML = shell(
          '<div class="center" style="padding:40px 0">'+
            '<div class="ks-check">\u2713</div>'+
            '<h2 style="margin:8px 0">Check your email.</h2>'+
            '<p class="helper">We sent your ninety-day plan and a secure link to <b>'+esc(email)+'</b>. Click it to sign in, and your full profile is saved and waiting.</p>'+
            '<p class="fine" style="margin-top:20px">No password needed. The link signs you in.</p>'+
          '</div>');
      });
    }
  }

  // ---------- full results: shown free to everyone, all 26 dimensions ----------
  function showResults(scored){
    enterAssessment();
    if(KS.isPreparing()){ return finishPreparing(scored); }
    var gap = scored.scales[scored.gap], strength = scored.scales[scored.strength];
    var signedIn = window.FC && FC.live && FC.uid();
    var tail = signedIn
      ? '<a class="btn btn-yellow" style="width:100%" href="plan.html">See my ninety-day plan</a>'
      : '<div class="ks-save-card">'+
          '<h3 class="ks-save-h">Your ninety-day plan is built and waiting.</h3>'+
          '<p class="helper" style="margin-bottom:18px">Enter your email and we will send it, and save your profile so you can retake it later and see how far you have moved. No password.</p>'+
          '<input class="input" type="email" id="ksEmail" placeholder="you@email.com" autocomplete="email">'+
          '<button class="btn btn-yellow" id="ksSavePlan" style="width:100%;margin-top:12px">Email me my plan</button>'+
          '<p class="ksmsg fine" id="ksMsg" style="margin-top:12px;text-align:center"></p>'+
        '</div>';

    var sectionsHtml = order.map(function(secKey){
      var m = KS.sectionMeta(secKey);
      var scalesInSec = Object.keys(scored.scales).filter(function(k){return scored.scales[k].section===secKey;});
      var rows = scalesInSec.map(function(k){
        var s = scored.scales[k];
        var isGap = k===scored.gap;
        return '<div class="ks-rslt'+(isGap?' gap':'')+'">'+
          '<div class="ks-rslt-top"><span>'+esc(s.label)+(isGap?' <em>growth focus</em>':'')+'</span>'+
          '<span class="ks-rslt-band">'+s.band.label+'</span></div>'+
          '<div class="ks-bar"><span style="width:0" data-w="'+s.pct+'"></span></div></div>';
      }).join('');
      return '<div class="ks-section-block"><div class="ks-section-head">'+esc(m.title)+
        ' <span class="mono">'+scored.sections[secKey]+'</span></div>'+rows+'</div>';
    }).join('');

    root.innerHTML = shell(
      '<div class="eyebrow">YOUR KEYSTONE FATHER PROFILE</div>'+
      '<div class="ks-overall">'+scored.overall+'</div>'+
      '<p class="helper" style="text-align:center;margin-bottom:8px">Overall standing across 26 dimensions, relative to 2,066 fathers.</p>'+
      '<div class="ks-summary">'+
        '<div><span class="fine">STRENGTH</span><b>'+esc(strength.label)+'</b></div>'+
        '<div><span class="fine">GROWTH FOCUS</span><b>'+esc(gap.label)+'</b></div>'+
      '</div>'+
      sectionsHtml+
      '<p class="fine" style="margin:20px 0 8px;text-align:center">Your results are yours alone. We never share them.</p>'+
      tail,
      true);
    requestAnimationFrame(function(){ setTimeout(function(){
      root.querySelectorAll('.ks-bar>span').forEach(function(sp){ sp.style.width = sp.dataset.w+'%'; });
    }, 80); });
    if(!signedIn){
      var se=document.getElementById('ksEmail'), sb=document.getElementById('ksSavePlan'), sm=document.getElementById('ksMsg');
      if(sb) sb.addEventListener('click', function(){ sendPlanLink((se.value||'').trim(), sb, sm); });
      if(se) se.addEventListener('keydown', function(e){ if(e.key==='Enter'){ sendPlanLink((se.value||'').trim(), sb, sm); } });
    }
  }

  // Results for the preparing (non-father) path: reflective, forward-looking, no 26-scale profile.
  function finishPreparing(scored){
    enterAssessment();
    var cs = scored.scales.childhood_satisfaction || {pct:50, band:{label:'Reflective'}};
    var warm = cs.pct >= 60
      ? "You carry a good foundation. The chance now is to build on it, and to become for others what was given to you."
      : cs.pct >= 35
        ? "Your upbringing had both gifts and gaps, like most. Naming them honestly is the first real step toward fathering, or mentoring, differently."
        : "What you did not receive growing up, you can choose to give. Many of the best fathers and mentors are men who decided to break a cycle. That decision starts here.";
    root.innerHTML = shell(
      '<div class="eyebrow brass" style="margin-bottom:16px">YOUR REFLECTION</div>'+
      '<h2 style="margin:0 0 8px">Where you\'re starting from.</h2>'+
      '<p class="helper" style="margin-bottom:28px">You reflected honestly on how you were fathered. That awareness is the ground everything else is built on.</p>'+
      '<div class="ks-prep-card">'+
        '<div class="ks-prep-band">'+esc(cs.band.label)+'</div>'+
        '<p>'+warm+'</p>'+
      '</div>'+
      '<h3 style="font-family:var(--font-display);font-weight:500;font-size:20px;margin:32px 0 14px">Your next step</h3>'+
      '<p class="small" style="margin-bottom:24px;color:var(--ash)">The certificate paths are built for every man who wants to father or mentor well, whether or not you have children yet. Start with the fundamentals.</p>'+
      '<a class="btn btn-yellow" style="width:100%" href="certificates.html">Explore the certificate paths</a>'+
      '<p class="fine" style="margin-top:14px;text-align:center"><a href="classes.html" class="link ash" style="font-size:12px">Or preview the classes</a></p>',
      false);
  }

  // ---------- shared shell ----------
  function shell(inner, wide){
    return '<div class="ks-wrap'+(wide?' wide':'')+'">'+inner+'</div>';
  }

  start();
})();
