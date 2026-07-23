/* Keystone full assessment UI: mode choice, sectioned runner, resume, 26-scale results. */
(function(){
  var root = document.getElementById('keystone');
  if(!root || !window.KEYSTONE || !window.KS) return;

  /* Which instrument is this sitting? Chosen by ?assessment=<slug> and resolved
     through the registry, so adding a profile is a registry entry rather than a
     change here. Falls back to the father profile when the parameter is absent
     or unrecognised, which keeps every existing link working. An instrument
     that is not released is refused, so an uncalibrated draft cannot be reached
     by guessing at a URL. */
  var ACTIVE_INS = window.KEYSTONE;
  (function pickInstrument(){
    var want = null;
    try { want = new URLSearchParams(window.location.search).get('assessment'); } catch(e){}
    if(!want || !window.FCReg || !FCReg.bySlug) return;
    var entry = FCReg.bySlug(want);
    if(!entry) return;
    var data = FCReg.data(entry);
    if(!data) return;
    if(data.released === false){
      root.innerHTML = '<div class="container" style="padding:80px 0"><div class="card" style="max-width:560px;margin:0 auto;text-align:center">'+
        '<h2 class="d-28" style="margin-bottom:10px">Not open yet</h2>'+
        '<p class="small" style="margin-bottom:20px">This profile is not released to participants yet.</p>'+
        '<a class="btn btn-primary" href="profile.html">Take the Keystone Father Profile</a></div></div>';
      throw new Error('instrument not released');
    }
    ACTIVE_INS = data;
  })();

  KS.init(ACTIVE_INS);
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
    // v4.0: the military surface is dark (SHOW_MILITARY=false in build_pages.py).
    // The gate passes straight through; profiles.served stays dormant in the schema.
    next(); return;
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

  // Per-dimension copy. Strength lines affirm behavior. Growth lines name a changeable
  // behavior in a situation (guilt-adaptive, never "you are a bad father"). First moves
  // are if-then implementation intentions. Brand voice: blunt, short, no clinical language.
  var SCALE_COPY = {
    involvement:{s:"You are in it. You do not father from the sidelines.",g:"Being there is the whole game, and it is the thing to build first.",m:["When you walk in the door, your phone stays in your pocket for ten minutes.","Put one standing time with each kid on the calendar this week.","Before you talk about your day, ask about theirs."]},
    consistency:{s:"Your kids can count on you. You show up when you say you will.",g:"Kids trust what repeats. The fix is the same time, kept, again and again.",m:["Tell each kid the next time they will see you, and keep it.","When something threatens the standing time, you move the other thing.","Say what you will do this week, then do exactly that."]},
    awareness:{s:"You pay attention. You notice what is going on with your kids.",g:"You cannot lead a child you do not know. Start by learning their world.",m:["Learn the names of their three closest friends this week.","When they talk, you ask one more question before you respond.","Notice one thing they cared about today and bring it up tomorrow."]},
    nurturance:{s:"You are warm. Your kids know you are safe to come to.",g:"Warmth is a habit you can grow. It starts with how you greet them.",m:["When they come to you, you stop and turn toward them fully.","Say one specific thing you are proud of before the day ends.","When they are upset, you sit with it before you try to fix it."]},
    commitment:{s:"You are all in. You do not quit on your family.",g:"Commitment shows in the small kept promises, not the big speeches.",m:["Make one promise this week that is small enough to keep for certain.","When it gets hard, you stay in the room.","Tell them, out loud, that you are not going anywhere."]},
    active_listening:{s:"You listen. Your kids feel heard when they talk to you.",g:"Most men jump to fixing. The move is to hear it all the way first.",m:["When they tell you something, you say it back before you answer.","Hold one whole conversation where you give no advice at all.","When you want to interrupt, you count to three and let them finish."]},
    job_satisfaction:{s:"You carry your work well, and it does not swallow your home.",g:"The line between work and home is a thing you can guard on purpose.",m:["Set a hard stop time twice this week and honor it.","When you get home, take five minutes alone, then you are fully theirs.","Leave one work problem at the door tonight."]},
    emotional_regulation:{s:"You hold steady. Your kids are not braced around your moods.",g:"Your temper is a behavior in a moment, and moments can be caught.",m:["When you feel heat rising, you name it and step away for two minutes.","Before you react, you take one full breath.","When you get it wrong, you go back and repair it out loud."]},
    legacy_planning:{s:"You think past today. You are building something that lasts.",g:"A legacy is built on purpose, one recorded thing at a time.",m:["Write down one thing you want your kids to remember about you.","Tell one story from your life at the table this week.","Record sixty seconds of your voice for them to keep."]},
    flourishing:{s:"You are steady in yourself, and your kids feel that ground.",g:"You cannot pour from empty. Your own health is theirs too.",m:["Protect one hour this week that is only yours.","When you are running low, you say so instead of going cold.","Do one thing that resets you, and do it without guilt."]},
    modeling:{s:"You lead by example. Your kids learn from how you live.",g:"They copy what you do, not what you say. Show them the thing.",m:["Do one hard right thing this week where they can see it.","When you make a mistake, you own it in front of them.","Name one value out loud as you live it today."]},
    freedom_expression:{s:"You let your kids be themselves around you.",g:"A kid who can speak freely at home comes home. Make room for it.",m:["When they disagree, you thank them for saying it.","Let one small choice this week be fully theirs.","Ask what they think before you tell them what you think."]},
    knowing_my_child:{s:"You know your kids as they really are, not as you imagine them.",g:"Every child is specific. Learn the one in front of you.",m:["Ask each kid what they are into right now, and remember it.","Spend twenty minutes doing the thing they love, on their terms.","Name one thing each kid is good at that no one else notices."]},
    financial_provision:{s:"You provide. Your family is covered because you carry it.",g:"Provision is more than money. It is presence they can bank on too.",m:["Show them once how you plan, so money is not a mystery.","Pair one provided thing this week with time, not just the thing.","Tell them what you are working toward and why."]},
    education_involvement:{s:"You are in their learning. School is not something you outsource.",g:"Kids rise when a father shows up for the mind, not just the report card.",m:["Ask about one specific thing they learned today, not just grades.","Show up for one school thing this month.","When they struggle, you sit beside the work with them."]},
    parental_discussion:{s:"You and their other parent talk. Your kids see a united front.",g:"Kids feel the seams. Line up with their other parent behind the scenes.",m:["Agree on one rule this week before it comes up with the kids.","When you disagree, you take it away from the kids first.","Say one good thing about their other parent in front of them."]},
    family_crises:{s:"You hold the line when things go hard. Your family leans on you.",g:"Crisis is where kids learn if they are safe. Be the calm on purpose.",m:["When the next hard thing hits, you name the plan out loud.","Tell them the truth at their level instead of hiding it.","Be the steady voice in one hard moment this week."]},
    showing_affection:{s:"You show love plainly. Your kids do not have to guess.",g:"Affection is a muscle. Say it and show it until it is normal.",m:["Tell each kid you love them today, in words.","Give one hug that you do not rush.","Write one short note and leave it where they will find it."]},
    spiritual_moral:{s:"You are equipping your kids with something to stand on.",g:"Kids need a why for right and wrong. Hand them yours on purpose.",m:["Talk through one right-and-wrong choice at the table this week.","Tell them one thing you believe and why you believe it.","When you fall short of your own values, you say so."]},
    time_commitment:{s:"You give your kids real time, not just leftovers.",g:"Time is the currency kids read as love. Spend it deliberately.",m:["Block one hour this week that belongs only to them.","Put the phone in another room for one full activity.","Say yes to one thing they ask you to do with them."]},
    giving_guidance:{s:"You guide. Your kids get direction from you, not just rules.",g:"Kids want a map, not a fence. Teach the why behind the rule.",m:["When you set a rule this week, you give the reason with it.","Ask what they would do before you tell them what to do.","Share one lesson you learned the hard way."]},
    marital_relationship:{s:"You invest in your marriage, and your kids stand on that ground.",g:"The strongest thing you give your kids is loving their other parent well.",m:["Do one thing for your spouse this week with no scoreboard.","Let the kids catch you being kind to their other parent.","Protect one hour for the marriage, on the calendar."]},
    childhood_satisfaction:{s:"You have looked honestly at how you were fathered. That takes guts.",g:"What you did not get, you can still choose to give. That choice starts now.",m:["Name one thing you will do differently than was done for you.","Give your kid one thing this week you wish you had received.","Forgive one thing this month, for your sake and theirs."]},
    fathering_satisfaction:{s:"You care how you are doing as a father. That care is the engine.",g:"Confidence grows from small wins. Stack a few and it climbs.",m:["Notice one thing you did well as a father today.","Ask your kid what they like about time with you.","Keep one small fathering promise and let it count."]},
    leadership_satisfaction:{s:"You are learning to lead your home with a steady hand.",g:"Leadership at home is quiet consistency, not control. Build the habit.",m:["Make one household decision this week clearly and calmly.","When you are unsure, you say the plan anyway and adjust.","Own one thing that went wrong without blaming."]},
    satisfaction_child_rel:{s:"You want a real relationship with your kids, and you are chasing it.",g:"Closeness is built in small moments. Make more of them on purpose.",m:["Start one conversation this week that is not about a task.","Do one thing they love with them, their way.","Tell them one specific reason you like being their dad."]}
  };

  // ---------- entry: choose mode, or resume ----------
  function start(){
    // An explicit track choice on the homepage always wins, signed in or not.
    var intent = null;
    try { intent = localStorage.getItem('fc_intent_path'); if(intent) localStorage.removeItem('fc_intent_path'); } catch(e){}
    if(intent === 'preparing'){ KS.setPath('preparing'); servedGate(preparingIntro); return; }
    // 'full' and 'father' both mean the complete instrument. 'father' is kept
    // because it is already sitting in returning visitors' localStorage and in
    // existing links; 'full' is the honest name now that the complete path is
    // also used by the Manhood Profile.
    if(intent === 'full' || intent === 'father'){ KS.setPath('father'); servedGate(chooseMode); return; }
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
          '<span>The Fatherhood Track. You\'ll take the full Keystone Father Profile: the complete inventory of how you father today.</span></button>'+
        '<button class="ks-mode" data-path="preparing">'+
          '<b>I\'m preparing, mentoring, or growing</b>'+
          '<span>The Manhood Track. Expectant fathers, future fathers, mentors, and men rebuilding. You\'ll start by reflecting on your own upbringing, then explore the path.</span></button>'+
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
      '<p class="fine" style="margin-top:16px;text-align:center"><a href="certificates.html" class="link ash" style="font-size:12px">Or browse the three courses first</a></p>');
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
    // Title and norm claim come from the instrument. They used to be hardcoded,
    // which is how this screen ended up promising "normed on 9,232 fathers"
    // while the instrument carries 2,066 and the report prints 2,066.
    var insTitle = (ACTIVE_INS.title || 'The Keystone Father Profile').toUpperCase();
    var insNormed = !!(ACTIVE_INS.norms_n > 0);
    var insGroup = ACTIVE_INS.norm_group_noun || 'fathers';
    var insClaim = insNormed
      ? 'The complete validated inventory, normed on '+ACTIVE_INS.norms_n.toLocaleString()+' '+insGroup+'. Answer honestly. Your results are private.'
      : 'The complete inventory. This profile does not have a norm group yet, so your results show where you placed yourself, not how you compare to other '+insGroup+'. Answer honestly. Your results are private.';
    root.innerHTML = shell(
      '<div class="eyebrow">'+insTitle+'</div>'+
      '<h2 style="margin:10px 0 6px">'+totalItems+' questions. Your call how you take them.</h2>'+
      '<p class="helper">'+insClaim+'</p>'+
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
    // signed out: create the account (password) so his progress lives on it
    var answered = KS.answeredCount();
    root.innerHTML = shell(
      '<div class="ks-gate" style="max-width:480px">'+
        '<div class="eyebrow brass" style="margin-bottom:14px">SAVE YOUR PROGRESS</div>'+
        '<h2 style="margin:0 0 6px">Keep your place. Finish when you have time.</h2>'+
        '<p class="helper" style="margin-bottom:22px">You\'ve answered '+answered+' question'+(answered===1?'':'s')+' so far. Create your free account and your progress is saved to it, on any device.</p>'+
        '<div class="ks-gate-form">'+
          '<input class="input" type="email" id="ksSaveEmail" placeholder="you@email.com" autocomplete="email">'+
          '<button class="btn btn-yellow" id="ksSaveGo" style="width:100%;margin-top:12px">Email me a link to save</button>'+
          '<p class="ksmsg fine" id="ksSaveMsg" style="margin-top:12px;text-align:center"></p>'+
        '</div>'+
        '<p class="fine" style="margin-top:14px;text-align:center">Already have an account? <a class="link ash" href="login.html?next=profile.html" style="font-size:12px">Sign in</a></p>'+
        '<p class="fine" style="margin-top:10px;text-align:center"><button class="ks-save-btn" id="ksSaveBack">Not now, keep going</button></p>'+
      '</div>');
    var input = document.getElementById('ksSaveEmail');
    var go = document.getElementById('ksSaveGo');
    var msg = document.getElementById('ksSaveMsg');
    var backBtn = document.getElementById('ksSaveBack');
    function submit(){
      var email = (input.value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent='Enter your email so we can send the link.'; msg.style.color='var(--error)'; return; }
      go.disabled = true; go.textContent = 'Sending...'; msg.textContent='';
      // flag that this is a resume (not a completed result) so return lands back in the assessment
      try { localStorage.setItem('fc_resume_intent','1'); } catch(e){}
      FC.signInMagic(email, 'profile.html').then(function(r){
        if(r && r.error){ msg.textContent=r.error.message||'Something went wrong. Try again.'; msg.style.color='var(--error)'; go.disabled=false; go.textContent='Email me a link to save'; return; }
        root.innerHTML = shell(
          '<div class="center" style="padding:44px 0">'+
            '<div class="ks-check">\u2713</div>'+
            '<h2 style="margin:8px 0">Check your email.</h2>'+
            '<p class="helper">We saved your place and sent a link to <b>'+esc(email)+'</b>. Click it to sign in and pick up right where you left off. No password.</p>'+
          '</div>');
      });
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
    // Preserve the completed result locally so it survives the sign-up round trip.
    try { localStorage.setItem('fc_pending_result', JSON.stringify({
      scored: scored, preparing: KS.isPreparing(), at: Date.now(),
      // Which instrument produced this. Without it a man who takes the Manhood
      // Profile signed out is handed a Father Profile report when he lands.
      assessment_slug: (ACTIVE_INS && ACTIVE_INS.slug) || 'keystone-father-profile'
    })); } catch(e){}

    var signedIn = window.FC && FC.live && FC.uid();
    if(signedIn){ KS.saveResult(scored); }

    if(KS.isPreparing()){
      return finishPreparing(scored);
    }
    // Full results show to everyone. Account creation is a save action below
    // the results, not a gate in front of them.
    return showResults(scored);
  }

  // ---------- SAVE THE PLAN (no paywall, no password) ----------
  // The full results are already on screen. One email field, a magic link creates the
  // account and signs him in on return. Save, not unlock.
  function sendPlanLink(email, btn, msg){
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent='Enter your email so we can send your plan.'; msg.style.color='var(--error)'; return; }
    btn.disabled=true; btn.textContent='Sending your plan\u2026'; msg.textContent='';
    ksEv('plan_email_submitted', {});
    if(window.FC && FC.signInMagic){
      FC.signInMagic(email, 'plan.html?reveal=1').then(function(r){
        if(r && r.error){ msg.textContent=r.error.message||'Something went wrong. Try again.'; msg.style.color='var(--error)'; btn.disabled=false; btn.textContent='Send me my plan'; return; }
        root.innerHTML = shell(
          '<div class="center" style="padding:44px 0">'+
            '<div class="ks-check">\u2713</div>'+
            '<h2 style="margin:8px 0">Check your email.</h2>'+
            '<p class="helper">Your plan is on its way to <b>'+esc(email)+'</b>. Click the link in that email to open your dashboard. Your full profile is saved and waiting.</p>'+
            '<p class="fine" style="margin-top:20px">No password. The link signs you in. If it is not there in a minute, check spam.</p>'+
          '</div>');
      });
    }
  }

  // ---------- full results: shown free to everyone, all 26 dimensions ----------
  window.__showResults = function(sc){ return showResults(sc); };  // test seam
  function showResults(scored){
    enterAssessment();
    if(KS.isPreparing()){ return finishPreparing(scored); }
    var strK = scored.strength, gapK = scored.gap;
    var strength = scored.scales[strK], gap = scored.scales[gapK];
    // Copy comes from the instrument being taken. This used to read a single
    // father-specific library keyed by scale name, so a man taking the Manhood
    // Profile was shown lines about his kids on shared scale keys, and blank
    // copy on the keys the father profile does not have.
    var COPY = ACTIVE_INS.scale_copy || SCALE_COPY;
    var sCopy = COPY[strK] || {s:'You showed up and did the honest work.',g:'',m:[]};
    var gCopy = COPY[gapK] || {s:'',g:'This is the one to build first.',m:[]};
    var band = (KS.bandFor ? KS.bandFor(scored.overall) : {label:'A starting point'});
    var bandLine = {
      'Strong':'You are on strong ground. The work now is to hold it.',
      'Solid':'You have a solid base. Now you sharpen it.',
      'Developing':'You are on your way, and the next moves compound.',
      'Building':'You are building. Every small habit from here counts.',
      'A starting point':'A starting point is still a start, and starting is the part most men skip.'
    }[band.label] || 'Here is where you stand, and where you move next.';
    var sameScale = (strK === gapK);
    var signedIn = window.FC && FC.live && FC.uid();

    var sp = strength ? strength.pct : 0;
    // A percentile standing is a claim about a norm group. On an instrument that
    // has none, it is meaningless and it was also printing nonsense like
    // "stronger than about 100 out of 100 fathers". Only normed instruments get
    // a comparison, and the noun comes from the instrument.
    var normedIns = !!(ACTIVE_INS.norms_n > 0);
    var groupNoun = ACTIVE_INS.norm_group_noun || 'fathers';
    var strengthStanding = (normedIns && sp>=60 && sp<100)
                          ? ('Stronger than about '+sp+' out of 100 '+groupNoun+' here.')
                          : 'This is your strongest ground to build from.';

    var sectionsHtml = order.map(function(secKey){
      var m = KS.sectionMeta(secKey);
      var scalesInSec = Object.keys(scored.scales).filter(function(k){return scored.scales[k].section===secKey;});
      var rows = scalesInSec.map(function(k){
        var s2 = scored.scales[k], isGap = k===gapK, isStr = k===strK;
        return '<div class="ks-rslt'+(isGap?' gap':'')+'">'+
          '<div class="ks-rslt-top"><span>'+esc(s2.label)+(isGap?' <em>next move</em>':(isStr?' <em class="str">strength</em>':''))+'</span>'+
          '<span class="ks-rslt-band">'+s2.band.label+'</span></div>'+
          '<div class="ks-bar"><span style="width:0" data-w="'+s2.pct+'"></span></div></div>';
      }).join('');
      return '<div class="ks-section-block"><div class="ks-section-head">'+esc(m.title)+'</div>'+rows+'</div>';
    }).join('');

    var moves = (gCopy.m||[]).map(function(mv,i){
      return '<div class="ks-move"><span class="ks-move-n">'+(i+1)+'</span><span class="ks-move-t">'+esc(mv)+'</span></div>';
    }).join('');

    var accountCard = signedIn
      ? '<a class="btn btn-yellow" style="width:100%" href="plan.html?reveal=1">Open your full plan</a>'+
        '<p class="fine" style="text-align:center;margin-top:12px"><a class="link ash" href="report.html">Read your full written report &rarr;</a></p>'
      : '<div class="ks-save-card">'+
          '<div class="ks-built"><div class="ks-built-track"><span id="ksBuilt" style="width:0"></span></div><span class="ks-built-n">Your profile is 90% built</span></div>'+
          '<h3 class="ks-save-h">Finish it. Save your plan.</h3>'+
          '<p class="helper" style="margin-bottom:16px">You did the work. Enter your email and we send your ninety-day plan and save your profile, so you can retake it later and watch yourself move.</p>'+
          '<input class="input" type="email" id="ksEmail" placeholder="you@email.com" autocomplete="email">'+
          '<button class="btn btn-yellow" id="ksSavePlan" style="width:100%;margin-top:10px">Send me my plan</button>'+
          '<p class="ksmsg fine" id="ksMsg" style="margin-top:10px;text-align:center"></p>'+
          '<p class="fine" style="margin-top:8px;text-align:center">No password. We send a secure link. We never share your email.</p>'+
        '</div>'+
        '<p class="fine" style="text-align:center;margin-top:14px"><a class="link ash" href="report.html">Read your full written report &rarr;</a></p>';

    root.innerHTML = shell(
      '<div class="center" style="margin-bottom:30px">'+
        '<div class="ks-check" style="margin-bottom:10px">\u2713</div>'+
        '<div class="eyebrow brass" style="margin-bottom:10px">ALL 128 ITEMS. DONE.</div>'+
        '<h2 style="margin:0 0 6px">You just did what most men never do.</h2>'+
        '<p class="helper" style="margin:0">You looked at '+esc(ACTIVE_INS.subject_noun || 'how you father')+', honestly, all the way through.</p>'+
      '</div>'+
      '<div class="ks-strength-hero">'+
        '<div class="eyebrow" style="margin-bottom:12px">YOUR STRONGEST GROUND</div>'+
        '<div class="ks-strength-name">'+esc(strength ? strength.label : 'You showed up')+'</div>'+
        (sCopy.s ? '<p class="ks-strength-line">'+esc(sCopy.s)+'</p>' : '')+
        '<div class="ks-band-chip">'+strengthStanding+'</div>'+
      '</div>'+
      '<div class="ks-overall-band">'+
        '<span class="ks-ob-label">OVERALL</span>'+
        '<span class="ks-ob-value">'+band.label+'</span>'+
        '<span class="ks-ob-line">'+bandLine+'</span>'+
      '</div>'+
      (sameScale ? '' :
        '<div class="ks-next">'+
          '<div class="eyebrow" style="margin-bottom:10px">YOUR NEXT MOVE</div>'+
          '<div class="ks-next-name">'+esc(gap ? gap.label : '')+'</div>'+
          (gCopy.g ? '<p class="ks-next-line">'+esc(gCopy.g)+'</p>' : '')+
        '</div>')+
      (moves ? '<div class="ks-moves"><div class="ks-moves-h">Your first three moves</div>'+moves+
        '<p class="fine" style="margin-top:14px">These are day one. Your full ninety-day plan builds from here.</p></div>' : '')+
      accountCard+
      '<details class="ks-fullprofile"><summary>See your full profile, all 26 dimensions</summary>'+
        '<p class="fine" style="margin:12px 0 18px">'+
          (normedIns
            ? 'Relative to '+ACTIVE_INS.norms_n.toLocaleString()+' '+esc(groupNoun)+'. Your strength and your next move are marked.'
            : 'This profile does not have a norm group yet, so nothing here ranks you against anyone. Your strength and your next move are marked.')+
        '</p>'+
        sectionsHtml+
      '</details>'+
      '<p class="ks-end">You were never broken. Now you build.</p>',
      true);

    requestAnimationFrame(function(){ setTimeout(function(){
      root.querySelectorAll('.ks-bar>span').forEach(function(sp2){ sp2.style.width = sp2.dataset.w+'%'; });
      var bt=document.getElementById('ksBuilt'); if(bt) bt.style.width='90%';
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
