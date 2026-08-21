/* The course catalog, made live.

   THE PROBLEM THIS FIXES
   The courses page was static HTML with one hardcoded slug. A course authored in
   Studio never appeared here, so a man could not find it and could not enrol.
   The two "in development" cards were also permanent: they stayed in development
   even after the course existed. And nothing on the page told a man whether he
   was already enrolled, so a returning man saw "Start this course" on a course
   he was halfway through.

   HOW IT WORKS
   On load, read the published courses. If there are none, leave the static
   marketing cards exactly as they are, so the page never degrades. If there are
   some, render them as the real catalog with each man's actual state:
     not enrolled  -> Start this course
     enrolled      -> Continue where you left off
     complete      -> Certificate earned
   Unpublished courses never appear. */
(function(){
  var grid = document.getElementById('tracks');
  if(!grid) return;
  window.__fcHours = {fundamentals:'1.1', reentry:'2.4', anger:'2.4', coparenting:'2.4', manhood:'6.0'};

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // Keep the hand-written descriptions: they are better marketing than anything
  // a course row carries. Matched by slug, with a sane fallback. Development and
  // waitlist sentences are stripped, because once a course is published the old
  // copy would contradict the card it sits on.
  var BLURB = {};
  var STATIC_HTML = {};
  var STATIC_ORDER = [];
  grid.querySelectorAll('[data-cert]').forEach(function(el){
    var slug = el.getAttribute('data-cert');
    STATIC_HTML[slug] = el.outerHTML;
    STATIC_ORDER.push(slug);
    var p = el.querySelector('p');
    if(!p) return;
    var text = p.innerHTML
      .split(/(?<=\.)\s+/)
      .filter(function(sentence){ return !/in development|waitlist/i.test(sentence); })
      .join(' ')
      .trim();
    BLURB[el.getAttribute('data-cert')] = text;
  });

  function card(c, state){
    var enrolled = state && state.state && state.state !== 'not_enrolled';
    var done = state && (state.state === 'complete' || state.state === 'approved');
    var href = enrolled
      ? 'course.html?cert=' + encodeURIComponent(c.slug)
      : 'enroll.html?cert=' + encodeURIComponent(c.slug) +
        '&title=' + encodeURIComponent(c.title || '') +
        '&hours=' + encodeURIComponent((window.__fcHours && window.__fcHours[c.slug]) || (c.hours == null ? '' : c.hours));
    var cta = done ? 'View your certificate &rarr;'
            : enrolled ? 'Continue where you left off &rarr;'
            : 'Start this course &rarr;';
    var pill = done ? '<span class="pill">Earned</span>'
             : enrolled ? '<span class="pill">In progress</span>'
             : '<span class="pill">Sessions live</span>';
    // The platform is the source of truth for hours and session counts while
    // the database catches up. Slugs match the static data-cert values.
    var HOURS = {fundamentals:'1.1', reentry:'2.4', anger:'2.4', coparenting:'2.4', manhood:'6.0'};
    var SESSIONS = {fundamentals:8, reentry:12, anger:12, coparenting:12, manhood:6};
    var shownHours = HOURS[c.slug] != null ? HOURS[c.slug] : c.hours;
    var sessN = SESSIONS[c.slug];
    var hrs = (sessN != null
      ? '<span class="cert-card-hrs">' + sessN + ' sessions</span>'
      : (shownHours == null ? '' : '<span class="cert-card-hrs">' + esc(shownHours) + ' hrs film</span>'));
    var blurb = BLURB[c.slug] || 'Built on the Keystone framework. Sessions logged, checkpoints, and a final assessment.';
    var footMeta = 'Free';
    if(sessN) footMeta += ' &middot; ' + sessN + ' sessions';
    if(shownHours != null && shownHours !== '') footMeta += ' &middot; ~' + esc(shownHours) + ' hrs film';
    return '<a class="cert-card" href="' + href + '" data-motion="fade-up" data-cert="' + esc(c.slug) + '">' +
      '<div class="cert-card-top">' + pill + hrs + '</div>' +
      '<h3>' + esc(c.title || c.slug) + '</h3>' +
      '<p>' + blurb + '</p>' +
      '<div class="cert-card-foot"><span class="mono">' + footMeta + '</span>' +
      '<span class="cert-card-go">' + cta + '</span></div></a>';
  }

  function paint(courses, states){
    if(!courses || !courses.length) return;          // keep the static page
    var byCourse = {};
    (states || []).forEach(function(e){ byCourse[e.course_id] = e; });
    var bySlug = {};
    courses.forEach(function(c){ bySlug[c.slug] = c; });
    var out = [];
    // Static order rules the page. A course the database knows becomes a live
    // card with the man's real state; a course it does not know yet keeps its
    // static card, so the catalog never loses a course while the data catches up.
    STATIC_ORDER.forEach(function(slug){
      if(bySlug[slug]){ out.push(card(bySlug[slug], byCourse[bySlug[slug].id])); delete bySlug[slug]; }
      else if(STATIC_HTML[slug]){ out.push(STATIC_HTML[slug]); }
    });
    Object.keys(bySlug).forEach(function(slug){ out.push(card(bySlug[slug], byCourse[bySlug[slug].id])); });
    grid.innerHTML = out.join('');
    // Re-run fade-ups if motion already booted before catalog swapped cards.
    try {
      if (window.anime && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        var fresh = grid.querySelectorAll('[data-motion="fade-up"]');
        if (fresh.length) {
          fresh.forEach(function(el){ el.style.opacity = '0'; });
          window.anime({ targets: fresh, opacity: [0, 1], translateY: [12, 0], duration: 700, delay: window.anime.stagger(70), easing: 'easeOutCubic' });
        }
      }
    } catch (e) {}

  }

  function boot(){
    if(!(window.FC && FC.live && FC.sb)) return;      // demo mode: static page stands
    FC.ready.then(function(){
      FC.sb.from('certificate_courses')
        .select('id,slug,title,hours,published')
        .eq('published', true)
        .order('title')
        .then(function(r){
          if(r.error || !r.data || !r.data.length) return;
          var courses = r.data;
          var uid = FC.uid && FC.uid();
          if(!uid) return paint(courses, []);
          FC.sb.from('certificate_enrollments')
            .select('course_id,state').eq('user_id', uid)
            .then(function(e){ paint(courses, (e && e.data) || []); },
                  function(){ paint(courses, []); });
        }, function(){});
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
