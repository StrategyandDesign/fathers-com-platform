/* ============================================================
   Assessment Registry. The single source of truth that binds every assessment
   to its results report. Add an assessment here once and it is known everywhere:
   the runner that administers it, the report that renders its result, and the
   participant dashboard that displays it. No other file should hardcode which
   assessment a result belongs to.

   Each entry:
     slug        stable identifier. Also stored on the saved result
                 (keystone_results.assessment_slug) so a report is correlated to
                 the exact assessment that produced it, not guessed.
     kind        'father' | 'manhood' | 'authored' (a Studio-authored instrument).
     name        display name of the assessment.
     reportTitle title printed on the report cover.
     thesis      the one-line cover thesis for this assessment.
     dataGlobal  the window global holding the instrument structure the report
                 renders from (sections, scales, norms).
     resultTable / sessionTable  where a completed result and its session live.
     route       where to send a participant to take (or retake) it.

   Both Keystone instruments carry 26 scales across the same three sections, so a
   saved result cannot be told apart by shape. Identity therefore comes from the
   stored slug; detect() falls back to the father profile only for legacy results
   saved before slug tagging existed.
   ============================================================ */
(function(){
  window.FCReg = window.FCReg || {};

  var LIST = [
    {
      slug:'keystone-father-profile', kind:'father',
      name:'The Keystone Father Profile',
      reportTitle:'The Keystone Father Profile',
      thesis:'A mirror of how you father, and the one move that changes the most.',
      dataGlobal:'KEYSTONE',
      resultTable:'keystone_results', sessionTable:'keystone_sessions',
      route:'profile.html'
    },
    {
      slug:'keystone-manhood-profile', kind:'manhood',
      name:'The Keystone Manhood Profile',
      reportTitle:'The Keystone Manhood Profile',
      thesis:'A mirror of how you carry yourself, and the one move that changes the most.',
      dataGlobal:'KEYSTONE_MANHOOD',
      resultTable:'keystone_results', sessionTable:'keystone_sessions',
      route:'profile.html?track=manhood'
    }
  ];

  var BY_SLUG = {};
  LIST.forEach(function(a){ BY_SLUG[a.slug] = a; });

  FCReg.list   = function(){ return LIST.slice(); };
  FCReg.bySlug = function(s){ return (s && BY_SLUG[s]) || null; };
  FCReg.data   = function(a){ return a ? window[a.dataGlobal] : null; };
  FCReg.default = function(){ return BY_SLUG['keystone-father-profile']; };

  /* Resolve which assessment produced a stored result. Prefer the explicit slug
     saved on the result. Legacy results (saved before tagging) default to the
     father profile, since shape alone cannot distinguish the two Keystones. */
  FCReg.detect = function(result){
    var slug = result && (result.assessment_slug || result.slug);
    if(slug && BY_SLUG[slug]) return BY_SLUG[slug];
    return FCReg.default();
  };

  /* Resolve a partner's report configuration (branding + assessment set) by slug.
     Uses the get_org_report_config definer RPC, so an unlisted or private partner
     never leaks by slug. Returns null when there is no Supabase client, no such
     partner, or the caller may not see it; callers then fall back to the global
     report_branding row and the full catalog. Additive and inert until called. */
  FCReg.orgConfig = function(slug){
    var sb = (window.FC && FC.sb) || window.supabase || null;
    if(!sb || !slug) return Promise.resolve(null);
    return sb.rpc('get_org_report_config', { p_slug: slug }).then(function(r){
      return (r && r.data && r.data.length) ? r.data[0] : null;
    }).catch(function(){ return null; });
  };
})();
