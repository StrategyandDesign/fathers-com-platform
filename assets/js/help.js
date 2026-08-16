/* The guide. Corner ?. One sentence for this screen, one action.
   More behind a fold. Public path is Profile · Plan · Course.
   Returning Home uses Profile · Report · Trainings and never points at the
   public catalog. Never auto-open. Speaks to one person: the father. */
(function(){
  var page = (location.pathname.split('/').pop() || 'index.html');
  if (page === 'lead.html' || page === 'review.html') return;
  if (document.getElementById('fc-help-launcher')) return;

  var reduced = false;
  try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch(e){}

  var rh = false;
  try {
    rh = localStorage.getItem('fc_path')==='returning-home' || page==='returning-home.html' || page==='rh-desk.html' || page==='rh-home.html';
  } catch(e){}
  try {
    if (new URLSearchParams(location.search).get('path')==='rh') rh = true;
  } catch(e){}

  var css = ''
  + '#fc-help-launcher{position:fixed;right:22px;bottom:22px;z-index:9998;width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:#0b0a08;color:#ffffff;font-size:22px;font-family:inherit;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.45);transform-origin:center center}'
  + '@keyframes fc-help-nudge{0%{transform:scale(1)}35%{transform:scale(1.08)}70%{transform:scale(0.97)}100%{transform:scale(1)}}'
  + '#fc-help-launcher.fc-help-nudge{animation:fc-help-nudge .7s ease-out 1}'
  + '#fc-help-launcher.is-open{opacity:0;pointer-events:none;transform:scale(0.6)}'
  + '#fc-help-panel{position:fixed;right:22px;bottom:22px;z-index:9999;width:min(360px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 40px));overflow:auto;background:#ffffff;color:#1a1710;border:1px solid #d8d2c4;border-radius:16px;padding:22px 22px 18px;box-shadow:0 14px 44px rgba(0,0,0,.35);transform-origin:bottom right}'
  + '#fc-help-panel.fc-help-in{animation:fc-help-grow .22s ease-out}'
  + '@keyframes fc-help-grow{from{opacity:0;transform:scale(.18)}to{opacity:1;transform:scale(1)}}'
  + '@media (prefers-reduced-motion: reduce){#fc-help-launcher.fc-help-nudge{animation:none}#fc-help-panel.fc-help-in{animation:none}#fc-help-launcher.is-open{opacity:0;transform:none}}'
  + '#fc-help-panel h3{margin:0 0 8px;font-size:18px;color:#1a1710;padding-right:28px}'
  + '#fc-help-panel .fh-sent{font-size:15px;line-height:1.5;color:#1a1710;margin:0 0 14px}'
  + '#fc-help-panel .fh-x{position:absolute;top:14px;right:16px;background:none;border:0;color:#5f584a;font-size:18px;cursor:pointer}'
  + '#fc-help-panel .fh-act{display:inline-block;text-decoration:none}'
  + '#fc-help-panel .fh-more-btn{background:none;border:0;color:#5f584a;cursor:pointer;padding:0;margin:16px 0 0;font-size:13px;font-family:inherit}'
  + '#fc-help-panel .fh-more{margin-top:14px;border-top:1px solid #e6e0d2;padding-top:12px;display:none}'
  + '#fc-help-panel .fh-more.is-open{display:block}'
  + '#fc-help-panel .fh-path{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:13px;color:#5f584a}'
  + '#fc-help-panel .fh-path span{padding:3px 8px;border-radius:999px}'
  + '#fc-help-panel .fh-path .here{background:#f6f1e2;color:#1a1710;font-weight:600}'
  + '#fc-help-panel .fh-dot{color:#c4bba8}'
  + '#fc-help-panel .fh-more p{margin:0 0 8px;font-size:13.5px;line-height:1.5;color:#3a3426}'
  + '#fc-help-panel .fh-links{margin:12px 0 4px;font-size:13px;line-height:1.6}'
  + '#fc-help-panel .fh-links a{color:#1a1710}'
  + '#fc-help-panel .fh-hide{background:none;border:0;color:#5f584a;cursor:pointer;font-size:13px;font-family:inherit;margin-top:8px;padding:0}';

  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  var FIRST = {
    'index.html': { s: 'This trains four things you can practice: involvement, consistency, awareness, and nurturance.', a: 'Start your Profile', h: 'profile.html' },
    'login.html': { s: 'Welcome back. Pick up your plan.', a: 'Sign in', h: '#authEmail' },
    'profile.html': { s: 'Honest questions about your fathering. Nobody is grading you.', a: 'Begin', h: '#ks-start' },
    'report.html': { s: 'Your Keystone is yours. Strength, a focus, and the rest behind a fold.', a: 'Open your plan', h: 'plan.html' },
    'plan.html': { s: 'One next thing for this season, from the Profile you took.', a: 'Open your course', h: 'certificates.html' },
    'certificates.html': { s: 'Pick the course for this season. Films are open. A certificate needs a claimed seat.', a: 'Open a course', h: '.cert-card a, .cert-card' },
    'class.html': { s: 'One session: watch, checkpoint, practice. Passing unlocks the next.', a: 'Start this session', h: 'course.html' },
    'course.html': { s: 'Watch, then the checkpoint. One next step.', a: 'Play', h: '#player, [data-play], .btn-primary' },
    'enroll.html': { s: 'You can train now. The certificate waits on a claimed seat.', a: 'Watch the films', h: 'course.html' },
    'certificate.html': { s: 'Your name, the work, a serial anyone can check.', a: 'Copy the verification link', h: '#copy-verify, [data-copy], .btn-primary' },
    'verify.html': { s: 'Public proof: name, course, serial. Nothing else.', a: 'Send this link where it counts', h: '#vf, form' }
  };

  if (rh) {
    FIRST['returning-home.html'] = { s: 'Your trainings are open. Pick one and watch.', a: 'Start the trainings', h: 'rh-desk.html' };
    FIRST['rh-desk.html'] = { s: 'Start the training your report named. The other two stay open.', a: 'Start here', h: '.rh-film.is-start, .rh-film' };
    FIRST['rh-home.html'] = { s: 'This is your home. The report, the next session, and the work you have written.', a: 'Continue', h: '.rh-home-cont-go, .rh-home-row' };
    FIRST['profile.html'] = { s: 'This takes eight minutes. Then you know where you stand. Nobody is grading you.', a: 'Begin', h: '#ks-rh-begin' };
    FIRST['report.html'] = { s: 'This is where you stand. Start the training it named.', a: 'Start the training', h: '.btn-yellow, .rp-btn-yellow' };
    FIRST['login.html'] = { s: 'Sign in to keep your trainings and your report with you.', a: 'Sign in', h: '#authEmail' };
    FIRST['course.html'] = { s: 'Watch this session. Your trainings are still yours when you are done.', a: 'Play', h: '#player, [data-play], .btn-primary' };
    FIRST['privacy.html'] = { s: 'Your answers stay private. This page is the policy.', a: 'Back to your home', h: 'rh-home.html' };
    FIRST['account.html'] = { s: 'Your account. Sign out returns you to Returning Home.', a: 'Open your home', h: 'rh-home.html' };
  }

  function coursePage(){ return page.indexOf('course-') === 0; }
  var first = FIRST[page] || (rh
    ? (coursePage()
      ? { s: 'Watch this session. Your trainings are still yours when you are done.', a: 'Play', h: '#player, [data-play], .btn-primary' }
      : { s: 'This is your Returning Home path. Your home holds the work.', a: 'Open your home', h: 'rh-home.html' })
    : (coursePage()
      ? { s: 'One session: watch, checkpoint, practice. Passing unlocks the next.', a: 'Start this session', h: 'course.html' }
      : { s: 'This trains four things you can practice: involvement, consistency, awareness, and nurturance.', a: 'Start your Profile', h: 'profile.html' }));

  function pathHere(){
    if (rh) {
      if (page === 'course.html' || page.indexOf('course-') === 0 || page === 'rh-desk.html' || page === 'rh-home.html') return 2;
      if (page === 'report.html') return 1;
      if (page === 'profile.html' || page === 'returning-home.html') return 0;
      return -1;
    }
    if (page === 'course.html' || page === 'class.html' || page.indexOf('course-') === 0 || page === 'certificates.html' || page === 'enroll.html' || page === 'certificate.html') return 2;
    if (page === 'plan.html' || page === 'report.html') return 1;
    if (page === 'profile.html') return 0;
    return -1;
  }

  var MORE = rh ? [
    'The Profile is a short set of honest questions. You get a private report of where you stand.',
    'Your trainings are open. Start the one your report named, or pick another.',
    'Profile answers stay private. The four answers you write after a session are the proof your case worker can see.',
    'Being present from where you are is enough. Nobody has to walk through a door.',
    'Stuck? Use this guide, or read Privacy.'
  ] : [
    'This is free to you. Sponsors certify orgs and facilitators, not your seat.',
    'Your answers stay yours. Programs see group totals, never your scores.',
    'Checkpoints pass at eighty percent. Three tries an hour, then a pause.',
    'Practice never requires contact with your child, and never past a court order.',
    'The certificate is a public serial. Send the link. We certify the work.'
  ];

  var RH_LINKS = ''
    + '<p class="fh-links">'
    + '<a href="rh-home.html">Open your home</a> · '
    + '<a href="profile.html?start=quick&amp;path=rh">Start the Profile</a> · '
    + '<a href="privacy.html">Privacy</a>'
    + '</p>';

  var open = false, panel = null, moreOpen = false, btn = null;

  function actionHref(){
    if (!first.h) return rh ? 'rh-home.html' : 'profile.html';
    if (first.h.charAt(0) === '#' || first.h.charAt(0) === '.') return first.h;
    if (!rh && page === 'enroll.html') {
      var q = new URLSearchParams(location.search).get('cert');
      return q ? ('course.html?cert=' + encodeURIComponent(q)) : 'course.html';
    }
    return first.h;
  }

  function goAction(e){
    var h = actionHref();
    if (h.charAt(0) === '#' || h.indexOf('.') === 0) {
      if (e) e.preventDefault();
      var t = document.querySelector(h);
      if (t) {
        if (t.tagName === 'A' && t.getAttribute('href')) { location.href = t.getAttribute('href'); return; }
        t.scrollIntoView({ block: 'center' });
        if (t.focus) try { t.focus(); } catch (err) {}
      }
      close();
      return;
    }
  }

  function render(){
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.id = 'fc-help-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Guide');
    var here = pathHere();
    var steps = rh ? ['Profile', 'Report', 'Home'] : ['Profile', 'Plan', 'Course'];
    var path = steps.map(function(name, i){
      var cls = (i === here) ? ' here' : '';
      var sep = i < 2 ? '<span class="fh-dot" aria-hidden="true">·</span>' : '';
      return '<span class="'+cls.trim()+'">'+name+'</span>'+sep;
    }).join('');
    var moreHtml = MORE.map(function(p){ return '<p>'+p+'</p>'; }).join('');
    var href = actionHref();
    var act = (href.charAt(0) === '#' || href.charAt(0) === '.')
      ? '<button type="button" class="btn btn-primary btn-sm fh-act" data-fh-act>'+first.a+'</button>'
      : '<a class="btn btn-primary btn-sm fh-act" href="'+href+'">'+first.a+'</a>';
    panel.innerHTML = ''
      + '<button type="button" class="fh-x" aria-label="Close">×</button>'
      + '<p class="fh-sent">'+first.s+'</p>'
      + act
      + '<button type="button" class="fh-more-btn">More</button>'
      + '<div class="fh-more'+(moreOpen?' is-open':'')+'">'
      + '<div class="fh-path">'+path+'</div>'
      + moreHtml
      + (rh ? RH_LINKS : '')
      + '<button type="button" class="fh-hide">Close</button>'
      + '</div>';
    document.body.appendChild(panel);
    if (!reduced) panel.classList.add('fc-help-in');
    panel.querySelector('.fh-x').addEventListener('click', close);
    var hide = panel.querySelector('.fh-hide'); if (hide) hide.addEventListener('click', close);
    panel.querySelector('.fh-more-btn').addEventListener('click', function(){
      moreOpen = !moreOpen;
      var box = panel.querySelector('.fh-more');
      box.classList.toggle('is-open', moreOpen);
      this.textContent = moreOpen ? 'Less' : 'More';
    });
    var actBtn = panel.querySelector('[data-fh-act]');
    if (actBtn) actBtn.addEventListener('click', goAction);
  }

  function openSheet(){
    if (open) return;
    open = true;
    if (btn) btn.classList.add('is-open');
    render();
  }
  function close(){
    if (!open) return;
    open = false;
    moreOpen = false;
    if (panel) { panel.remove(); panel = null; }
    if (btn) btn.classList.remove('is-open');
  }
  function toggle(){ if (open) close(); else openSheet(); }

  btn = document.createElement('button');
  btn.id = 'fc-help-launcher';
  btn.type = 'button';
  btn.textContent = '?';
  btn.setAttribute('aria-label', 'Open the guide');
  btn.addEventListener('click', toggle);
  document.body.appendChild(btn);
  window.FCHelp = { show: function(){ openSheet(); } };

  document.addEventListener('keydown', function(e){
    if (e.key === '?' && !/input|textarea|select/i.test((e.target && e.target.tagName) || '')) { openSheet(); }
    if (e.key === 'Escape' && open) close();
  });

  try {
    if (page === 'index.html' && !localStorage.getItem('fc_help_seen')) {
      localStorage.setItem('fc_help_seen', '1');
      if (!reduced) setTimeout(function(){
        if (open || !btn) return;
        btn.classList.add('fc-help-nudge');
        setTimeout(function(){ btn.classList.remove('fc-help-nudge'); }, 800);
      }, 900);
    }
  } catch(e){}
})();
