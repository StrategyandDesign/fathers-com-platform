/* ============================================================
   The written report. Everything the assessment knows, on one
   page a man can read, print as a PDF, or email himself.
   States: signed in (latest saved result), signed out with a
   just-finished result waiting in localStorage, or sample.
   Framing rules (non-negotiable): strengths lead, growth is a
   changeable behavior, never a grade, never a comparison worded as a verdict.
   Branding: a course creator can change two logos and the
   highlight colors. Nothing else.
   ============================================================ */
(function(){
  var root = document.getElementById('rpRoot');
  if(!root || !window.KEYSTONE || !window.KS) return;
  try { KS.init(window.KEYSTONE); } catch(e){}

  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fmtDate(iso){ try { return new Date(iso).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}); } catch(e){ return ''; } }

  /* Per-scale report copy. about = what it measures (educational). s = the strength
     read. g = the growth read, always a changeable behavior. m = first moves as
     if-then actions. Voice: blunt, short, no clinical language. */
  var R = {
    involvement:{about:'How present you are in your kids\u2019 daily lives: the meals, the rides, the ordinary minutes where fathering actually happens.',s:'You are in it. You do not father from the sidelines.',g:'Being there is the whole game, and it is the thing to build first.',m:['When you walk in the door, your phone stays in your pocket for ten minutes.','Put one standing time with each kid on the calendar this week.','Before you talk about your day, ask about theirs.']},
    consistency:{about:'Whether your kids can predict you: kept promises, steady moods, the same father on Tuesday as on Saturday.',s:'Your kids can count on you. You show up when you say you will.',g:'Kids trust what repeats. The fix is the same time, kept, again and again.',m:['Tell each kid the next time they will see you, and keep it.','When something threatens the standing time, you move the other thing.','Say what you will do this week, then do exactly that.']},
    awareness:{about:'How well you actually know what is going on in your kids\u2019 world: their friends, their pressures, what kept them up last night.',s:'You pay attention. You notice what is going on with your kids.',g:'You cannot lead a child you do not know. Start by learning their world.',m:['Learn the names of their three closest friends this week.','When they talk, you ask one more question before you respond.','Notice one thing they cared about today and bring it up tomorrow.']},
    nurturance:{about:'The warmth your kids feel from you: whether you are safe to come to when something is wrong.',s:'You are warm. Your kids know you are safe to come to.',g:'Warmth is a habit you can grow. It starts with how you greet them.',m:['When they come to you, you stop and turn toward them fully.','Say one specific thing you are proud of before the day ends.','When they are upset, you sit with it before you try to fix it.']},
    commitment:{about:'Your staying power: whether your family experiences you as all in, for the long haul, at cost to yourself.',s:'You are all in. You do not quit on your family.',g:'Commitment shows in the small kept promises, not the big speeches.',m:['Make one promise this week that is small enough to keep for certain.','When it gets hard, you stay in the room.','Tell them, out loud, that you are not going anywhere.']},
    active_listening:{about:'Whether your kids feel heard when they talk to you, or managed.',s:'You listen. Your kids feel heard when they talk to you.',g:'Most men jump to fixing. The move is to hear it all the way first.',m:['When they tell you something, you say it back before you answer.','Hold one whole conversation where you give no advice at all.','When you want to interrupt, you count to three and let them finish.']},
    job_satisfaction:{about:'How your work life lands on your home life: whether the job feeds your family or eats it.',s:'You carry your work well, and it does not swallow your home.',g:'The line between work and home is a thing you can guard on purpose.',m:['Set a hard stop time twice this week and honor it.','When you get home, take five minutes alone, then you are fully theirs.','Leave one work problem at the door tonight.']},
    emotional_regulation:{about:'What happens in you under pressure, and what your kids see when it does.',s:'You hold steady. Your kids are not braced around your moods.',g:'Your temper is a behavior in a moment, and moments can be caught.',m:['When you feel heat rising, you name it and step away for two minutes.','Before you react, you take one full breath.','When you get it wrong, you go back and repair it out loud.']},
    legacy_planning:{about:'Whether you are building something your kids will still hold when you are gone: stories, values, a recorded voice.',s:'You think past today. You are building something that lasts.',g:'A legacy is built on purpose, one recorded thing at a time.',m:['Write down one thing you want your kids to remember about you.','Tell one story from your life at the table this week.','Record sixty seconds of your voice for them to keep.']},
    flourishing:{about:'Your own ground: health, steadiness, and whether there is anything left in the tank to give.',s:'You are steady in yourself, and your kids feel that ground.',g:'You cannot pour from empty. Your own health is theirs too.',m:['Protect one hour this week that is only yours.','When you are running low, you say so instead of going cold.','Do one thing that resets you, and do it without guilt.']},
    modeling:{about:'What your kids learn from watching you live, which is most of what they learn.',s:'You lead by example. Your kids learn from how you live.',g:'They copy what you do, not what you say. Show them the thing.',m:['Do one hard right thing this week where they can see it.','When you make a mistake, you own it in front of them.','Name one value out loud as you live it today.']},
    freedom_expression:{about:'Whether your kids can be fully themselves around you, including when they disagree with you.',s:'You let your kids be themselves around you.',g:'A kid who can speak freely at home comes home. Make room for it.',m:['When they disagree, you thank them for saying it.','Let one small choice this week be fully theirs.','Ask what they think before you tell them what you think.']},
    knowing_my_child:{about:'How well you know the specific child in front of you, not the one you imagine.',s:'You know your kids as they really are, not as you imagine them.',g:'Every child is specific. Learn the one in front of you.',m:['Ask each kid what they are into right now, and remember it.','Spend twenty minutes doing the thing they love, on their terms.','Name one thing each kid is good at that no one else notices.']},
    financial_provision:{about:'Whether your family is covered, and whether provision comes with presence or instead of it.',s:'You provide. Your family is covered because you carry it.',g:'Provision is more than money. It is presence they can bank on too.',m:['Show them once how you plan, so money is not a mystery.','Pair one provided thing this week with time, not just the thing.','Tell them what you are working toward and why.']},
    education_involvement:{about:'Your presence in their learning: homework, teachers, the mind and not just the report card.',s:'You are in their learning. School is not something you outsource.',g:'Kids rise when a father shows up for the mind, not just the report card.',m:['Ask about one specific thing they learned today, not just grades.','Show up for one school thing this month.','When they struggle, you sit beside the work with them.']},
    parental_discussion:{about:'How you and their other parent line up: whether your kids see a united front or play the seams.',s:'You and their other parent talk. Your kids see a united front.',g:'Kids feel the seams. Line up with their other parent behind the scenes.',m:['Agree on one rule this week before it comes up with the kids.','When you disagree, you take it away from the kids first.','Say one good thing about their other parent in front of them.']},
    family_crises:{about:'Who you become when it goes wrong, because crisis is where kids learn if they are safe.',s:'You hold the line when things go hard. Your family leans on you.',g:'Crisis is where kids learn if they are safe. Be the calm on purpose.',m:['When the next hard thing hits, you name the plan out loud.','Tell them the truth at their level instead of hiding it.','Be the steady voice in one hard moment this week.']},
    showing_affection:{about:'Whether love gets said and shown plainly, or left for your kids to guess at.',s:'You show love plainly. Your kids do not have to guess.',g:'Affection is a muscle. Say it and show it until it is normal.',m:['Tell each kid you love them today, in words.','Give one hug that you do not rush.','Write one short note and leave it where they will find it.']},
    spiritual_moral:{about:'What you are handing your kids to stand on: a why for right and wrong, lived out loud.',s:'You are equipping your kids with something to stand on.',g:'Kids need a why for right and wrong. Hand them yours on purpose.',m:['Talk through one right-and-wrong choice at the table this week.','Tell them one thing you believe and why you believe it.','When you fall short of your own values, you say so.']},
    time_commitment:{about:'The hours themselves: whether your kids get real time or leftovers.',s:'You give your kids real time, not just leftovers.',g:'Time is the currency kids read as love. Spend it deliberately.',m:['Block one hour this week that belongs only to them.','Put the phone in another room for one full activity.','Say yes to one thing they ask you to do with them.']},
    giving_guidance:{about:'Whether your kids get direction from you, with the why behind the rule, or just the rule.',s:'You guide. Your kids get direction from you, not just rules.',g:'Kids want a map, not a fence. Teach the why behind the rule.',m:['When you set a rule this week, you give the reason with it.','Ask what they would do before you tell them what to do.','Share one lesson you learned the hard way.']},
    marital_relationship:{about:'The ground your kids stand on: how you treat their other parent, which they watch more closely than anything.',s:'You invest in your marriage, and your kids stand on that ground.',g:'The strongest thing you give your kids is loving their other parent well.',m:['Do one thing for your spouse this week with no scoreboard.','Let the kids catch you being kind to their other parent.','Protect one hour for the marriage, on the calendar.']},
    childhood_satisfaction:{about:'How you were fathered, looked at honestly, because what you did not get you can still choose to give.',s:'You have looked honestly at how you were fathered. That takes guts.',g:'What you did not get, you can still choose to give. That choice starts now.',m:['Name one thing you will do differently than was done for you.','Give your kid one thing this week you wish you had received.','Forgive one thing this month, for your sake and theirs.']},
    fathering_satisfaction:{about:'How you feel about the father you are, which is the engine or the brake on everything else.',s:'You care how you are doing as a father. That care is the engine.',g:'Confidence grows from small wins. Stack a few and it climbs.',m:['Notice one thing you did well as a father today.','Ask your kid what they like about time with you.','Keep one small fathering promise and let it count.']},
    leadership_satisfaction:{about:'How you feel about leading your home: quiet consistency, not control.',s:'You are learning to lead your home with a steady hand.',g:'Leadership at home is quiet consistency, not control. Build the habit.',m:['Make one household decision this week clearly and calmly.','When you are unsure, you say the plan anyway and adjust.','Own one thing that went wrong without blaming.']},
    satisfaction_child_rel:{about:'The relationship itself, as it feels from your side: close, distant, or somewhere you want to move.',s:'You want a real relationship with your kids, and you are chasing it.',g:'Closeness is built in small moments. Make more of them on purpose.',m:['Start one conversation this week that is not about a task.','Do one thing they love with them, their way.','Tell them one specific reason you like being their dad.']}
  };

  var SEC_INTRO = {
    dimensions:'The core of how you father: presence, steadiness, attention, warmth, and staying power. These move slowest and matter most.',
    practices:'What you actually do, week to week. Practices are the most trainable part of this whole profile: pick one, repeat it, and the dimension above it moves.',
    satisfaction:'How it feels from the inside: your own read on the father you are and the home you lead. Satisfaction follows action, not the other way around.'
  };

  var BAND_LINE = {
    'Strong':'Strong ground. The work is to hold it and lead from it.',
    'Solid':'A solid base. Now you sharpen it.',
    'Developing':'On your way. The next moves compound.',
    'Building':'Building. Every small habit from here counts.',
    'A starting point':'A starting point is still a start, and starting is the part most men skip.'
  };

  /* ---------- load: signed in, pending, or sample ---------- */
  function load(){
    if(window.FC && FC.live && FC.uid && FC.uid()){
      FC.sb.from('keystone_results').select('*').eq('user_id', FC.uid())
        .order('completed_at',{ascending:false}).limit(1).maybeSingle()
        .then(function(r){
          if(r.data){ render(r.data, 'account'); }
          else { pendingOrSample(); }
        }).catch(pendingOrSample);
    } else {
      pendingOrSample();
    }
  }
  function pendingOrSample(){
    var raw = null;
    try { raw = localStorage.getItem('fc_pending_result'); } catch(e){}
    if(raw){
      try {
        var p = JSON.parse(raw);
        if(p && p.scored){
          return render({
            overall_pct: p.scored.overall, scale_scores: p.scored.scales,
            gap_scale: p.scored.gap, strength_scale: p.scored.strength,
            completed_at: new Date(p.at||Date.now()).toISOString()
          }, 'pending');
        }
      } catch(e){}
    }
    render(sampleResult(), 'sample');
  }

  /* A sample with all 26 scales so the Father report shows in full. Deterministic. */
  function sampleResult(){
    var sc = {}, seed = 7;
    KEYSTONE.sections.forEach(function(s){ s.scales.forEach(function(x){
      seed = (seed*31 + x.key.length*7) % 61;
      sc[x.key] = { label: x.label, pct: 28 + seed, section: s.key,
        band: KS.bandFor(28 + seed) };
    });});
    sc.involvement.pct = 81; sc.involvement.band = KS.bandFor(81);
    sc.consistency.pct = 34; sc.consistency.band = KS.bandFor(34);
    var vals = Object.keys(sc).map(function(k){return sc[k].pct;});
    var overall = Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length);
    return { overall_pct: overall, scale_scores: sc, gap_scale:'consistency',
      strength_scale:'involvement', completed_at: new Date(Date.now()-3*86400000).toISOString() };
  }

  /* ---------- branding: two logos and the highlight colors. That is it. ---------- */
  function applyBranding(then){
    var fallback = { accent:'', accent2:'', logo_primary:'', logo_secondary:'' };
    if(!(window.FC && FC.live)){ then(fallback); return; }
    FC.ready.then(function(){
      FC.sb.from('report_branding').select('*').eq('id',1).maybeSingle().then(function(r){
        then(r.data || fallback);
      }, function(){ then(fallback); });
    });
  }

  /* ---------- render ---------- */
  function render(result, state){
    applyBranding(function(brand){
      var sc = result.scale_scores || {};
      var keys = Object.keys(sc);
      var isFather = keys.length >= 20; /* the preparing track scores a subset */
      var title = isFather ? 'The Keystone Father Profile' : 'The Manhood Profile';
      var strength = sc[result.strength_scale], gap = sc[result.gap_scale];
      var band = KS.bandFor(result.overall_pct != null ? result.overall_pct : 0);
      var gapCopy = R[result.gap_scale] || {g:'This is the one to build first.', m:[]};
      var strCopy = R[result.strength_scale] || {s:'You showed up and did the honest work.'};

      if(brand.accent){ root.style.setProperty('--rpa', brand.accent); }
      if(brand.accent2){ root.style.setProperty('--rpb', brand.accent2); }

      var logos =
        '<div class="rp-logos">'+
          (brand.logo_primary ? '<img class="rp-logo" src="'+esc(brand.logo_primary)+'" alt="Program logo">'
            : '<span class="rp-brandword">Fathers.com</span>')+
          (brand.logo_secondary ? '<img class="rp-logo rp-logo-2" src="'+esc(brand.logo_secondary)+'" alt="Partner logo">' : '')+
        '</div>';

      var stateLine = '';
      if(state==='sample') stateLine = '<div class="notice brass rp-noprint" style="margin:0 0 22px">A sample report. <a class="link" href="profile.html">Take your Profile</a> and this becomes yours, free.</div>';
      if(state==='pending') stateLine = '<div class="notice brass rp-noprint" style="margin:0 0 22px">Not saved yet. Email yourself a secure link below and this report and your plan are kept.</div>';

      var actions =
        '<div class="rp-actions rp-noprint">'+
          '<button class="btn btn-secondary btn-sm" id="rpPrint">Download as PDF</button>'+
          (state!=='sample' ? '<a class="btn btn-secondary btn-sm" href="plan.html">Open my ninety-day plan</a>' : '')+
          (state==='account'
            ? '<span class="fine" style="align-self:center">Saved to your account.</span>'
            : (state==='pending'
              ? '<span class="rp-mailrow"><input class="input" type="email" id="rpEmail" placeholder="you@email.com" autocomplete="email"><button class="btn btn-yellow btn-sm" id="rpSend">Email me this report</button></span>'
              : ''))+
        '</div>'+
        '<p class="fine rp-noprint" id="rpMsg" style="margin:8px 0 0"></p>';

      var sectionsHtml = KEYSTONE.sections.map(function(secDef){
        var scalesIn = secDef.scales.filter(function(x){ return sc[x.key]; });
        if(!scalesIn.length) return '';
        var rows = scalesIn.map(function(x, idx){
          var v = sc[x.key], copy = R[x.key] || {};
          var isGap = x.key===result.gap_scale, isStr = x.key===result.strength_scale;
          var high = v.band && (v.band.label==='Strong' || v.band.label==='Solid');
          var read = high ? (copy.s||'') : (copy.g||'');
          var moves = '';
          if(isGap && copy.m && copy.m.length){
            moves = '<div class="rp-moves"><span class="rp-moves-h">First moves</span>'+
              copy.m.map(function(mv,i){ return '<div class="rp-move"><span class="rp-move-n">'+(i+1)+'</span>'+esc(mv)+'</div>'; }).join('')+'</div>';
          } else if(!high && copy.m && copy.m.length){
            moves = '<p class="rp-firstmove"><b>First move:</b> '+esc(copy.m[0])+'</p>';
          }
          return '<div class="rp-scale'+(isGap?' rp-gap':'')+'">'+
            '<div class="rp-scale-head"><span class="rp-scale-name">'+esc(v.label)+
              (isStr?' <em class="rp-tag rp-tag-str">strength</em>':'')+(isGap?' <em class="rp-tag rp-tag-gap">next move</em>':'')+'</span>'+
            '<span class="rp-scale-band">'+esc(v.band?v.band.label:'')+'</span></div>'+
            '<div class="rp-bar"><span class="rp-bar-fill" style="width:'+(v.pct||0)+'%"></span><span class="rp-bar-mark" style="left:50%"></span></div>'+
            (idx===0 ? '<div class="rp-bar-legend"><span>0</span><span>the typical father sits at the mark</span><span>100</span></div>' : '')+
            '<p class="rp-about">'+esc(copy.about||'')+'</p>'+
            (read ? '<p class="rp-read">'+esc(read)+'</p>' : '')+
            moves+
          '</div>';
        }).join('');
        return '<section class="rp-section">'+
          '<div class="rp-sec-head"><h2>'+esc(secDef.title)+'</h2></div>'+
          '<p class="rp-sec-intro">'+esc(SEC_INTRO[secDef.key]||'')+'</p>'+
          rows+
          '<div class="rp-resources"><span class="rp-res-h">Train this section</span>'+
            '<a class="link" href="class.html">The free course</a>'+
            '<a class="link" href="classes.html">All classes</a>'+
            '<a class="link" href="stories.html">Stories from fathers</a>'+
            '<a class="link" href="circles.html">Find a circle</a>'+
          '</div>'+
        '</section>';
      }).join('');

      root.innerHTML =
        '<div class="rp-doc">'+
          '<header class="rp-cover">'+
            logos+
            '<div class="eyebrow" style="margin:26px 0 8px">YOUR WRITTEN REPORT</div>'+
            '<h1 class="rp-title">'+esc(title)+'</h1>'+
            '<p class="rp-sub">Prepared from your answers &middot; completed '+esc(fmtDate(result.completed_at))+'</p>'+
          '</header>'+
          stateLine + actions +
          '<section class="rp-overall">'+
            '<div class="rp-o-block"><div class="eyebrow">YOUR STRONGEST GROUND</div>'+
              '<div class="rp-o-big">'+esc(strength?strength.label:'You showed up')+'</div>'+
              '<p class="rp-o-line">'+esc(strCopy.s||'')+'</p></div>'+
            '<div class="rp-o-block"><div class="eyebrow">OVERALL STANDING</div>'+
              '<div class="rp-o-big">'+esc(band.label)+'</div>'+
              '<p class="rp-o-line">'+esc(BAND_LINE[band.label]||'')+'</p></div>'+
            '<div class="rp-o-block"><div class="eyebrow">YOUR NEXT MOVE</div>'+
              '<div class="rp-o-big">'+esc(gap?gap.label:'')+'</div>'+
              '<p class="rp-o-line">'+esc(gapCopy.g||'')+'</p></div>'+
          '</section>'+
          '<section class="rp-howto">'+
            '<b>How to read this.</b> Each bar is your standing compared with 2,066 fathers in the national norm group; the center mark is the typical father. Standings are words, not grades: A starting point, Building, Developing, Solid, Strong. This is a self-report. It is a mirror, not a verdict, and every line in it can move.'+
          '</section>'+
          sectionsHtml+
          '<section class="rp-next90">'+
            '<div class="eyebrow" style="margin-bottom:8px">THE NEXT NINETY DAYS</div>'+
            '<h2 style="margin:0 0 8px">'+esc(gap?gap.label:'Your plan')+', one move at a time.</h2>'+
            '<p class="rp-o-line" style="margin-bottom:16px">Your plan concentrates here. Not because you are failing, but because growth here changes the most.</p>'+
            (gapCopy.m||[]).map(function(mv,i){ return '<div class="rp-move"><span class="rp-move-n">'+(i+1)+'</span>'+esc(mv)+'</div>'; }).join('')+
            '<p class="rp-planlink rp-noprint" style="margin-top:18px"><a class="btn btn-yellow" href="plan.html">Open my ninety-day plan</a></p>'+
            '<p class="rp-printonly fine" style="margin-top:14px">Your live plan: fathers-com-platform.vercel.app/plan.html</p>'+
          '</section>'+
          '<footer class="rp-foot">'+
            '<span>Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit, since 1990.</span>'+
            '<span>Your results are yours alone. We never share them.</span>'+
          '</footer>'+
        '</div>';

      var pb = document.getElementById('rpPrint');
      if(pb) pb.addEventListener('click', function(){ window.print(); });
      var sb2 = document.getElementById('rpSend'), se = document.getElementById('rpEmail'), sm = document.getElementById('rpMsg');
      function send(){
        var email = (se.value||'').trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ sm.textContent='Enter your email so we can send it.'; return; }
        sb2.disabled = true; sb2.textContent = 'Sending\u2026';
        if(window.FC && FC.signInMagic){
          FC.signInMagic(email, 'report.html').then(function(r){
            if(r && r.error){ sm.textContent = r.error.message || 'Something went wrong. Try again.'; sb2.disabled=false; sb2.textContent='Email me this report'; return; }
            sm.textContent = 'Sent to '+email+'. The link in that email opens this report, saved to your account. No password.';
            sb2.textContent = 'Sent';
          });
        }
      }
      if(sb2){ sb2.addEventListener('click', send); }
      if(se){ se.addEventListener('keydown', function(e){ if(e.key==='Enter') send(); }); }
    });
  }

  load();
})();
