/* ============================================================
   The Keystone Father Profile : onboarding engine (prototype)
   DEMO SCORING ONLY. Replace computeScores() with the validated
   Keystone algorithm before any testing that claims validity.
   Wire persistence to Supabase in supabase-client.js.
   ============================================================ */
(function(){
  const root=document.getElementById('keystone');
  if(!root) return;

  // Prefer a published instrument authored in Studio. Falls back to the demo below.
  if(window.FCI){
    FCI.loadPublished('keystone-father-profile').then(function(b){ if(!b) return FCI.loadPublished(); return b; })
      .then(function(bundle){
        if(bundle && bundle.items && bundle.items.length){ runLiveInstrument(bundle); }
        else { runDemo(); }
      }).catch(function(){ runDemo(); });
  } else { runDemo(); }

  function runLiveInstrument(bundle){
    var SCALE={likert5:['Never','Rarely','Sometimes','Often','Always'],likert7:['1','2','3','4','5','6','7'],binary:['No','Yes']};
    var answers={}, i=0, items=bundle.items;
    root.innerHTML='<div class="assess-top container" style="max-width:820px"><div class="lbl"><span>'+esc(bundle.instrument.title.toUpperCase())+'</span><span id="kstep"></span></div><div class="progress-track"><div class="progress-fill" id="kbar" style="width:2%"></div></div></div><div class="assess-body"><div class="assess-card"></div></div>';
    function esc(x){return (x==null?'':String(x)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function draw(){
      if(i>=items.length){ return finish(); }
      var it=items[i]; var opts=SCALE[it.kind]||SCALE.likert5;
      document.getElementById('kbar').style.width=Math.round((i/items.length)*100)+'%';
      document.getElementById('kstep').textContent=(i+1)+' / '+items.length;
      var card=root.querySelector('.assess-card');
      card.innerHTML='<h2>'+esc(it.prompt)+'</h2><div class="seg" style="margin:24px 0">'+opts.map(function(t,idx){return '<button data-v="'+idx+'" class="'+(answers[it.id]===idx?'selected':'')+'">'+esc(t)+'</button>';}).join('')+'</div><div class="assess-foot"><a href="#" class="link" data-back '+(i===0?'style=\'visibility:hidden\'':'')+'>Back</a><button class="btn btn-primary" data-go '+(answers[it.id]==null?'disabled':'')+'>Continue</button></div>';
      card.querySelectorAll('[data-v]').forEach(function(b){b.addEventListener('click',function(){answers[it.id]=parseInt(b.dataset.v,10);card.querySelectorAll('.selected').forEach(function(x){x.classList.remove('selected');});b.classList.add('selected');card.querySelector('[data-go]').disabled=false;});});
      card.querySelector('[data-go]').addEventListener('click',function(){i++;draw();});
      var bk=card.querySelector('[data-back]'); if(bk) bk.addEventListener('click',function(e){e.preventDefault();i=Math.max(0,i-1);draw();});
    }
    function finish(){
      var scored=FCI.score(bundle,answers);
      var card=root.querySelector('.assess-card');
      document.getElementById('kbar').style.width='100%';
      var doms=bundle.domains.map(function(d){var v=scored.domScores[d.key]||0;var gap=(d.key===scored.gap);return '<div class="domain '+(gap?'gap':'')+'"><div class="row1"><span>'+esc(d.label)+(gap?' <span class="tag" style="color:var(--ember-hi)">YOUR GAP</span>':'')+'</span><span class="score">'+v+'</span></div><div class="bar"><span style="width:0" data-w="'+v+'"></span></div></div>';}).join('');
      card.innerHTML='<div class="eyebrow">YOUR PRESENCE BASELINE</div><div class="bigscore" style="margin:14px 0 2px">'+scored.overall+'</div><div class="display d-36" style="margin-bottom:34px">'+esc(scored.band?scored.band.label:'')+'</div>'+doms+'<p class="fine" style="margin:18px 0 26px">Your results are yours. We never share them.</p><a class="btn btn-primary" href="plan.html">See my plan</a>';
      requestAnimationFrame(function(){setTimeout(function(){card.querySelectorAll('[data-w]').forEach(function(sp){sp.style.width=sp.dataset.w+'%';});},60);});
      FCI.saveResponse(bundle,answers,scored).then(function(){ if(window.toast) toast('Baseline saved to your account.'); }).catch(function(e){console.error(e);});
    }
    draw();
  }

  function runDemo(){
  const KEY='fc_keystone_v1';
  let state=JSON.parse(localStorage.getItem(KEY)||'{}');
  state.answers=state.answers||{};
  let idx=state.idx||0;

  const AGREE=['Never','Rarely','Sometimes','Often','Always'];

  const SCREENS=[
    {id:'welcome',section:'INTAKE',render:s=>`
      <div class="eyebrow" style="margin-bottom:16px">THE KEYSTONE FATHER PROFILE</div>
      <h2 class="display d-48" style="font-size:clamp(30px,4vw,44px)">Twelve minutes. Four scores. One plan.</h2>
      <p class="lead" style="margin:18px 0 30px">Answer honestly. There is no passing grade. There is a starting point.</p>
      <button class="btn btn-primary" data-go>Start</button>
      <p class="fine" style="margin-top:22px">About 40 questions. Built on the National Center for Fathering's validated instrument.</p>`},
    {id:'kids',section:'INTAKE',q:'Tell us about your kids.',helper:'Ages set your plan. Pick all that apply.',type:'chips-multi',
      opts:['Expecting','0-2','3-5','6-9','10-12','13-15','16-18','Grown']},
    {id:'situation',section:'INTAKE',q:'Which of these is true for you right now?',helper:'Pick all that apply.',type:'cards-multi',why:'This routes your plan and your class recommendations. It is never shared and never shown to anyone else.',skippable:true,
      opts:['Married','Divorced or separated','Single father','Stepfather','Long-distance dad','Deployed or recently home','Incarcerated or recently released','New father']},
    {id:'time',section:'INTAKE',q:'How much focused time do your kids get from you in a normal week?',type:'chips-single',
      opts:['Under 1 hour','1-3 hours','4-7 hours','8-15 hours','15 plus']},
    {id:'goal',section:'INTAKE',q:'Ninety days from now, what do you want to be true?',type:'cards-single',
      opts:['I show up consistently',"I know what's going on in their world","We're rebuilding after a hard season",'I lead with more patience',"I'm present, not just there"]},
    {id:'i1',section:'BASELINE',q:"I know the names of my kids' closest friends.",type:'agree'},
    {id:'i2',section:'BASELINE',q:'My kids can predict when they will see me next.',type:'agree'},
    {id:'i3',section:'BASELINE',q:'I notice mood changes in my kids before they say anything.',type:'agree'},
    {id:'mid',section:'BASELINE',render:s=>`
      <h2 class="display" style="font-size:28px;max-width:22ch">Halfway. Most men never even take a look. You are taking one.</h2>
      <p class="autosave">Continuing…</p>`,auto:2500},
    {id:'i4',section:'BASELINE',q:'My kids hear me say what I value, not just what I forbid.',type:'agree'},
    {id:'i5',section:'BASELINE',q:'When I blow it, I go back and repair it.',type:'agree'},
    {id:'i6',section:'BASELINE',q:'I have a father or mentor I can be honest with.',type:'agree'},
    {id:'faith',section:'BASELINE',q:'Want faith woven into your plan?',helper:'Optional. It changes which classes and actions we recommend. Nothing else.',type:'chips-single',skippable:true,
      why:'A faith lens swaps some recommended classes and weekly actions. It never changes your scores.',
      opts:['Yes, Christian','Yes, Jewish','Not for me','Ask me later']},
    {id:'loader',section:'RESULTS',render:s=>`
      <div class="mono ash" id="loadline" style="font-size:15px;letter-spacing:.06em">Scoring involvement…</div>
      <div class="progress-track" style="margin-top:22px"><div class="progress-fill" id="loadbar" style="width:4%"></div></div>`,loader:true},
    {id:'results',section:'RESULTS',results:true},
    {id:'plan',section:'RESULTS',plan:true},
    {id:'account',section:'RESULTS',render:s=>{
      if(window.FC&&FC.live){return `
      <h2 class="display" style="font-size:30px">Save your baseline and plan.</h2>
      <p class="helper">No password. We email you a sign-in link. Click it and your baseline and plan save to your account.</p>
      <div class="stack-16" style="margin:18px 0 6px">
        <input class="input" type="email" placeholder="Email address" id="acctEmail">
        <button class="btn btn-primary" style="width:100%" id="otpBtn">Email me a sign-in link</button>
      </div>
      <p class="fine" id="otpMsg">Free to save. Membership starts only if you choose it.</p>
      <p style="margin-top:18px"><a href="#" class="link ash" data-go style="font-size:13px">Skip for now</a></p>`;}
      return `
      <h2 class="display" style="font-size:30px">Save your baseline and plan.</h2>
      <div class="stack-16" style="margin:28px 0 6px">
        <input class="input" type="email" placeholder="Email address" id="acctEmail">
        <button class="btn btn-primary" style="width:100%" data-go>Continue with email</button>
      </div>
      <p class="fine">Demo mode. Add Supabase keys in assets/js/config.js and this screen sends a real sign-in link.</p>`;}},
    {id:'handoff',section:'RESULTS',handoff:true}
  ];

  const DOMAINS=[['Involvement','inv'],['Consistency','con'],['Awareness','awa'],['Nurturance','nur']];

  function computeScores(){
    // DEMO ONLY. i-items and time chip 0-4 -> 0-100.
    const a=state.answers, v=k=>typeof a[k]==='number'?a[k]:2;
    const pct=x=>Math.round((x/4)*100);
    const inv=pct((v('time')+v('i6'))/2);
    const con=pct(v('i2'));
    const awa=pct((v('i1')+v('i3'))/2);
    const nur=pct((v('i4')+v('i5'))/2);
    const overall=Math.round((inv+con+awa+nur)/4);
    const read=overall>=85?'Strong.':overall>=70?'Solid. Uneven.':overall>=50?'Workable. Gaps.':'A starting point.';
    return {inv,con,awa,nur,overall,read};
  }

  function save(){state.idx=idx;localStorage.setItem(KEY,JSON.stringify(state));}

  function bar(){
    const pct=Math.round((idx/(SCREENS.length-1))*100);
    document.getElementById('kbar').style.width=pct+'%';
    document.getElementById('ksec').textContent=SCREENS[idx].section;
    document.getElementById('kstep').textContent=(idx+1)+' / '+SCREENS.length;
  }

  function optionsHTML(sc){
    const cur=state.answers[sc.id];
    if(sc.type==='agree'){
      return `<div class="seg" role="radiogroup">`+AGREE.map((t,i)=>`<button data-val="${i}" class="${cur===i?'selected':''}">${t}</button>`).join('')+`</div>`;
    }
    const multi=sc.type.endsWith('multi');
    const card=sc.type.startsWith('cards');
    const sel=multi?(cur||[]):cur;
    const cls=card?'optcard':'chip';
    const wrap=card?'optgrid':'chiprow';
    return `<div class="${wrap}">`+sc.opts.map((t,i)=>{
      const on=multi?sel.includes(i):sel===i;
      return `<button class="${cls} ${on?'selected':''}" data-val="${i}">${t}</button>`;
    }).join('')+`</div>`;
  }

  function render(){
    const sc=SCREENS[idx];bar();save();
    const el=root.querySelector('.assess-card');
    if(sc.render){el.innerHTML=sc.render(state);wire(sc);
      if(sc.id==='account'){var ob=document.getElementById('otpBtn');if(ob){ob.addEventListener('click',function(){
        var em=document.getElementById('acctEmail').value.trim();
        if(!em){document.getElementById('otpMsg').textContent='Enter your email first.';return;}
        ob.disabled=true;ob.textContent='Sending…';
        FC.signIn(em,'plan.html').then(function(r){
          ob.textContent='Email me a sign-in link';ob.disabled=false;
          var m=document.getElementById('otpMsg');if(r.error){m.style.color='var(--error)';m.textContent='Could not send: '+r.error.message;}else{ob.textContent='Link sent \u2713';m.style.color='var(--pine-hi)';m.textContent='Sent. Check your email, click the link, and your baseline saves automatically.';}
        });
      });}}
      if(sc.auto)setTimeout(next,sc.auto);
      if(sc.loader)runLoader();return;}
    if(sc.results)return renderResults(el);
    if(sc.plan)return renderPlan(el);
    if(sc.handoff)return renderHandoff(el);
    const answered=()=>{const a=state.answers[sc.id];return sc.type&&sc.type.endsWith('multi')?(a&&a.length):typeof a==='number';};
    el.innerHTML=`
      <h2>${sc.q}</h2>
      ${sc.helper?`<p class="helper">${sc.helper}</p>`:''}
      ${optionsHTML(sc)}
      ${sc.why?`<p style="margin-top:6px"><a href="#" class="link" style="font-size:13px" data-why>Why we ask</a></p>
        <div class="notice" data-whybox style="display:none;margin-top:12px">${sc.why}</div>`:''}
      <div class="assess-foot">
        <a href="#" class="link" data-back ${idx===0?'style="visibility:hidden"':''}>Back</a>
        <div class="row">
          ${sc.skippable?'<a href="#" class="link ash" data-skip>Skip</a>':''}
          <button class="btn btn-primary" data-go ${answered()?'':'disabled'}>Continue</button>
        </div>
      </div>
      ${idx>=5?'<p class="autosave">Your progress saves automatically.</p>':''}`;
    wire(sc,answered);
  }

  function wire(sc,answered){
    root.querySelectorAll('[data-val]').forEach(b=>b.addEventListener('click',()=>{
      const v=parseInt(b.dataset.val,10);
      if(sc.type&&sc.type.endsWith('multi')){
        const arr=state.answers[sc.id]||[];
        state.answers[sc.id]=arr.includes(v)?arr.filter(x=>x!==v):arr.concat(v);
        b.classList.toggle('selected');
      } else {
        state.answers[sc.id]=v;
        b.parentElement.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));
        b.classList.add('selected');
      }
      const go=root.querySelector('[data-go]');if(go&&answered)go.disabled=!answered();
      save();
    }));
    const go=root.querySelector('[data-go]');if(go)go.addEventListener('click',next);
    const back=root.querySelector('[data-back]');if(back)back.addEventListener('click',e=>{e.preventDefault();idx=Math.max(0,idx-1);render();});
    const skip=root.querySelector('[data-skip]');if(skip)skip.addEventListener('click',e=>{e.preventDefault();next();});
    const why=root.querySelector('[data-why]');if(why)why.addEventListener('click',e=>{e.preventDefault();
      const box=root.querySelector('[data-whybox]');box.style.display=box.style.display==='none'?'':'none';});
  }

  function next(){idx=Math.min(SCREENS.length-1,idx+1);render();}

  function runLoader(){
    const lines=['Scoring involvement…','Scoring consistency…','Building your plan…'];
    let i=0;const line=document.getElementById('loadline');const b=document.getElementById('loadbar');
    const iv=setInterval(()=>{i++;
      if(i<lines.length){line.textContent=lines[i];b.style.width=(4+i*32)+'%';}
      else{clearInterval(iv);b.style.width='100%';setTimeout(next,450);}
    },1300);
  }

  function renderResults(el){
    const s=computeScores();state.scores=s;save();
    const rows=DOMAINS.map(([label,k])=>{
      const val=s[k.slice(0,3)]??s[k];return {label,val:s[{inv:'inv',con:'con',awa:'awa',nur:'nur'}[k]]||s[k]};
    });
    const vals={Involvement:s.inv,Consistency:s.con,Awareness:s.awa,Nurturance:s.nur};
    const gap=Object.entries(vals).sort((a,b)=>a[1]-b[1])[0][0];
    state.gap=gap;save();
    el.innerHTML=`
      <div class="eyebrow">YOUR PRESENCE BASELINE</div>
      <div class="bigscore" style="margin:14px 0 2px">${s.overall}</div>
      <div class="display d-36" style="margin-bottom:34px">${s.read}</div>
      ${Object.entries(vals).map(([label,v])=>`
        <div class="domain ${label===gap?'gap':''}">
          <div class="row1"><span>${label}${label===gap?' <span class="tag" style="color:var(--ember-hi)">YOUR GAP</span>':''}</span><span class="score">${v}</span></div>
          <div class="bar"><span style="width:0" data-w="${v}"></span></div>
        </div>`).join('')}
      <p class="small" style="margin:8px 0 26px">${gap} is your gap. Your plan starts there.</p>
      <p class="fine" style="margin-bottom:26px">Your results are yours. We never share them.</p>
      <button class="btn btn-primary" data-go>See my ninety-day plan</button>`;
    wire(SCREENS[idx]);
    requestAnimationFrame(()=>setTimeout(()=>{
      el.querySelectorAll('[data-w]').forEach(sp=>sp.style.width=sp.dataset.w+'%');},60));
  }

  function renderPlan(el){
    const gap=state.gap||'Consistency';
    const PH=[['Weeks 1-4','Show up on schedule','IMG-P2-PLAN-01',['Set one standing time per kid and keep it twice.','Tell your kids when they will see you next. Every time.']],
      ['Weeks 5-8','Enter their world','IMG-P2-PLAN-02',['Learn the names of their three closest friends.','Ask one question about their world daily. No fixing.']],
      ['Weeks 9-12','Set the standard','IMG-P2-PLAN-03',['Say one thing you stand for, out loud, at the table.','When you blow it, repair it inside 24 hours.']]];
    el.innerHTML=`
      <h2 class="display" style="font-size:30px">Your Ninety-Day Presence Plan.</h2>
      <p class="helper">One lesson and two actions a week. Built from your baseline. ${gap} first.</p>
      <div class="stack-24" style="margin:26px 0 30px">${PH.map(([w,t,slot,acts])=>`
        <div class="card"><div class="row" style="align-items:flex-start;gap:20px">
          <div class="slot r-2x3" data-slot="${slot}" style="flex:0 0 88px"></div>
          <div style="flex:1">
            <div class="tag">${w}</div>
            <h3 style="margin:6px 0 12px">${t}</h3>
            ${acts.map(a=>`<div class="check"><span class="checkmark">✓</span><span>${a}</span></div>`).join('<div style="height:8px"></div>')}
          </div></div></div>`).join('')}
      </div>
      <div class="row"><button class="btn btn-primary" data-go>Save my plan</button>
      <a class="link" href="index.html#membership">See what's included</a></div>`;
    wire(SCREENS[idx]);
  }

  function renderHandoff(el){
    el.innerHTML=`
      <div class="card" style="padding:32px">
        <div class="grid-2" style="gap:32px;align-items:start">
          <div>
            <div class="eyebrow" style="margin-bottom:10px">YOUR PLAN IS SAVED</div>
            <h3 class="display d-28">Baseline ${state.scores?state.scores.overall:'71'}. Twelve weeks. ${state.gap||'Consistency'} first.</h3>
          </div>
          <div>
            <p style="font-size:15px;margin-bottom:14px">$120 a year. That's $10 a month, billed annually. Every class, every workbook, your plan, The Daily. 30-day money-back guarantee.</p>
            <a class="btn btn-primary" href="checkout.html" style="width:100%">Start my membership</a>
            <p style="margin-top:14px"><a class="link ash" href="plan.html">Not yet. Take me to my baseline.</a></p>
          </div>
        </div>
      </div>`;
  }

  // shell
  root.innerHTML=`
    <div class="assess-top container" style="max-width:820px">
      <div class="lbl"><span id="ksec">INTAKE</span><span id="kstep"></span></div>
      <div class="progress-track"><div class="progress-fill" id="kbar" style="width:2%"></div></div>
    </div>
    <div class="assess-body"><div class="assess-card"></div></div>`;
  if(idx>0&&idx<SCREENS.length-1){
    toast('Welcome back. You are on step '+(idx+1)+'.');
  }
  render();
  } // end runDemo
})();
