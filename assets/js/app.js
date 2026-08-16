/* FORGE shared behaviors + live wiring : Fathers.com */
(function(){
  /* Returning Home is a closed path: the door, then the films.
     Mark it on the door, the desk, or ?path=rh. Clear it if he types a
     public-root URL so the generic site stays intact. */
  var RH_PUBLIC_ROOTS = {
    'index.html':1,'certificates.html':1,'organizations.html':1,'sponsor.html':1,
    'research.html':1,'stories.html':1,'story.html':1,'about.html':1,
    'facilitators.html':1,'groups.html':1,'circles.html':1,'employers.html':1,
    'changelog.html':1,'efficacy-report.html':1
  };
  var RH_AWAY = {
    'index.html':'home','certificates.html':'desk','organizations.html':'desk',
    'sponsor.html':'home','research.html':'home','stories.html':'home',
    'story.html':'home','plan.html':'base','dashboard.html':'base',
    'about.html':'home','facilitators.html':'home','groups.html':'desk',
    'circles.html':'desk','employers.html':'home','changelog.html':'home',
    'enroll.html':'desk','checkout.html':'desk','find-a-program.html':'home',
    'gatherings.html':'home','efficacy-report.html':'home'
  };
  function pageName(){
    return (location.pathname.split('/').pop()||'').toLowerCase();
  }
  function markPath(){
    try {
      var here=pageName();
      var qs=new URLSearchParams(location.search);
      if(here==='returning-home.html' || here==='rh-desk.html' || here==='rh-home.html' || qs.get('path')==='rh'){
        localStorage.setItem('fc_path','returning-home');
      } else if(RH_PUBLIC_ROOTS[here]){
        localStorage.removeItem('fc_path');
      }
    } catch(e){}
  }
  markPath();
  function pathIsRH(){
    try { return localStorage.getItem('fc_path')==='returning-home'; } catch(e){ return false; }
  }
  function isRhSurface(){
    var here=pageName();
    var qs;
    try { qs=new URLSearchParams(location.search); } catch(e){ qs=new URLSearchParams(); }
    if(here==='returning-home.html' || here==='rh-desk.html' || here==='rh-home.html' || qs.get('path')==='rh') return true;
    if(!pathIsRH()) return false;
    if(here==='profile.html'||here==='report.html'||here==='login.html'||here==='course.html'||
       here==='privacy.html'||here==='terms.html'||here==='account.html'||here==='recover.html'||
       here==='security.html') return true;
    if(here.indexOf('course-')===0) return true;
    return false;
  }
  function rhHome(){ return 'returning-home.html'; }
  function rhDesk(){ return 'rh-desk.html'; }
  function rhHomebase(){ return 'rh-home.html'; }
  function rhMapHref(href){
    if(!href) return null;
    var raw=String(href).trim();
    if(!raw || raw.charAt(0)==='#' || raw.indexOf('mailto:')===0 || raw.indexOf('javascript:')===0) return null;
    if(/login\.html/.test(raw) && /next=org\.html/.test(raw)) return null;
    var file=raw.split('#')[0].split('?')[0].replace(/^\.\//,'').split('/').pop();
    var dest=RH_AWAY[file];
    if(!dest) return null;
    if(dest==='desk') return rhDesk();
    if(dest==='base') return rhHomebase();
    return rhHome();
  }
  function rhAfterSignOut(){
    return isRhSurface() || pathIsRH() ? rhHome() : 'index.html';
  }
  function lockRhPath(){
    if(!isRhSurface()) return;
    document.querySelectorAll('a[href]').forEach(function(a){
      if(a.hasAttribute('data-rh-keep')) return;
      var mapped=rhMapHref(a.getAttribute('href'));
      if(mapped) a.setAttribute('href', mapped);
    });
    var brandTo = (window.FC && FC.live && FC.uid && FC.uid()) ? rhHomebase() : rhHome();
    document.querySelectorAll('a.brand, a.auth-brand, a.rh-door-brand').forEach(function(a){
      a.setAttribute('href', brandTo);
    });
    var grid=document.querySelector('footer .footgrid');
    if(grid && !grid.dataset.rhSlim){
      grid.dataset.rhSlim='1';
      grid.innerHTML='<div><a class="brand" href="'+brandTo+'"><img class="lg-dark" src="assets/img/logomark-light.png" alt="" style="height:34px"><img class="lg-light" src="assets/img/logomark-dark.png" alt="" style="height:34px"><b>Fathers.com</b></a>'+
        '<p class="small" style="margin-top:14px;max-width:32ch">Returning Home. Private and free.</p></div>';
    }
    var news=document.querySelector('footer form[data-lead="newsletter"]');
    if(news){
      var wrap=news.parentElement;
      if(wrap) wrap.style.display='none';
    }
    var sponsor=document.querySelector('.nav-right a[href="sponsor.html"], .nav-right a[href="'+rhHome()+'"]');
    if(sponsor && /sponsor/i.test(sponsor.textContent||'')) sponsor.remove();
    var start=document.querySelector('.nav-right a.btn-yellow[href="profile.html"]');
    if(start) start.setAttribute('href','profile.html?start=quick&path=rh');
    var list=document.querySelector('.nav-links');
    if(list && !list.dataset.fcParticipant && !list.dataset.fcRhPublic && !list.querySelector('a[data-role]')){
      list.innerHTML='<li><a href="rh-desk.html">Trainings</a></li>'+
        '<li><a href="profile.html?start=quick&amp;path=rh">Profile</a></li>'+
        '<li><a href="login.html?path=rh&amp;next=rh-home.html">Log in</a></li>';
      list.dataset.fcRhPublic='1';
    }
    document.querySelectorAll('a').forEach(function(a){
      var t=(a.textContent||'').replace(/\s+/g,' ').trim();
      if(/Back to Fathers\.com/i.test(t)) a.textContent='Back to Returning Home';
      else if(/All courses/i.test(t) && /rh-desk\.html/.test(a.getAttribute('href')||'')) a.textContent=t.replace(/All courses/i,'Your trainings');
    });
  }
  document.addEventListener('click', function(e){
    if(!isRhSurface()) return;
    var a=e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if(!a || a.hasAttribute('data-rh-keep')) return;
    var mapped=rhMapHref(a.getAttribute('href'));
    if(mapped && mapped!==a.getAttribute('href')){
      e.preventDefault();
      location.href=mapped;
    }
  }, true);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', lockRhPath);
  } else {
    lockRhPath();
  }

  function safeNext(raw){
    if(!raw) return null;
    try { raw=decodeURIComponent(raw); } catch(e){}
    raw=String(raw).replace(/^\/+/, '');
    if(/^[a-z]+:/i.test(raw) || raw.indexOf('//')===0) return null;
    if(!/^[a-z0-9\-]+\.html(\?[-a-z0-9._~%&=+]*)?(#.*)?$/i.test(raw)) return null;
    return raw;
  }

  var RH_COURSES = [
    { slug:'fundamentals', title:'Fathering Fundamentals', line:'Connect with your child with meaning and impact.', span:'8 lessons', offer:'Training and a certificate.' },
    { slug:'anger', title:'Steady Under Pressure', line:'Steadiness when the moments get loud.', span:'12 weeks', offer:'Training and a certificate.' },
    { slug:'reentry', title:'Coming Home Present', line:'Improving your most important relationships.', span:'12 weeks', offer:'Training and a certificate.' }
  ];

  function playerHref(slug){
    var signed=window.FC && FC.live && FC.uid && FC.uid();
    return signed ? 'course.html?cert='+encodeURIComponent(slug) : 'course.html?preview=1&cert='+encodeURIComponent(slug);
  }

  /* RH-safe view of FCFocusCourse (focus-course.js). Same four I-CAN keys.
     Nurturance maps to Same Team there; Same Team is off this path, so it
     uses the existing Fundamentals fallback. */
  var RH_FOCUS = {
    involvement: { slug:'reentry', title:'Coming Home Present' },
    consistency: { slug:'anger', title:'Steady Under Pressure' },
    awareness: { slug:'fundamentals', title:'Fathering Fundamentals' },
    nurturance: { slug:'fundamentals', title:'Fathering Fundamentals' }
  };
  function rhNormalizeFocus(key){
    key = String(key || '').toLowerCase();
    if(RH_FOCUS[key]) return key;
    if(key.indexOf('involv') >= 0) return 'involvement';
    if(key.indexOf('consist') >= 0) return 'consistency';
    if(key.indexOf('aware') >= 0) return 'awareness';
    if(key.indexOf('nurtur') >= 0) return 'nurturance';
    return null;
  }
  function courseForFocus(focusKey){
    var mapped = null;
    if(window.FCFocusCourse && FCFocusCourse.forFocus){
      mapped = FCFocusCourse.forFocus(focusKey);
    } else {
      var k = rhNormalizeFocus(focusKey);
      mapped = (k && RH_FOCUS[k]) || { slug:'fundamentals', title:'Fathering Fundamentals' };
    }
    if(mapped.slug === 'coparenting'){
      return { slug:'fundamentals', title:'Fathering Fundamentals' };
    }
    return { slug: mapped.slug, title: mapped.title };
  }
  function hasRhReport(){
    try {
      if(localStorage.getItem('fc_rh_profile_done') === '1') return true;
      if(localStorage.getItem('fc_pending_result')) return true;
    } catch(e){}
    return false;
  }
  function rhFocusKey(){
    try {
      var k = localStorage.getItem('fc_rh_next_focus');
      if(k) return k;
      var raw = localStorage.getItem('fc_pending_result');
      if(raw){
        var p = JSON.parse(raw);
        if(p && p.scored && p.scored.gap) return p.scored.gap;
      }
    } catch(e){}
    return null;
  }
  function markRhReport(focusKey){
    try {
      localStorage.setItem('fc_rh_profile_done', '1');
      if(focusKey) localStorage.setItem('fc_rh_next_focus', String(focusKey));
    } catch(e){}
  }
  function retireRhTicker(){
    document.querySelectorAll('.rh-ticker').forEach(function(el){ el.remove(); });
  }
  function paintRhDeskCopy(rec){
    var h = document.querySelector('.rh-desk-h');
    var lead = document.querySelector('.rh-desk-lead');
    var side = document.querySelector('.rh-desk-side[data-rh-guest]');
    if(!h || !rec) return;
    h.textContent = 'Start here.';
    if(lead) lead.textContent = 'Your report named '+rec.title+'.';
    if(side){
      side.innerHTML = 'Your report is on this device. An account keeps it. <a href="login.html?path=rh&amp;next=rh-home.html">Log in</a> · <a href="login.html?path=rh&amp;mode=signup&amp;next=rh-home.html">Create account</a>';
    }
  }

  function paintRhCourses(root){
    if(!root) return;
    var mode=root.getAttribute('data-rh-courses')||'line';
    var rec = hasRhReport() ? courseForFocus(rhFocusKey()) : null;
    var list = RH_COURSES.slice();
    if(rec){
      list.sort(function(a,b){
        if(a.slug===rec.slug) return -1;
        if(b.slug===rec.slug) return 1;
        return 0;
      });
    }
    if(mode==='cards'){
      root.innerHTML=list.map(function(c){
        var start = !!(rec && c.slug===rec.slug);
        return '<a class="rh-film'+(start?' is-start':'')+'" href="'+playerHref(c.slug)+'">'+
          (start?'<span class="rh-film-mark">Start here</span>':'')+
          '<span class="rh-film-t">'+c.title+'</span>'+
          '<span class="rh-film-l">'+c.line+'</span>'+
          '<span class="rh-film-meta">'+(c.span||'')+'. '+(c.offer||'Training and a certificate.')+'</span>'+
          '<span class="rh-film-go">'+(start?'Start':'Watch')+'</span></a>';
      }).join('');
      paintRhDeskCopy(rec);
      return;
    }
    root.innerHTML='Your trainings, free: '+list.map(function(c,i){
      var name='<a href="'+playerHref(c.slug)+'">'+c.title+'</a>';
      if(i===list.length-1) return 'and '+name+'.';
      return name+', ';
    }).join('');
  }

  function rhTickerHtml(){
    return '<div class="rh-ticker" role="region" aria-label="Profile">'+
      '<p class="rh-ticker-copy">See where you stand. The Profile takes eight minutes. Nobody is grading you.</p>'+
      '<a class="rh-ticker-go" href="profile.html?start=quick&amp;path=rh">Start</a></div>';
  }
  function paintRhTicker(){
    if(!isRhSurface()) return;
    if(hasRhReport()){ retireRhTicker(); return; }
    var here=pageName();
    if(here!=='course.html') return;
    if(document.querySelector('.rh-ticker')) return;
    var wrap=document.createElement('div');
    wrap.innerHTML=rhTickerHtml();
    var bar=wrap.firstChild;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  window.FCPath = {
    isRH: pathIsRH,
    isRhSurface: isRhSurface,
    courses: RH_COURSES,
    playerHref: playerHref,
    deskHref: rhDesk,
    homeHref: rhHome,
    homebaseHref: rhHomebase,
    focusKey: rhFocusKey,
    courseHref: function(slug){ return playerHref(slug||'fundamentals'); },
    courseForFocus: courseForFocus,
    hasReport: hasRhReport,
    markReport: markRhReport,
    reportHref: function(){ return 'report.html'; },
    catalogHref: function(){ return pathIsRH() ? rhDesk() : 'certificates.html'; },
    afterSignOut: rhAfterSignOut,
    lock: lockRhPath,
    safeNext: safeNext
  };

  if(hasRhReport()) retireRhTicker();
  document.querySelectorAll('[data-rh-courses]').forEach(paintRhCourses);
  paintRhTicker();

  // Nav
  var nav=document.querySelector('.nav');
  var tog=document.querySelector('.nav-toggle');
  if(tog){
    if(!tog.getAttribute('aria-controls')) tog.setAttribute('aria-controls','fc-nav-links');
    if(!tog.getAttribute('aria-expanded')) tog.setAttribute('aria-expanded','false');
    tog.addEventListener('click',function(){
      var open=nav.classList.toggle('open');
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Tabs
  document.querySelectorAll('[data-tabs]').forEach(function(group){
    var btns=group.querySelectorAll('.tabs button');
    var panels=group.querySelectorAll('.tabpanel');
    btns.forEach(function(b,i){b.addEventListener('click',function(){
      btns.forEach(function(x){x.classList.remove('active')});
      panels.forEach(function(p){p.classList.remove('active')});
      b.classList.add('active');panels[i].classList.add('active');
    })});
  });

  // Toggle chips
  document.querySelectorAll('.chip[data-toggle]').forEach(function(c){
    c.addEventListener('click',function(e){
      e.preventDefault();
      var group=c.closest('.chiprow');
      if(c.dataset.toggle==='single'&&group){group.querySelectorAll('.chip').forEach(function(x){x.classList.remove('selected')});c.classList.add('selected');}
      else c.classList.toggle('selected');
    });
  });

  // Card stamping for filler rows
  document.querySelectorAll('[data-repeat]').forEach(function(row){
    var n=parseInt(row.dataset.repeat,10);
    var ratio=row.dataset.ratio||'r-16x9', prefix=row.dataset.prefix||'IMG-SLOT-';
    var titles=(row.dataset.titles||'').split('|'), subs=(row.dataset.subs||'').split('|'), metas=(row.dataset.metas||'').split('|'), cats=(row.dataset.cats||'').split('|');
    for(var i=1;i<=n;i++){
      var id=prefix+String(i).padStart(2,'0');
      var a=document.createElement('a');
      var hrefs=(row.dataset.hrefs||'').split('|');
      a.className='mediacard';a.href=(hrefs[i-1]&&hrefs[i-1].trim())||row.dataset.href||'#';
      if(cats[i-1]&&cats[i-1].trim()) a.setAttribute('data-cat',cats[i-1].trim());
      a.innerHTML='<div class="slot '+ratio+'" data-slot="'+id+'"></div>'+
        (titles[i-1]?'<div class="name">'+titles[i-1]+'</div>':'')+
        (subs[i-1]?'<div class="sub">'+subs[i-1]+'</div>':'')+
        (metas[i-1]?'<div class="meta">'+metas[i-1]+'</div>':'');
      row.appendChild(a);
    }
  });

  // Category filtering. Only acts on chiprows explicitly marked data-filter="<targetSelector>".
  // data-select="single" -> one active chip (used with an "All" chip). "multi" -> OR across selected.
  // Chips whose category matches no card are hidden; a label row with no live chips hides too.
  (function(){
    var groups={};
    document.querySelectorAll('.chiprow[data-filter]').forEach(function(row){
      var sel=row.getAttribute('data-filter');(groups[sel]=groups[sel]||[]).push(row);
    });
    Object.keys(groups).forEach(function(sel){
      var target=document.querySelector(sel); if(!target) return;
      var rows=groups[sel];
      var cards=[].slice.call(target.querySelectorAll('.mediacard'));
      var mode=rows[0].getAttribute('data-select')||'multi';
      function catsOf(c){return (c.getAttribute('data-cat')||'').split(/\s+/).filter(Boolean);}
      function allChips(){var o=[];rows.forEach(function(rw){[].slice.call(rw.querySelectorAll('.chip')).forEach(function(c){o.push(c);});});return o;}
      // hide dead chips (no matching card), and hide a label row left with nothing
      rows.forEach(function(row){
        var live=0;
        [].slice.call(row.querySelectorAll('.chip')).forEach(function(chip){
          if(chip.hasAttribute('data-all')){live++;return;}
          var cat=chip.getAttribute('data-cat')||'';
          if(cards.some(function(c){return catsOf(c).indexOf(cat)>-1;})){live++;}
          else{chip.style.display='none';}
        });
        if(live===0&&row.parentElement) row.parentElement.style.display='none';
      });
      function apply(cats){ // cats: array of active category keys; empty => show all
        cards.forEach(function(c){
          var show=cats.length===0||catsOf(c).some(function(k){return cats.indexOf(k)>-1;});
          c.style.display=show?'':'none';
        });
      }
      function selected(){return allChips().filter(function(c){return c.classList.contains('selected')&&!c.hasAttribute('data-all');}).map(function(c){return c.getAttribute('data-cat')||'';});}
      function onClick(chip){
        if(mode==='single'){
          var isAll=chip.hasAttribute('data-all'), wasSel=chip.classList.contains('selected');
          allChips().forEach(function(c){c.classList.remove('selected');});
          if(!isAll&&wasSel){var a=null;allChips().forEach(function(c){if(c.hasAttribute('data-all'))a=c;});if(a)a.classList.add('selected');apply([]);}
          else{chip.classList.add('selected');apply(isAll?[]:[chip.getAttribute('data-cat')||'']);}
        } else {
          chip.classList.toggle('selected');
          apply(selected());
        }
      }
      allChips().forEach(function(chip){chip.addEventListener('click',function(e){e.preventDefault();onClick(chip);});});
      // reflect any pre-selected state on load
      if(mode==='single'){var pre=null;allChips().forEach(function(c){if(c.classList.contains('selected'))pre=c;});if(pre)apply(pre.hasAttribute('data-all')?[]:[pre.getAttribute('data-cat')||'']);}
      else apply(selected());
    });
  })();

  // Toast
  window.toast=function(msg){
    var t=document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');
    clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('show')},2600);
  };

  // Search overlay
  function ensureVeil(){
    var v=document.getElementById('searchveil');
    if(!v){
      v=document.createElement('div'); v.className='searchveil'; v.id='searchveil';
      v.innerHTML='<div class="searchpanel"><input class="input" placeholder="Search classes and lessons"><p class="fine" style="margin-top:14px">Type to search. Press Escape to close.</p></div>';
      document.body.appendChild(v);
      v.addEventListener('click',function(e){if(e.target===v)v.classList.remove('open')});
    }
    return v;
  }
  var veil=document.getElementById('searchveil');
  document.querySelectorAll('[data-open-search]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();var v=ensureVeil();v.classList.add('open');var inp=v.querySelector('input');if(inp)inp.focus();})});
  if(veil){veil.addEventListener('click',function(e){if(e.target===veil)veil.classList.remove('open')});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')veil.classList.remove('open')});}

  // Sequential panels (cancel path, checkout)
  document.querySelectorAll('[data-seq]').forEach(function(seq){
    var panels=Array.prototype.slice.call(seq.querySelectorAll('.seqpanel'));
    panels.forEach(function(p,i){if(i>0)p.style.display='none'});
    seq.querySelectorAll('[data-next]').forEach(function(b){b.addEventListener('click',function(){
      var cur=panels.findIndex(function(p){return p.style.display!=='none'});
      if(cur<panels.length-1){panels[cur].style.display='none';panels[cur+1].style.display='';}
    })});
  });

  // Player end-card countdown
  var ring=document.getElementById('countdown');
  if(ring){var s=5;var num=ring.querySelector('b');
    var iv=setInterval(function(){s--;num.textContent=s;if(s<=0){clearInterval(iv);toast('Autoplay paused in prototype.');}},1000);}

  // Year
  document.querySelectorAll('[data-year]').forEach(function(el){el.textContent=new Date().getFullYear()});

  /* Palette switch : black default, light option, persisted */
  function applyTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('fc_theme',t)}catch(e){}}
  var switches=document.querySelectorAll('[data-themeswitch]');
  var rhRoom=!!(document.querySelector('.rh-door')||(window.FCPath&&FCPath.isRhSurface&&FCPath.isRhSurface()));
  if(!switches.length && !rhRoom){
    var b=document.createElement('button');
    b.className='themeswitch floating';b.setAttribute('data-themeswitch','');
    b.setAttribute('aria-label','Switch palette');b.title='Switch palette';
    b.innerHTML='<span class="tsw-dot"></span>';
    document.body.appendChild(b);switches=[b];
  }
  if(rhRoom){
    document.querySelectorAll('.themeswitch.floating').forEach(function(el){ el.remove(); });
    switches=document.querySelectorAll('[data-themeswitch]');
  }
  switches.forEach(function(s){s.addEventListener('click',function(){
    applyTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
  })});

  /* ==========================================================
     LIVE MODE from here down. FC comes from supabase-client.js.
     Every block degrades to the demo behavior when FC.live is false.
     ========================================================== */
  var LIVE = window.FC && FC.live;

  // Demo persisted checkboxes (localStorage) when not live
  if(!LIVE){
    document.querySelectorAll('input[data-persist]').forEach(function(cb){
      var k=cb.dataset.persist;
      cb.checked=localStorage.getItem(k)==='1';sync(cb);
      cb.addEventListener('change',function(){localStorage.setItem(k,cb.checked?'1':'0');sync(cb);
        if(cb.checked)toast('Marked done. Honest beats perfect.');});
      function sync(el){var r=el.closest('.actionrow');if(r)r.classList.toggle('done',el.checked);}
    });
  }

  // Demo verify lookup when not live
  var vf=document.getElementById('verifyForm');
  var DEMO_CERTS={'FC-2026-000000':{recipient_display:'Sample Record',course_title:'Fathering Fundamentals Certificate',sessions:'5',issued_at:'2026-06-02'},
                  'FC-2026-000001':{recipient_display:'Sample Record',course_title:'Fathering Fundamentals Certificate',sessions:'5',issued_at:'2026-04-18',status:'revoked'}};
  function showCert(d,serial){
    var ok=document.getElementById('v-ok'),no=document.getElementById('v-no');
    var susp=document.getElementById('v-susp'),rev=document.getElementById('v-rev');
    if(!ok||!no) return;
    [ok,no,susp,rev].forEach(function(el){ if(el) el.style.display='none'; });
    if(d && d.status==='revoked' && rev){ rev.style.display=''; return; }
    if(d && d.status==='suspended' && susp){ susp.style.display=''; return; }
    if(d){ok.style.display='';
      ok.querySelector('[data-f=name]').textContent=d.recipient_display;
      ok.querySelector('[data-f=course]').textContent=d.course_title;
      var rec='';
      if(typeof d.contact_hours==='number' && d.contact_hours>0){ rec += d.contact_hours.toFixed(1)+' facilitated contact hours'; }
      if(typeof d.snapshot_independent_seconds==='number' && d.snapshot_independent_seconds>0){ rec += (rec?' \u00B7 ':'')+Math.round(d.snapshot_independent_seconds/60)+' independent minutes, platform-measured'; }
      if(d.sessions){ rec += (rec?' \u00B7 ':'')+d.sessions+' sessions'; }
      ok.querySelector('[data-f=hours]').textContent = rec || 'Facilitator-attested completion';
      ok.querySelector('[data-f=date]').textContent='Issued '+new Date(d.issued_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
      ok.querySelector('[data-f=serial]').textContent=serial;
      var idEl=ok.querySelector('[data-f=identity]'); if(idEl) idEl.textContent = (d.attestation_method==='id') ? 'Confirmed by ID at enrollment' : 'Confirmed by Certified Facilitator';
    } else {no.style.display='';}
  }
  if(vf){
    var qs=new URLSearchParams(location.search);
    var pre=qs.get('s')||qs.get('serial');
    if(pre) vf.querySelector('input').value=pre;
    vf.addEventListener('submit',function(e){
    e.preventDefault();
    var s=vf.querySelector('input').value.trim().toUpperCase();
    if(LIVE){FC.ready.then(function(){
      return FC.sb.functions.invoke('verify_serial', { body: { serial: s } });
    }).then(function(r){
      if(r && r.error){ showCert(null, s); return; }
      showCert(r && r.data && r.data.data ? r.data.data : null, s);
    });}
    else showCert(DEMO_CERTS[s]||null,s);
  });
    if(pre) vf.dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
  }



  // Hero intent form: tap a path on the homepage, remember it, go to the assessment.
  // A track can name the instrument it leads to via data-assessment. Without one
  // the man lands on the default profile, which is how the Fatherhood Track works.
  document.querySelectorAll('.hero-intent-opt').forEach(function(b){
    b.addEventListener('click', function(){
      try { localStorage.setItem('fc_intent_path', b.getAttribute('data-path')); } catch(e){}
      var slug = b.getAttribute('data-assessment');
      window.location.href = slug
        ? 'profile.html?assessment=' + encodeURIComponent(slug)
        : 'profile.html';
    });
  });

  // Play overlays: honor an existing href (homepage billboard, course cards).
  // Otherwise open Fathering Fundamentals. class.html remains a Seven Secrets wrapper only.
  document.querySelectorAll('.play-overlay, .hm-play, .cert-doc-3d').forEach(function(el){
    if(el.classList.contains('cert-doc-3d')) return; // the cert doc isn't a video
    el.style.cursor = 'pointer';
    el.addEventListener('click', function(ev){
      var href = (el.tagName === 'A' && el.getAttribute('href')) || '';
      if(href && href !== '#'){
        // Let the native <a> navigation proceed; do not override to class.html.
        return;
      }
      ev.preventDefault();
      if(!/course-fathering-fundamentals\.html$/.test(location.pathname)){
        location.href = 'course-fathering-fundamentals.html';
      } else if(window.toast){
        toast('Full lessons unlock with the free Profile. Trailers are being wired now.');
      }
    });
  });

  // Password reset: real when keys are live, honest when not.
  document.querySelectorAll('[data-pwreset]').forEach(function(b){
    b.addEventListener('click', function(){
      if(!(window.FC && FC.live)){ toast('Password reset activates with live keys.'); return; }
      FC.ready.then(function(){
        var em = (FC.session && FC.session.user && FC.session.user.email) || '';
        if(!em){ toast('Sign in first.'); return; }
        FC.sb.auth.resetPasswordForEmail(em).then(function(){ toast('Reset link sent to ' + em + '.'); },
          function(){ toast('Could not send the reset link. Try again.'); });
      });
    });
  });

  // Preference saves persist locally so the button does what it says.
  document.querySelectorAll('[data-prefs-save]').forEach(function(b){
    b.addEventListener('click', function(){
      var scope = b.closest('.card') || document;
      var state = {};
      scope.querySelectorAll('input,select,textarea').forEach(function(el,i){
        var k = el.name || el.id || ('f'+i);
        state[k] = el.type==='checkbox' ? el.checked : el.value;
      });
      try { localStorage.setItem(b.dataset.prefsKey || 'fc_prefs', JSON.stringify(state)); } catch(e){}
      toast('Saved.');
    });
  });

  // Lead + submission forms
  document.querySelectorAll('form[data-lead]').forEach(function(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var src=f.dataset.lead, data={};
      new FormData(f).forEach(function(v,k){data[k]=v});
      var done=function(){toast(f.dataset.done||'Sent.');f.reset();};
      if(!LIVE){done();return;}
      FC.ready.then(function(){
        if(src==='story'){
          return FC.sb.from('story_submissions').insert({email:data.email,season:data.season,turn:data.turn,standard:data.standard,consent:!!data.consent});
        }
        return FC.sb.from('leads').insert({source:src,email:data.email||data.contact||null,payload:data});
      }).then(function(r){ if(r&&r.error){console.error(r.error);toast('Something failed. Try again.');} else done(); });
    });
  });

  // Stripe Payment Link on checkout
  var pay=document.getElementById('paybtn');
  if(pay&&window.FC&&FC.cfg&&FC.cfg.STRIPE_PAYMENT_LINK){
    pay.removeAttribute('data-next');
    pay.addEventListener('click',function(){location.href=FC.cfg.STRIPE_PAYMENT_LINK;});
  }

  if(!LIVE) return;

  // ---------- everything below runs only with keys present ----------
  FC.ready.then(function(){
    var session=FC.session;

    // Auth gate (preview/demo players stay open to first-time visitors)
    var _qs = new URLSearchParams(location.search);
    var _previewOpen = _qs.get('preview')==='1' || _qs.get('demo')==='1';
    if(document.body.dataset.auth==='required'&&!session&&!_previewOpen){
      location.href='login.html?next='+encodeURIComponent(location.pathname+location.search);return;
    }

    /* ---------- Nav state for a signed-in participant ----------
       Public-built pages ship the marketing nav: The Profile / The Courses /
       Stories, plus a yellow "Start your Profile". A signed-in man reading his
       own report was therefore offered the thing he had already done, with no
       route to his home, his plan or his circle. Worse, the only dashboard
       link was a right-rail text link carrying .hide-m, so it vanished below
       680px and never appeared in the mobile drawer, which only reveals
       .nav-links.

       So swap the whole primary list rather than relabelling one link. The
       participant set lives in .nav-links, which means it reaches the mobile
       drawer for the first time, and the report and the plan are in the global
       nav at all. Role dashboards (admin, studio, org) carry data-role links
       and are left alone. */
    if(session) applyParticipantNav();
    document.querySelectorAll('[data-rh-courses]').forEach(paintRhCourses);
    paintRhTicker();
    lockRhPath();

    function applyParticipantNav(){
      var list=document.querySelector('.nav-links');
      if(!list || list.querySelector('a[data-role]')) return;   // role dashboards keep theirs
      if(list.dataset.fcParticipant) return;                    // idempotent

      var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
      var slug=(/[?&]assessment=([^&]+)/.exec(location.search)||[])[1];
      var q=slug?('?assessment='+slug):'';
      var rh=window.FCPath && FCPath.isRhSurface();
      var links=rh
        ? [['Home','rh-home.html'],['Report','report.html'+q],['Profile','profile.html?start=quick&path=rh'],['Sign out','#signout']]
        : [['Home','dashboard.html'],['My Report','report.html'+q],['My Plan','plan.html'+q],['Courses','certificates.html'],['Sign out','#signout']];
      list.innerHTML=links.map(function(l){
        var target=l[1].split('?')[0];
        var on=(target===here)?' class="active"':'';
        return '<li><a href="'+l[1]+'"'+on+'>'+l[0]+'</a></li>';
      }).join('');
      list.dataset.fcParticipant='1';
      var so=list.querySelector('a[href="#signout"]');
      if(so){
        so.addEventListener('click',function(e){
          e.preventDefault();
          FC.signOut().then(function(){ location.href=rhAfterSignOut(); });
        });
      }

      /* The yellow marketing CTA is wrong for a man who is already inside.
         Replace it with the account chip the app-built pages already use, so
         the two navs converge on one shape. */
      var cta=document.querySelector('.nav-right a.btn-yellow[href="profile.html"]');
      if(cta){
        var chip=document.createElement('a');
        chip.href='account.html'; chip.className='avatarchip';
        chip.title='Account'; chip.style.textDecoration='none';
        /* Initial from whatever the session knows, so the chip is his and not a
           hardcoded letter. Falls back to the wordless glyph. */
        var who=(session.user&&(session.user.user_metadata&&session.user.user_metadata.full_name))||
                (session.user&&session.user.email)||'';
        chip.textContent=who?who.trim().charAt(0).toUpperCase():'\u2022';
        cta.parentNode.replaceChild(chip, cta);
      }
    }

    // Auth page: one card, two modes. Password only.
    var af=document.getElementById('authForm');
    if(af){
      var authEmail=document.getElementById('authEmail');
      var authPass=document.getElementById('authPass');
      var authMsg=document.getElementById('authMsg');
      var authSignin=document.getElementById('authSignin');
      var authTitle=document.getElementById('authTitle');
      var authSub=document.getElementById('authSub');
      var authAltTxt=document.getElementById('authAltTxt');
      var authAltLink=document.getElementById('authAltLink');
      var authNameField=document.getElementById('authNameField');
      var authName=document.getElementById('authName');
      var authForgot=document.getElementById('authForgot');
      var qs=new URLSearchParams(location.search);
      var mode=qs.get('mode')==='signup'?'signup':'signin';
      var nextPage=safeNext(qs.get('next'));
      var afterAuth=nextPage || (qs.get('path')==='rh' ? rhHomebase() : null);

      function aMsg(t,kind){ authMsg.textContent=t||''; authMsg.style.color=kind==='err'?'var(--error)':'var(--ash)'; }
      function setMode(m){
        mode=m; aMsg('');
        var up=(m==='signup');
        if(authTitle) authTitle.textContent=up?'Create your account':'Sign in';
        if(authSub) authSub.textContent=up
          ? ((window.FCPath && FCPath.isRH())
            ? 'Free. Your trainings and your report stay with you.'
            : 'Free, always. Your Profile, your plan, and your progress live here.')
          : ((window.FCPath && FCPath.isRH())
            ? 'Welcome back. Your trainings are waiting.'
            : 'Welcome back. Pick up your plan where you left off.');
        if(authNameField) authNameField.style.display=up?'':'none';
        if(authSignin) authSignin.textContent=up?'Create account':'Sign in';
        if(authAltTxt) authAltTxt.textContent=up?'Already have an account? ':'New here? ';
        if(authAltLink) authAltLink.textContent=up?'Sign in':'Create an account';
        if(authForgot) authForgot.style.display=up?'none':'';
        if(authPass) authPass.setAttribute('autocomplete', up?'new-password':'current-password');
      }
      setMode(mode);
      if(authAltLink) authAltLink.addEventListener('click',function(e){ e.preventDefault(); setMode(mode==='signup'?'signin':'signup'); });

      af.addEventListener('submit',function(e){
        e.preventDefault();
        var email=(authEmail.value||'').trim(), pass=authPass.value||'';
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ aMsg('Enter a valid email.','err'); return; }
        if(mode==='signup' && pass.length<8){ aMsg('Password needs at least 8 characters.','err'); return; }
        if(!pass){ aMsg('Enter your password.','err'); return; }
        var lbl=authSignin.textContent; authSignin.disabled=true; authSignin.textContent=mode==='signup'?'Creating\u2026':'Signing in\u2026';
        var done=function(){ authSignin.disabled=false; authSignin.textContent=lbl; };
        if(mode==='signup'){
          FC.signUpPassword(email, pass, (authName&&authName.value||'').trim(), afterAuth || 'plan.html').then(function(r){
            done();
            if(r.error){ aMsg(r.error.message||'Could not create the account.','err'); return; }
            if(r.data && r.data.session){ location.href = afterAuth || 'profile.html'; return; }
            setMode('signin');
            aMsg('Account created. If a confirm email arrives, open it, then sign in here. If not, try signing in now.');
          }, function(){ done(); aMsg('Could not create the account. Try again.','err'); });
        } else {
          FC.signInPassword(email, pass).then(function(r){
            done();
            if(r.error){
              var em=(r.error.message||'');
              aMsg(/confirm/i.test(em) ? 'Confirm the email we sent, then sign in here.' : 'Wrong email or password.','err');
              return;
            }
            location.href = afterAuth || 'plan.html';
          }, function(){ done(); aMsg('Could not sign in. Try again.','err'); });
        }
      });

      if(authForgot) authForgot.addEventListener('click',function(){
        var email=(authEmail.value||'').trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ aMsg('Enter your email above first, then tap Forgot.','err'); return; }
        FC.resetPassword(email).then(function(){ aMsg('Reset link sent to '+email+'.'); },
          function(){ aMsg('Could not send the reset link.','err'); });
      });
    }

    if(!session) return;

    document.querySelectorAll('[data-rh-guest]').forEach(function(el){ el.remove(); });
    document.querySelectorAll('a.rh-door-login').forEach(function(a){
      a.textContent='Sign out';
      a.setAttribute('href','#signout');
      a.addEventListener('click',function(e){
        e.preventDefault();
        FC.signOut().then(function(){ location.href=rhAfterSignOut(); });
      });
    });

    if(pathIsRH()){
      if(hasRhReport()){
        retireRhTicker();
        document.querySelectorAll('[data-rh-courses]').forEach(paintRhCourses);
      }
      FC.getBaseline().then(function(r){
        if(r && r.data){
          markRhReport(r.data.gap_domain);
          retireRhTicker();
          document.querySelectorAll('[data-rh-courses]').forEach(paintRhCourses);
        }
      }).catch(function(){});
      if(FC.sb){
        FC.sb.from('keystone_results').select('gap_scale').eq('user_id', FC.uid()).limit(1).maybeSingle()
          .then(function(r){
            if(r && r.data){
              markRhReport(r.data.gap_scale);
              retireRhTicker();
              document.querySelectorAll('[data-rh-courses]').forEach(paintRhCourses);
            }
          }).catch(function(){});
      }
    }


    // One-time: push a locally finished Keystone to the account
    FC.syncKeystone().then(function(did){if(did)toast('Baseline and plan saved to your account.')}).catch(function(e){console.error(e)});

    // My Plan: live This Week + baseline chip + chain
    var tw=document.getElementById('thisweek');
    if(tw){
      FC.getBaseline().then(function(r){
        if(r.data){var el=document.getElementById('baselineScore');if(el)el.textContent=r.data.overall;}
      });
      FC.getPlan().then(function(r){
        if(!r.data) return;
        var plan=r.data, week=FC.weekOf(plan);
        Promise.all([FC.getWeekActions(plan.id,week),FC.getCompletions(plan.id)]).then(function(res){
          var actions=res[0].data||[], comps=res[1].data||[];
          var doneIds={};comps.forEach(function(c){doneIds[c.plan_action_id]=1});
          var weeksDone={};comps.forEach(function(c){if(c.plan_actions)weeksDone[c.plan_actions.week]=1});
          var chain=0;for(var w=week;w>=1;w--){if(weeksDone[w])chain++;else if(w<week)break;}
          var chip=document.getElementById('chainChip');if(chip)chip.textContent='⛓ '+chain+(chain===1?' week':' weeks')+' straight';
          var h=tw.querySelector('h2');if(h)h.textContent='Week '+week+' of '+(plan.weeks||12)+'.';
          var list=tw.querySelector('.stack-16');
          if(list){list.innerHTML='';
            actions.forEach(function(a){
              if(a.kind==='lesson'){
                var d=document.createElement('div');d.className='actionrow';d.style.alignItems='center';
                d.innerHTML='<span class="checkmark">▶</span><div style="flex:1"><b style="font-size:15px">'+a.title+'</b><div class="meta">'+(a.domain||'')+'</div></div><a class="btn btn-primary btn-sm" href="player.html">Watch</a>';
                list.appendChild(d);
              } else {
                var l=document.createElement('label');l.className='actionrow'+(doneIds[a.id]?' done':'');
                l.innerHTML='<input type="checkbox" '+(doneIds[a.id]?'checked':'')+'><div style="flex:1"><div class="txt">'+a.title+'</div><div class="meta">'+(a.domain||'')+'</div></div>';
                var cb=l.querySelector('input');
                cb.addEventListener('change',function(){
                  FC.toggleAction(a.id,cb.checked).then(function(r2){
                    if(r2.error){console.error(r2.error);cb.checked=!cb.checked;toast('Save failed. Try again.');return;}
                    l.classList.toggle('done',cb.checked);
                    if(cb.checked)toast('Marked done. Honest beats perfect.');
                  });
                });
                list.appendChild(l);
              }
            });
          }
        });
      });
    }

    // Player: load real lessons + video when available
    var stage=document.getElementById('stage');
    if(stage){
      var params=new URLSearchParams(location.search);
      var slug=params.get('c')||'fundamentals';
      FC.getClass(slug).then(function(r){
        if(!r.data||!r.data.lessons||!r.data.lessons.length) return;
        var lessons=r.data.lessons.sort(function(a,b){return a.num-b.num});
        var num=parseInt(params.get('l')||'1',10);
        var lesson=lessons.find(function(x){return x.num===num})||lessons[0];
        var vimeoId = lesson.vimeo_id;
        if(vimeoId){
          var fr=document.createElement('iframe');
          fr.src='https://player.vimeo.com/video/'+vimeoId;
          fr.allow='autoplay; fullscreen; picture-in-picture';fr.allowFullscreen=true;
          fr.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:8px';
          stage.replaceWith(fr);
          // Vimeo progress needs the Player SDK; log a start event for the audit trail
          FC.saveProgress(lesson.id, 0, false);
        } else if(lesson.video_url){
          var u=lesson.video_url, el;
          if(/youtube|youtu\.be|vimeo/.test(u)){
            el=document.createElement('iframe');
            el.src=u;el.allowFullscreen=true;el.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:8px';
          } else {
            el=document.createElement('video');
            el.src=u;el.controls=true;el.playsInline=true;el.style.cssText='width:100%;aspect-ratio:16/9;border-radius:8px;background:#000';
            var last=0;
            el.addEventListener('timeupdate',function(){if(el.currentTime-last>10){last=el.currentTime;FC.saveProgress(lesson.id,el.currentTime,false);}});
            el.addEventListener('ended',function(){FC.saveProgress(lesson.id,el.duration,true);toast('Lesson complete.');});
          }
          stage.replaceWith(el);
        }
      });
    }

    // Sign out hook
    document.querySelectorAll('[data-signout]').forEach(function(b){
      b.addEventListener('click',function(e){e.preventDefault();FC.signOut().then(function(){location.href=rhAfterSignOut()})});
    });

    // Share links: [data-share="copy|sms|email|native|report"]. Every share click does its job.
    document.querySelectorAll('[data-share]').forEach(function(el){
      el.addEventListener('click',function(e){
        e.preventDefault();
        var kind=el.dataset.share, url=location.href.split('#')[0], title=document.title;
        if(kind==='copy'){
          (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){toast('Link copied.')},function(){prompt('Copy this link:',url)});
        } else if(kind==='sms'){ location.href='sms:?&body='+encodeURIComponent(title+' '+url); }
        else if(kind==='email'){ location.href='mailto:?subject='+encodeURIComponent(title)+'&body='+encodeURIComponent(url); }
        else if(kind==='report'){ location.href='mailto:Team@Fathers.com?subject='+encodeURIComponent('Report a concern: '+title)+'&body='+encodeURIComponent(url); }
        else if(navigator.share){ navigator.share({title:title,url:url}).catch(function(){}); }
        else { (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){toast('Link copied.')},function(){prompt('Copy this link:',url)}); }
      });
    });

    // Print hooks: [data-print]
    document.querySelectorAll('[data-print]').forEach(function(el){
      el.addEventListener('click',function(e){e.preventDefault();window.print();});
    });

    // Program join codes: ?join=CODE tags this man's assessments to an org/program/cohort.
    try{
      var jc=new URLSearchParams(location.search).get('join');
      if(jc){ localStorage.setItem('fc_join_code', jc.trim().toUpperCase()); }
      var pend=localStorage.getItem('fc_join_code');
      if(pend && FC.live && FC.sb){
        FC.sb.from('org_join_codes').select('*').eq('code',pend).maybeSingle()
          .then(function(r){
            if(r && r.data && r.data.active){
              localStorage.setItem('fc_org_tag', JSON.stringify({organization_id:r.data.org_id, program_id:r.data.program_id, cohort_id:r.data.cohort_id, code:pend, support_note:r.data.support_note||null}));
              if(jc && window.toast) toast('Linked to your program.');
            }
          }, function(){});
      }
    }catch(_){}

    // Program-provided support contacts, shown wherever the page has a slot.
    try{
      var _t=JSON.parse(localStorage.getItem('fc_org_tag')||'null');
      if(_t && _t.support_note){
        var os=document.getElementById('orgSupport');
        if(os){ var tx=document.getElementById('orgSupportTxt'); if(tx) tx.textContent=_t.support_note; os.hidden=false; }
      }
    }catch(_){}
  });
})();
