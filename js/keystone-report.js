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
  if(!window.KEYSTONE || !window.KS) return;
  var ACTIVE = window.KEYSTONE;  // instrument the current render is drawing from

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
    var fallback = { accent:'', accent2:'', logo_primary:'', logo_secondary:'', photo_dimensions:'', photo_practices:'', photo_satisfaction:'' };
    var done=false, go=function(v){ if(!done){ done=true; then(v); } };
    if(!(window.FC && FC.live && FC.ready)){ go(fallback); return; }
    setTimeout(function(){ go(fallback); }, 2500);
    FC.ready.then(function(){
      if(!FC.sb){ return go(fallback); }
      FC.sb.from('report_branding').select('*').eq('id',1).maybeSingle().then(function(r){
        go(r && r.data ? r.data : fallback);
      }, function(){ go(fallback); });
    }, function(){ go(fallback); });
  }

  /* ---------- render ---------- */
  /* ---------- editorial config ---------- */
  var SEC = {
    dimensions:  {cls:'rp-sec-dimensions', theme:'Presence is the whole game.',
      pracA:'The slowest to move, and the ground everything else stands on. Your marked next move lives here. Start with its first move this week.'},
    practices:   {cls:'rp-sec-practices', theme:'Do one thing, and do it again.',
      pracA:'The most trainable part of your fathering. Pick one practice below, do it every day this week, and the dimension it feeds gets stronger. This is the fastest place to win.',
      pracDo:'Choose one practice and repeat it daily. Repetition is the whole method.'},
    satisfaction:{cls:'rp-sec-satisfaction', theme:'Satisfaction follows action.',
      pracA:'A readout, not a task. This rises on its own as you do the moves in the first two sections. Come back in ninety days and watch it climb.',
      pracDo:'Do the moves above. Let this number take care of itself.'}
  };
  var BAND_TIER = {'Strong':4,'Solid':3,'Developing':2,'Building':1,'A starting point':0};

  /* Optional full-bleed background photo for the cover and the closing panel.
     scrim defaults on (a dark gradient keeps the display type readable); pass
     false to use the raw image with no overlay. Empty returns no inline style, so
     the panel keeps its solid pine background. */
  function bgPhoto(url, scrim){
    if(!url) return '';
    var clean = esc(String(url).replace(/["\\]/g,''));
    var img = 'url(&quot;'+clean+'&quot;)';
    var layers = (scrim===false) ? img : 'linear-gradient(180deg,rgba(11,24,18,.74),rgba(11,24,18,.92)),'+img;
    return ' style="background-image:'+layers+';background-size:cover;background-position:center"';
  }

  /* Scale each section photo caption so it sits on one line and spans the width of
     its band instead of wrapping in a narrow left column. Capped so it stays a
     caption, not a headline. Runs after render, after fonts load, and on resize. */
  function fitOne(el){
    el.style.whiteSpace='nowrap';
    el.style.fontSize='';
    var probe=200;
    el.style.fontSize=probe+'px';
    var avail=el.clientWidth, textW=el.scrollWidth;
    if(!avail||!textW){ el.style.whiteSpace=''; el.style.fontSize=''; return; }
    var size=probe*avail/textW;
    if(size>46) size=46;
    if(size<18){ size=18; el.style.whiteSpace='normal'; }
    el.style.fontSize=size.toFixed(1)+'px';
    el.style.lineHeight='1.1';
  }
  function fitCaptions(scope){
    var root=scope||document;
    var t=root.querySelectorAll('.rp-photo-theme');
    for(var i=0;i<t.length;i++) fitOne(t[i]);
  }
  var fitBound=false, fitTimer=null;
  function bindFitHooks(){
    if(fitBound) return; fitBound=true;
    window.addEventListener('resize', function(){
      if(fitTimer) clearTimeout(fitTimer);
      fitTimer=setTimeout(function(){ fitCaptions(document); }, 150);
    });
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ fitCaptions(document); }); }
  }

  function stripSvg(result){
    var sc=result.scale_scores||{}, W=820,H=250,x0=168,x1=792;
    function mx(p){return x0+(p/100)*(x1-x0);}
    var laneY={dimensions:64,practices:132,satisfaction:200};
    var out=['<svg class="rp-strip" viewBox="0 0 '+W+' '+H+'" fill="none" role="img" aria-label="Your fathering profile against the typical father">'];
    [0,25,50,75,100].forEach(function(t){var x=mx(t);
      out.push('<line x1="'+x.toFixed(1)+'" y1="40" x2="'+x.toFixed(1)+'" y2="228" class="rp-st-grid"/>');
      out.push('<text x="'+x.toFixed(1)+'" y="244" class="rp-st-axis" text-anchor="middle">'+t+'</text>');});
    var xm=mx(50);
    out.push('<line x1="'+xm.toFixed(1)+'" y1="34" x2="'+xm.toFixed(1)+'" y2="228" class="rp-st-typical"/>');
    out.push('<text x="'+xm.toFixed(1)+'" y="26" class="rp-st-typlabel" text-anchor="middle">the typical father</text>');
    ACTIVE.sections.forEach(function(sec){
      var cy=laneY[sec.key]; if(cy==null) return;
      out.push('<text x="150" y="'+(cy-2)+'" class="rp-st-lane" text-anchor="end">'+esc(sec.title.replace('Fathering ','').toUpperCase())+'</text>');
      out.push('<text x="150" y="'+(cy+13)+'" class="rp-st-lanen" text-anchor="end">'+sec.scales.length+' parts</text>');
      sec.scales.forEach(function(x,i){ var v=sc[x.key]; if(!v) return;
        var px=mx(v.pct||0), y=cy+((i*37)%5-2)*6.5;
        if(x.key===result.strength_scale){
          out.push('<circle cx="'+px.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="7.5" class="rp-st-dot rp-st-str"/>');
          out.push('<text x="'+px.toFixed(1)+'" y="'+(y-13).toFixed(1)+'" class="rp-st-tag rp-st-tag-str" text-anchor="middle">strength</text>');
        } else if(x.key===result.gap_scale){
          out.push('<circle cx="'+px.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="6.5" class="rp-st-dot rp-st-gap"/>');
          out.push('<text x="'+px.toFixed(1)+'" y="'+(y+20).toFixed(1)+'" class="rp-st-tag rp-st-tag-gap" text-anchor="middle">next move</text>');
        } else {
          out.push('<circle cx="'+px.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5" class="rp-st-dot"/>');
        }
      });
    });
    out.push('</svg>'); return out.join('');
  }

  function scaleRow(x, first, result){
    var sc=result.scale_scores||{}, v=sc[x.key], c=R[x.key]||{};
    var band=v.band?v.band.label:'', isStr=x.key===result.strength_scale, isGap=x.key===result.gap_scale;
    var high=(band==='Strong'||band==='Solid'), read=high?(c.s||''):(c.g||'');
    var fill=isStr?'rp-bar-str':(isGap?'rp-bar-gap':'rp-bar-fill');
    var tag=isStr?' <em class="rp-tag rp-tag-str">strength</em>':(isGap?' <em class="rp-tag rp-tag-gap">next move</em>':'');
    var legend=first?'<div class="rp-bar-legend"><span>0</span><span>the typical father sits at the mark</span><span>100</span></div>':'';
    var ms=c.m||[], moves='';
    if(isGap && ms.length){
      moves='<div class="rp-moves"><span class="rp-moves-h">First moves</span>'+
        ms.map(function(m,i){return '<div class="rp-move"><span class="rp-move-n">'+(i+1)+'</span>'+esc(m)+'</div>';}).join('')+'</div>';
    } else if(!high && ms.length){
      moves='<p class="rp-firstmove"><b>First move:</b> '+esc(ms[0])+'</p>';
    }
    var tier=BAND_TIER[band]||0;
    return '<div class="rp-scale'+(isStr?' rp-scale-str':'')+(isGap?' rp-scale-gap':'')+'">'+
      '<div class="rp-scale-head"><span class="rp-scale-name">'+esc(v.label)+tag+'</span>'+
        '<span class="rp-scale-band rp-tier-'+tier+'">'+esc(band)+'</span></div>'+
      '<div class="rp-bar"><span class="'+fill+'" style="width:'+(v.pct||0)+'%"></span><span class="rp-bar-mark"></span></div>'+
      legend+
      (read?'<p class="rp-read">'+esc(read)+'</p>':'')+
      '<p class="rp-about">'+esc(c.about||'')+'</p>'+
      moves+'</div>';
  }

  function chapterHtml(sec, idx, result, brand){
    var meta=SEC[sec.key]||{cls:'',theme:'',pracA:''};
    var scalesIn=sec.scales.filter(function(x){return (result.scale_scores||{})[x.key];});
    if(!scalesIn.length) return '';
    var rows=scalesIn.map(function(x,i){return scaleRow(x,i===0,result);}).join('');
    // practical panel: dimensions references the gap's first move; others use their own line
    var doLine = meta.pracDo || ((R[result.gap_scale]&&R[result.gap_scale].m&&R[result.gap_scale].m[0])||'Pick one and start.');
    var practical='<aside class="rp-practical '+meta.cls+'">'+
        '<div class="rp-practical-h">Start here</div>'+
        '<p class="rp-practical-body">'+esc(meta.pracA)+'</p>'+
        '<div class="rp-practical-do"><span class="rp-do-k">Do this week</span><span>'+esc(doLine)+'</span></div>'+
        '<a class="rp-practical-link rp-noprint" href="class.html">Train this section &rarr;</a>'+
      '</aside>';
    var photo=brand['photo_'+sec.key];
    var pStyle=photo ? ' style="background-image:linear-gradient(180deg,rgba(11,24,18,.5),rgba(11,24,18,.85)),url(&quot;'+esc(String(photo).replace(/["\\\\]/g,''))+'&quot;);background-size:cover;background-position:center"' : '';
    return '<section id="rp-sec-'+sec.key+'" class="rp-chapter '+meta.cls+'">'+
      '<div class="rp-opener '+meta.cls+'">'+
        '<div class="rp-opener-copy"><div class="rp-opener-num">'+('0'+(idx+1)).slice(-2)+'</div>'+
          '<h2 class="rp-opener-title">'+esc(sec.title)+'</h2>'+
          '<p class="rp-opener-intro">'+esc(SEC_INTRO[sec.key]||'')+'</p></div>'+
        '<figure class="rp-photo '+meta.cls+'"'+pStyle+'>'+
          '<figcaption class="rp-photo-theme">'+esc(meta.theme)+'</figcaption>'+
          '<span class="rp-photo-slot rp-noprint">Photo slot &middot; set in Studio</span></figure>'+
      '</div>'+
      '<div class="rp-inner">'+practical+rows+
        '<div class="rp-resources rp-noprint"><span class="rp-res-h">Train this section</span>'+
          '<a class="rp-reslink" href="class.html">The free course</a>'+
          '<a class="rp-reslink" href="classes.html">All classes</a>'+
          '<a class="rp-reslink" href="stories.html">Stories from fathers</a>'+
          '<a class="rp-reslink" href="circles.html">Find a circle</a></div>'+
      '</div></section>';
  }

  /* ---------- render ---------- */
  function render(result, state, rootEl){
    rootEl = rootEl || document.getElementById('rpRoot');
    if(!rootEl) return;
    var A = (window.FCReg && FCReg.detect) ? FCReg.detect(result) : null;
    applyBranding(function(brand){
      brand = brand || {};
      ACTIVE = (A && FCReg.data(A)) || window.KEYSTONE;
      try { KS.init(ACTIVE); } catch(e){}
      var sc = result.scale_scores || {};
      var keys = Object.keys(sc);
      var title = A ? A.reportTitle : 'The Keystone Father Profile';
      var thesis = A ? A.thesis : 'A mirror of how you father, and the one move that changes the most.';
      var strength = sc[result.strength_scale], gap = sc[result.gap_scale];
      var band = KS.bandFor(result.overall_pct != null ? result.overall_pct : 0);
      var gapCopy = R[result.gap_scale] || {g:'This is the one to build first.', m:[]};
      var strCopy = R[result.strength_scale] || {s:'You showed up and did the honest work.'};

      if(brand.accent){ rootEl.style.setProperty('--rpa', brand.accent); }
      if(brand.accent2){ rootEl.style.setProperty('--rpb', brand.accent2); }

      var cobrand = '<div class="rp-cobrand">'+
        (brand.logo_primary ? '<img class="rp-logo" src="'+esc(brand.logo_primary)+'" alt="Program logo">' : '<span class="rp-cb-word">Fathers.com</span>')+
        (brand.logo_secondary ? '<span class="rp-cb-div"></span><span class="rp-cb-part"><span class="rp-cb-in">In partnership with</span><img class="rp-logo rp-logo-2" src="'+esc(brand.logo_secondary)+'" alt="Partner logo"></span>' : '')+
      '</div>';

      var contents = '<nav class="rp-contents rp-noprint" aria-label="What is inside">'+
        '<span class="rp-contents-h">What&rsquo;s inside</span>'+
        '<a href="#rp-glance">At a glance</a><a href="#rp-sec-dimensions">Dimensions</a>'+
        '<a href="#rp-sec-practices">Practices</a><a href="#rp-sec-satisfaction">Satisfaction</a>'+
        '<a href="#rp-next90">Your next 90 days</a></nav>';

      var stateLine='';
      if(state==='sample') stateLine='<div class="rp-sample-note rp-noprint">A sample report. <a href="profile.html">Take your Profile</a> and this becomes yours, free.</div>';
      if(state==='pending') stateLine='<div class="rp-sample-note rp-noprint">Not saved yet. Email yourself a secure link below and this report and your plan are kept.</div>';

      var actions='<div class="rp-actions rp-noprint">';
      if(state==='sample') actions+='<a class="rp-btn rp-btn-yellow" href="profile.html">Take the Profile</a>';
      actions+='<button class="rp-btn rp-btn-ghost" id="rpPrint">Download as PDF</button>';
      if(state!=='sample') actions+='<a class="rp-btn rp-btn-ghost" href="plan.html">Open my ninety-day plan</a>';
      if(state==='pending') actions+='<span class="rp-mailrow"><input class="rp-mail-input" type="email" id="rpEmail" placeholder="you@email.com" autocomplete="email"><button class="rp-btn rp-btn-yellow" id="rpSend">Email me this report</button></span>';
      actions+='</div>';
      actions+= (state==='account')
        ? '<p class="rp-brandnote rp-noprint">Saved to your account.</p>'
        : '<p class="rp-brandnote rp-noprint" id="rpMsg"></p>';

      var glance='<section id="rp-glance" class="rp-glance">'+
        '<article class="rp-gcard rp-gcard-str"><div class="rp-geyebrow">Your strongest ground</div>'+
          '<div class="rp-gbig">'+esc(strength?strength.label:'You showed up')+'</div><p class="rp-gline">'+esc(strCopy.s||'')+'</p></article>'+
        '<article class="rp-gcard rp-gcard-stand"><div class="rp-geyebrow">Your standing</div>'+
          '<div class="rp-gbig">'+esc(band.label)+'</div><p class="rp-gline">'+esc(BAND_LINE[band.label]||'')+'</p></article>'+
        '<article class="rp-gcard rp-gcard-gap"><div class="rp-geyebrow">Your next move</div>'+
          '<div class="rp-gbig">'+esc(gap?gap.label:'')+'</div><p class="rp-gline">'+esc(gapCopy.g||'')+'</p></article></section>';

      // An instrument without norms must not borrow another instrument's. When
      // norms_n is 0 the old falsy check fell through to '2,066', printing a
      // national norm group on a profile that has never been normed.
      var normed  = !!(ACTIVE && ACTIVE.norms_n > 0);
      var normN   = normed ? ACTIVE.norms_n.toLocaleString() : null;
      var groupN  = (ACTIVE && ACTIVE.norm_group_noun) || 'fathers';
      var subjN   = (ACTIVE && ACTIVE.subject_noun) || 'your fathering';
      var itemN   = 0;
      if(ACTIVE && ACTIVE.sections){ ACTIVE.sections.forEach(function(s){ s.scales.forEach(function(x){ itemN += (x.items||[]).length; }); }); }
      var firstStat = normed
        ? '<div class="rp-stat"><div class="rp-stat-n">'+normN+'</div><div class="rp-stat-l">'+esc(groupN)+' in your norm group</div></div>'
        : '<div class="rp-stat"><div class="rp-stat-n">'+itemN+'</div><div class="rp-stat-l">questions you answered</div></div>';
      var stats='<section class="rp-stats">'+
        firstStat+
        '<div class="rp-stat"><div class="rp-stat-n">'+keys.length+'</div><div class="rp-stat-l">parts of '+esc(subjN)+', measured</div></div>'+
        '<div class="rp-stat"><div class="rp-stat-n">90</div><div class="rp-stat-l">days to your next move</div></div></section>';

      var shape='<section class="rp-shape"><div class="rp-eyebrow">Your shape</div>'+
        '<p class="rp-shape-lead">Each mark is one part of '+esc(subjN)+', placed against '+(normed?'where the typical '+esc(groupN.replace(/s$/,''))+' stands':'the middle of the scale')+'. A mirror, not a ranking. The strongest ground is lit; the next move is ringed.</p>'+
        stripSvg(result)+'</section>';

      var howto = normed
        ? '<section class="rp-howto"><b>How to read this.</b> Each bar shows where you stand next to '+normN+' '+esc(groupN)+' in the national norm group; the center mark is the typical '+esc(groupN.replace(/s$/,''))+'. Standings are words, not grades: A starting point, Building, Developing, Solid, Strong. This is a self-report. It is a mirror, not a verdict, and every line in it can move.</section>'
        : '<section class="rp-howto"><b>How to read this.</b> Each bar shows where you placed yourself on that part of '+esc(subjN)+', not how you compare to other '+esc(groupN)+'. This profile does not yet have a norm group, so nothing here ranks you against anyone. Standings are words, not grades: A starting point, Building, Developing, Solid, Strong. This is a self-report. It is a mirror, not a verdict, and every line in it can move.</section>';

      var chapters = ACTIVE.sections.map(function(sec,idx){ return chapterHtml(sec,idx,result,brand); }).join('');

      var next90='<section id="rp-next90" class="rp-next90">'+
        '<div class="rp-n90-eyebrow">The next ninety days</div>'+
        '<h2 class="rp-n90-title">'+esc(gap?gap.label:'Your plan')+', one move at a time.</h2>'+
        '<p class="rp-n90-line">Your plan concentrates here. Not because you are failing, but because growth here changes the most.</p>'+
        '<div class="rp-moves rp-n90-moves">'+((gapCopy.m||[]).map(function(m,i){return '<div class="rp-move"><span class="rp-move-n">'+(i+1)+'</span>'+esc(m)+'</div>';}).join(''))+'</div>'+
        '<p class="rp-noprint" style="margin:24px 0 0"><a class="rp-btn rp-btn-yellow" href="'+(state==='sample'?'profile.html':'plan.html')+'">'+(state==='sample'?'Start your ninety-day plan':'Open my ninety-day plan')+'</a></p>'+
        '<p class="rp-printonly rp-plan-url">Your live plan: fathers-com-platform.vercel.app/plan.html</p></section>';

      var closing='<section class="rp-closing"'+bgPhoto(brand.photo_footer)+'>'+
        '<p class="rp-closing-line">You were never the problem to solve. You are the keystone. Now you build.</p></section>'+
        '<footer class="rp-colophon"><div class="rp-colo-brand"><span class="rp-colo-word">Fathers.com</span>'+
          (brand.logo_secondary?'<span class="rp-colo-div"></span><img class="rp-logo rp-colo-logo" src="'+esc(brand.logo_secondary)+'" alt="Partner logo">':'')+'</div>'+
        '<div class="rp-colo-lines">Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit, since 1990.<br>Your results are yours alone. We never share them.</div></footer>';

      rootEl.innerHTML = '<div class="rp-doc">'+
        '<header class="rp-cover"'+bgPhoto(brand.photo_cover, false)+'>'+cobrand+
          '<div class="rp-cover-main"><div>'+
            '<div class="rp-eyebrow rp-cover-eyebrow">Your written report</div>'+
            '<h1 class="rp-cover-title">'+esc(title)+'</h1>'+
            '<p class="rp-cover-sub">Prepared from your answers &middot; completed '+esc(fmtDate(result.completed_at))+'</p>'+
            '<p class="rp-cover-thesis">'+esc(thesis)+'</p>'+
          '</div></div></header>'+
        contents+
        '<div class="rp-inner">'+stateLine+actions+glance+stats+shape+howto+'</div>'+
        chapters+next90+closing+
      '</div>';

      fitCaptions(rootEl); bindFitHooks();

      var pb=document.getElementById('rpPrint');
      if(pb) pb.addEventListener('click', function(){ window.print(); });
      var sb2=document.getElementById('rpSend'), se=document.getElementById('rpEmail'), sm=document.getElementById('rpMsg');
      function send(){
        var email=(se.value||'').trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ if(sm) sm.textContent='Enter your email so we can send it.'; return; }
        sb2.disabled=true; sb2.textContent='Sending\u2026';
        if(window.FC && FC.signInMagic){
          FC.signInMagic(email, 'report.html').then(function(r){
            if(r && r.error){ if(sm) sm.textContent=r.error.message||'Something went wrong. Try again.'; sb2.disabled=false; sb2.textContent='Email me this report'; return; }
            if(sm) sm.textContent='Sent to '+email+'. The link in that email opens this report, saved to your account. No password.';
            sb2.textContent='Sent';
          });
        }
      }
      if(sb2){ sb2.addEventListener('click', send); }
      if(se){ se.addEventListener('keydown', function(ev){ if(ev.key==='Enter') send(); }); }
    });
  }


  /* Run the render only after the Supabase client has initialized. config.js and
     supabase-client.js are loaded after this file in report.html, so window.FC
     does not exist at parse time. Rendering synchronously here would evaluate the
     branding gate before FC is defined and lock the report to the unbranded
     fallback with no re-render. Deferring to DOMContentLoaded, then to FC.ready,
     guarantees the saved branding is present on the first and only render. If the
     client never appears (demo, no keys) or stalls, the report still renders. */
  function boot(){
    var started = false, run = function(){ if(!started){ started = true; load(); } };
    if(window.FC && FC.ready && typeof FC.ready.then === 'function'){
      FC.ready.then(run, run);
      setTimeout(run, 2500);
      return;
    }
    var tries = 0, iv = setInterval(function(){
      if(window.FC && FC.ready && typeof FC.ready.then === 'function'){
        clearInterval(iv); FC.ready.then(run, run); setTimeout(run, 2500);
      } else if(++tries >= 40){ clearInterval(iv); run(); }
    }, 50);
  }
  /* Public, page-agnostic API. Any surface (the participant dashboard, an admin
     view-as, a standalone page) can render a report into its own container:
       FCReport.render(containerEl, { result: <keystone_results row>, state: 'live' })
     The assessment is resolved from the result via the registry, so the same call
     renders a father profile or a manhood profile correctly. */
  window.FCReport = {
    render: function(el, opts){ opts = opts || {}; return render(opts.result, opts.state || 'live', el); },
    sampleResult: sampleResult
  };

  /* report.html carries #rpRoot and self-renders the signed-in participant's own
     report. Other pages leave #rpRoot out and drive FCReport.render themselves. */
  if(document.getElementById('rpRoot')){
    if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', boot); }
    else { boot(); }
  }
})();
