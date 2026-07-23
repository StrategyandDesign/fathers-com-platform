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

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // Keep the hand-written descriptions: they are better marketing than anything
  // a course row carries. Matched by slug, with a sane fallback. Development and
  // waitlist sentences are stripped, because once a course is published the old
  // copy would contradict the card it sits on.
  var BLURB = {};
  grid.querySelectorAll('[data-cert]').forEach(function(el){
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
        '&hours=' + encodeURIComponent(c.hours == null ? '' : c.hours);
    var cta = done ? 'View your certificate &rarr;'
            : enrolled ? 'Continue where you left off &rarr;'
            : 'Start this course &rarr;';
    var pill = done ? '<span class="pill">Earned</span>'
             : enrolled ? '<span class="pill">In progress</span>'
             : '<span class="pill pill-court">Court-ready</span>';
    var hrs = (c.hours == null ? '' : '<span class="cert-card-hrs">' + esc(c.hours) + ' hrs</span>');
    var blurb = BLURB[c.slug] || 'Built on the Keystone framework. Verified hours, checkpoints, and a final assessment.';
    return '<a class="cert-card" href="' + href + '" data-cert="' + esc(c.slug) + '">' +
      '<div class="cert-card-top">' + pill + hrs + '</div>' +
      '<h3>' + esc(c.title || c.slug) + '</h3>' +
      '<p>' + blurb + '</p>' +
      '<div class="cert-card-foot"><span class="mono">Free</span>' +
      '<span class="cert-card-go">' + cta + '</span></div></a>';
  }

  function paint(courses, states){
    if(!courses || !courses.length) return;          // keep the static page
    var byCourse = {};
    (states || []).forEach(function(e){ byCourse[e.course_id] = e; });
    grid.innerHTML = courses.map(function(c){ return card(c, byCourse[c.id]); }).join('');
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
