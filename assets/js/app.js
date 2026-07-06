/* FORGE shared behaviors + live wiring : Fathers.com */
(function(){
  // Nav
  var nav=document.querySelector('.nav');
  var tog=document.querySelector('.nav-toggle');
  if(tog) tog.addEventListener('click',function(){nav.classList.toggle('open')});

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
    var titles=(row.dataset.titles||'').split('|'), subs=(row.dataset.subs||'').split('|'), metas=(row.dataset.metas||'').split('|');
    for(var i=1;i<=n;i++){
      var id=prefix+String(i).padStart(2,'0');
      var a=document.createElement('a');
      a.className='mediacard';a.href=row.dataset.href||'#';
      a.innerHTML='<div class="slot '+ratio+'" data-slot="'+id+'"></div>'+
        (titles[i-1]?'<div class="name">'+titles[i-1]+'</div>':'')+
        (subs[i-1]?'<div class="sub">'+subs[i-1]+'</div>':'')+
        (metas[i-1]?'<div class="meta">'+metas[i-1]+'</div>':'');
      row.appendChild(a);
    }
  });

  // Toast
  window.toast=function(msg){
    var t=document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');
    clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('show')},2600);
  };

  // Search overlay
  var veil=document.getElementById('searchveil');
  document.querySelectorAll('[data-open-search]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();veil.classList.add('open');veil.querySelector('input').focus();})});
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
  if(!switches.length){
    var b=document.createElement('button');
    b.className='themeswitch floating';b.setAttribute('data-themeswitch','');
    b.setAttribute('aria-label','Switch palette');b.title='Switch palette';
    b.innerHTML='<span class="tsw-dot"></span>';
    document.body.appendChild(b);switches=[b];
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
  var DEMO_CERTS={'FC-2026-004317':{recipient_display:'Marcus T.',course_title:'Fathering Fundamentals Certificate',hours:'10.0',issued_at:'2026-06-02'},
                  'FC-2026-001882':{recipient_display:'Ray M.',course_title:'Reentry Fatherhood Certificate',hours:'12.0',issued_at:'2026-04-18'}};
  function showCert(d,serial){
    var ok=document.getElementById('v-ok'),no=document.getElementById('v-no');
    if(d){ok.style.display='';no.style.display='none';
      ok.querySelector('[data-f=name]').textContent=d.recipient_display;
      ok.querySelector('[data-f=course]').textContent=d.course_title;
      ok.querySelector('[data-f=hours]').textContent=parseFloat(d.hours).toFixed(1)+' verified instructional hours';
      ok.querySelector('[data-f=date]').textContent='Issued '+new Date(d.issued_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
      ok.querySelector('[data-f=serial]').textContent=serial;
    } else {ok.style.display='none';no.style.display='';}
  }
  if(vf){vf.addEventListener('submit',function(e){
    e.preventDefault();
    var s=vf.querySelector('input').value.trim().toUpperCase();
    if(LIVE){FC.ready.then(function(){
      return FC.sb.from('public_certificates').select('*').eq('serial',s).maybeSingle();
    }).then(function(r){showCert(r&&r.data?r.data:null,s)});}
    else showCert(DEMO_CERTS[s]||null,s);
  });}

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

    // Auth gate
    if(document.body.dataset.auth==='required'&&!session){
      location.href='login.html';return;
    }

    // Nav state
    var loginLink=document.querySelector('.nav-right a[href="login.html"]');
    if(loginLink&&session){loginLink.textContent='My Plan';loginLink.href='plan.html';}

    // Login page
    var lf=document.getElementById('loginForm');
    if(lf){lf.addEventListener('submit',function(e){
      e.preventDefault();
      var email=lf.querySelector('input').value.trim();
      FC.signIn(email).then(function(r){
        document.getElementById('loginMsg').textContent=r.error?('Could not send: '+r.error.message):'Check your email. Click the link and you are in.';
      });
    });}

    if(!session) return;

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
      b.addEventListener('click',function(e){e.preventDefault();FC.signOut().then(function(){location.href='index.html'})});
    });
  });
})();
