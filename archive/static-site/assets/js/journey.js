/* ============================================================
   FCJourney. The participant's path, rendered as one component.

   The platform has four participant stages and they were previously only
   connected by hand-placed links on individual pages. Nothing told a man the
   stages were one system or where he stood inside it. This renders that path
   in a single place so the vocabulary and the order cannot drift again.

     Profile  ->  Report  ->  Plan  ->  Courses
     Returning Home: Profile -> Report -> Trainings

   The dashboard is not a stage. It is the home that holds all four, so the
   rail renders there with no current step and acts as a directory.

   Usage, either one:
     FCJourney.html({current:'report', slug:'...', done:['profile']})
     <div data-journey="plan" data-journey-done="profile"></div>

   The assessment slug is carried through every stage link so a man holding
   two profiles stays on the one he is reading rather than the newest.
   ============================================================ */
(function(){
  var STAGES = [
    { key:'profile',  label:'Profile',  href:'profile.html',      carries:true  },
    { key:'report',   label:'Report',   href:'report.html',       carries:true  },
    { key:'plan',     label:'Plan',     href:'plan.html',         carries:true  },
    { key:'courses',  label:'Courses',  href:'certificates.html', carries:false }
  ];
  var RH_STAGES = [
    { key:'profile',  label:'Profile',  href:'profile.html?start=quick&path=rh', carries:true  },
    { key:'report',   label:'Report',   href:'report.html',                      carries:true  },
    { key:'courses',  label:'Home', href:'rh-home.html',                         carries:false }
  ];
  function stages(){
    return (window.FCPath && FCPath.isRH()) ? RH_STAGES : STAGES;
  }

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function slugFromUrl(){
    try {
      var m = /[?&]assessment=([^&]+)/.exec(window.location.search);
      return m ? decodeURIComponent(m[1]) : null;
    } catch(e){ return null; }
  }

  function html(opts){
    opts = opts || {};
    var current = opts.current || '';
    var slug    = opts.slug || null;
    var done    = opts.done || [];
    var q       = slug ? '?assessment=' + encodeURIComponent(slug) : '';

    var items = stages().map(function(st, i){
      var isCurrent = st.key === current;
      var isDone    = done.indexOf(st.key) !== -1 && !isCurrent;
      var cls = 'fcj-step' + (isCurrent ? ' fcj-step-here' : '') + (isDone ? ' fcj-step-done' : '');
      var href = st.href + (st.carries ? q : '');
      /* The current step stays a link. A man re-reading the page he is on is
         harmless, and a dead element in a row of links reads as broken. */
      return '<li class="' + cls + '">' +
        '<a href="' + esc(href) + '"' + (isCurrent ? ' aria-current="step"' : '') + '>' +
          '<span class="fcj-n" aria-hidden="true">' + (isDone ? '&#10003;' : (i + 1)) + '</span>' +
          '<span class="fcj-l">' + esc(st.label) + '</span>' +
        '</a></li>';
    }).join('');

    return '<nav class="fcj rp-noprint" aria-label="Your path">' +
      '<ol class="fcj-row">' + items + '</ol></nav>';
  }

  function mount(el){
    if(!el) return;
    var done = (el.getAttribute('data-journey-done') || '')
      .split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    el.innerHTML = html({
      current: el.getAttribute('data-journey') || '',
      slug:    el.getAttribute('data-journey-slug') || slugFromUrl(),
      done:    done
    });
  }

  function mountAll(){
    document.querySelectorAll('[data-journey]').forEach(mount);
  }

  window.FCJourney = { html: html, mount: mount, mountAll: mountAll, stages: STAGES, rhStages: RH_STAGES };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
})();
