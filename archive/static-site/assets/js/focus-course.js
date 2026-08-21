/* Map a Keystone growth focus to the film course that trains it.
   Used by Plan and Dashboard so a man always sees ONE recommended next course
   matched to his gap, not a cold catalog. */
(function(){
  var BY_FOCUS = {
    involvement: {
      slug: 'reentry',
      title: 'Coming Home Present',
      sessions: 12,
      href: 'course-coming-home-present.html',
      enroll: 'enroll.html?cert=reentry&title=Coming%20Home%20Present&hours=2.4',
      photo: 'assets/img/photos/hero-02.jpg',
      line: 'Presence after time away. Twelve short film sessions (~12 min each), with a facilitator for questions.',
      minutes: 12
    },
    consistency: {
      slug: 'anger',
      title: 'Steady Under Pressure',
      sessions: 12,
      href: 'course-steady-under-pressure.html',
      enroll: 'enroll.html?cert=anger&title=Steady%20Under%20Pressure&hours=2.4',
      photo: 'assets/img/photos/hero-04.jpg',
      line: 'Steadiness when the moments get loud. Twelve short film sessions (~12 min each) with checkpoints that prove the work.',
      minutes: 12
    },
    awareness: {
      slug: 'fundamentals',
      title: 'Fathering Fundamentals',
      sessions: 9,
      href: 'course-fathering-fundamentals.html',
      enroll: 'enroll.html?cert=fundamentals&title=Fathering%20Fundamentals&hours=1.1',
      photo: 'assets/img/photos/hero-01.jpg',
      line: 'See your child clearly. Dr. Canfield\'s Seven Secrets flagship film course (~1.1 hrs). Nine sessions with checkpoints.'
    },
    nurturance: {
      slug: 'coparenting',
      title: 'Same Team',
      sessions: 12,
      href: 'course-same-team.html',
      enroll: 'enroll.html?cert=coparenting&title=Same%20Team&hours=2.4',
      photo: 'assets/img/photos/hero-06.jpg',
      line: 'Warmth they can feel, and one team around the children. Twelve short film sessions (~12 min each).',
      minutes: 12
    }
  };

  var FALLBACK = {
    slug: 'fundamentals',
    title: 'Fathering Fundamentals',
    sessions: 9,
    href: 'course-fathering-fundamentals.html',
    enroll: 'enroll.html?cert=fundamentals&title=Fathering%20Fundamentals&hours=1.1',
    photo: 'assets/img/photos/hero-01.jpg',
    line: 'The Seven Secrets flagship film course (~1.1 hrs). Presence first. Free to every man who does the work.'
  };

  function normalize(key){
    key = String(key || '').toLowerCase();
    if(BY_FOCUS[key]) return key;
    // scale keys sometimes arrive as longer ids
    if(key.indexOf('involv') >= 0) return 'involvement';
    if(key.indexOf('consist') >= 0) return 'consistency';
    if(key.indexOf('aware') >= 0) return 'awareness';
    if(key.indexOf('nurtur') >= 0) return 'nurturance';
    return null;
  }

  function forFocus(focusKey){
    var k = normalize(focusKey);
    var c = (k && BY_FOCUS[k]) || FALLBACK;
    // shallow copy so callers can annotate
    return {
      slug: c.slug, title: c.title, sessions: c.sessions,
      href: c.href, enroll: c.enroll, photo: c.photo, line: c.line,
      minutes: c.minutes || null,
      focusKey: k || 'fundamentals'
    };
  }

  function cardHtml(course, opts){
    opts = opts || {};
    var esc = opts.esc || function(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); };
    var kicker = opts.kicker || 'YOUR NEXT COURSE';
    var focusLabel = opts.focusLabel || '';
    var cta = opts.cta || 'See the course';
    var href = opts.href || course.href;
    try {
      if (new URLSearchParams(location.search).get('demo') === '1' && course.slug) {
        href = 'course.html?demo=1&cert=' + encodeURIComponent(course.slug);
      }
    } catch (e) {}
    return '<div class="pl-train">'+
      '<div class="pl-train-media"><img src="'+esc(course.photo)+'" alt=""></div>'+
      '<div class="pl-train-body">'+
        '<div class="eyebrow brass" style="margin-bottom:10px">'+esc(kicker)+'</div>'+
        (focusLabel ? '<p class="fine ash" style="margin:0 0 8px">Matched to your focus: <b style="color:inherit">'+esc(focusLabel)+'</b></p>' : '')+
        '<h2 class="pl-train-title">'+esc(course.title)+'</h2>'+
        '<p class="pl-train-line">'+esc(course.line)+'</p>'+
        '<div class="pl-train-meta"><span class="fine mono">'+esc(String(course.sessions))+' sessions</span>'+(course.minutes?'<span class="fine ash">&middot;</span><span class="fine mono">~'+esc(String(course.minutes))+' min each</span>':'')+'<span class="fine ash">&middot;</span><span class="fine mono">Facilitator-supported</span><span class="fine ash">&middot;</span><span class="fine mono">Free</span></div>'+
        '<div class="pl-train-cta">'+
          '<a class="btn btn-yellow" href="'+esc(href)+'">'+esc(cta)+'</a>'+
          '<a class="link ash" href="certificates.html" style="font-size:13px">Browse all courses</a>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  window.FCFocusCourse = { forFocus: forFocus, cardHtml: cardHtml, byFocus: BY_FOCUS };
})();
