/* ============================================================
   Keystone Father Profile: full 130-item, 3-section engine.
   - Two modes: all_at_once, by_section
   - Resumable: every answer saves immediately; reload resumes
   - Scored against published norms (mean, SD) -> z -> percentile band
   - Reverse-scores negatively-worded scales
   Requires: FC (supabase-client), window.KEYSTONE (the instrument JSON)
   ============================================================ */
window.KS = window.KS || {};
(function(){
  var INS = null;          // instrument definition
  var session = null;      // current session row
  var answers = {};        // item_key -> value (in memory mirror)
  var flatItems = [];      // ordered list of {key, section, scale, prompt, kind, labels}
  var mode = 'by_section';
  var path = 'father';     // 'father' = full instrument; 'preparing' = childhood + readiness only

  // Which scales a non-father ('preparing') can honestly answer.
  // Childhood Satisfaction is about HIS OWN upbringing - every man can answer it.
  var PREPARING_SCALES = ['childhood_satisfaction'];

  // ---------- load instrument JSON ----------
  KS.init = function(instrument){
    INS = instrument;
    flatItems = [];
    INS.sections.forEach(function(sec){
      sec.scales.forEach(function(sc){
        sc.items.forEach(function(prompt, idx){
          flatItems.push({
            key: sec.key + '.' + sc.key + '.' + idx,
            section: sec.key, sectionTitle: sec.title, instruction: sec.instruction,
            scale: sc.key, scaleLabel: sc.label,
            prompt: prompt, kind: sec.scale.kind, labels: sec.scale.labels
          });
        });
      });
    });
    return flatItems.length;
  };

  KS.setPath = function(p){ path = p; };
  KS.getPath = function(){ return path; };
  KS.isPreparing = function(){ return path === 'preparing'; };

  // items for the current path. Fathers get everything; preparing men get only answerable scales.
  KS.pathItems = function(){
    if(path === 'father') return flatItems;
    return flatItems.filter(function(f){ return PREPARING_SCALES.indexOf(f.scale) >= 0; });
  };
  KS.pathSectionKeys = function(){
    if(path === 'father') return INS.sections.map(function(s){return s.key;});
    // preparing: only sections that contain a preparing scale
    var keys = [];
    INS.sections.forEach(function(sec){
      if(sec.scales.some(function(sc){ return PREPARING_SCALES.indexOf(sc.key)>=0; })) keys.push(sec.key);
    });
    return keys;
  };

  KS.itemsInSection = function(secKey){
    var items = flatItems.filter(function(f){return f.section===secKey;});
    if(path === 'preparing') items = items.filter(function(f){ return PREPARING_SCALES.indexOf(f.scale)>=0; });
    return items;
  };
  KS.sectionKeys = function(){ return INS.sections.map(function(s){return s.key;}); };
  KS.sectionMeta = function(secKey){ return INS.sections.find(function(s){return s.key===secKey;}); };

  // ---------- session lifecycle (Supabase) ----------
  KS.resumeOrStart = function(chosenMode){
    mode = chosenMode || 'by_section';
    if(!(window.FC && FC.live && FC.uid())) return Promise.resolve({demo:true});
    return FC.sb.from('keystone_sessions').select('*')
      .eq('user_id', FC.uid()).eq('status','in_progress').eq('path', path)
      .order('updated_at',{ascending:false}).limit(1).maybeSingle()
      .then(function(r){
        if(r.data){ session = r.data; mode = session.mode; path = session.path || 'father'; return KS.loadAnswers(); }
        var _row = {
          user_id: FC.uid(), mode: mode, path: path, status:'in_progress',
          current_section: KS.pathSectionKeys()[0], sections_done: []
        };
        try{ var _tag=JSON.parse(localStorage.getItem('fc_org_tag')||'null');
          if(_tag){ _row.organization_id=_tag.organization_id||null; _row.program_id=_tag.program_id||null; _row.cohort_id=_tag.cohort_id||null; }
        }catch(_){}
        return FC.sb.from('keystone_sessions').insert(_row).select().single().then(function(r2){ session = r2.data; return {}; });
      });
  };

  KS.loadAnswers = function(){
    return FC.sb.from('keystone_answers').select('item_key,value').eq('session_id', session.id)
      .then(function(r){ (r.data||[]).forEach(function(a){ answers[a.item_key]=a.value; }); return {}; });
  };

  KS.saveAnswer = function(key, value){
    answers[key] = value;
    // Always mirror progress locally so a signed-out man can save-and-return without losing work.
    KS.persistLocal();
    if(!(window.FC && FC.live && FC.uid() && session)) return Promise.resolve();
    return FC.sb.from('keystone_answers').upsert({
      session_id: session.id, user_id: FC.uid(), item_key: key, value: value,
      answered_at: new Date().toISOString()
    }, {onConflict:'session_id,item_key'});
  };

  // Save the in-progress assessment to the browser (answers, path, sections done).
  KS.persistLocal = function(){
    try {
      localStorage.setItem('fc_inprogress', JSON.stringify({
        answers: answers, path: path,
        sectionsDone: (session && session.sections_done) || [],
        at: Date.now()
      }));
    } catch(e){}
  };

  // Restore an in-progress assessment from the browser (used on return before sign-in completes).
  KS.restoreLocal = function(){
    try {
      var raw = localStorage.getItem('fc_inprogress');
      if(!raw) return false;
      var st = JSON.parse(raw);
      if(!st || !st.answers) return false;
      answers = st.answers;
      if(st.path) path = st.path;
      return st;
    } catch(e){ return false; }
  };

  KS.clearLocal = function(){ try { localStorage.removeItem('fc_inprogress'); } catch(e){} };

  KS.markSectionDone = function(secKey, nextKey){
    // Track section completion even without a live session (signed-out demo),
    // so the runner can terminate and reach the finish screen.
    if(!session) session = { sections_done: [] };
    var done = (session.sections_done||[]).slice();
    if(done.indexOf(secKey)<0) done.push(secKey);
    session.sections_done = done;
    if(!(window.FC && FC.live && FC.uid() && session.id)) return Promise.resolve();
    return FC.sb.from('keystone_sessions').update({
      sections_done: done, current_section: nextKey || secKey
    }).eq('id', session.id);
  };

  KS.answeredCount = function(secKey){
    var items = secKey ? KS.itemsInSection(secKey) : flatItems;
    return items.filter(function(f){ return answers[f.key]!=null; }).length;
  };
  KS.totalCount = function(secKey){ return (secKey ? KS.itemsInSection(secKey) : flatItems).length; };
  KS.sectionsDone = function(){ return (session && session.sections_done) || []; };
  KS.getMode = function(){ return mode; };
  KS.getAnswers = function(){ return answers; };

  // ---------- scoring against norms ----------
  // For each scale: sum raw items (reverse where flagged), compute z vs (mean, sd),
  // convert z to a 0-100 percentile-style score. Overall = mean of scale percentiles.
  function pctFromZ(z){
    // normal CDF approximation (Abramowitz-Stegun), returns 0..100
    var t = 1/(1+0.2316419*Math.abs(z));
    var d = 0.3989423*Math.exp(-z*z/2);
    var p = d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
    p = z>0 ? 1-p : p;
    return Math.round(p*100);
  }
  function bandFor(pct){
    if(pct>=85) return {key:'strong', label:'Strong'};
    if(pct>=60) return {key:'solid', label:'Solid'};
    if(pct>=40) return {key:'developing', label:'Developing'};
    if(pct>=15) return {key:'building', label:'Building'};
    return {key:'starting', label:'A starting point'};
  }
  KS.bandFor = bandFor;

  KS.score = function(){
    var scaleScores = {}, sectionSums = {}, allPcts = [];
    INS.sections.forEach(function(sec){
      var secPcts = [];
      sec.scales.forEach(function(sc){
        var raw = 0, n = 0;
        sc.items.forEach(function(prompt, idx){
          var v = answers[sec.key+'.'+sc.key+'.'+idx];
          if(v==null) return;
          // reverse-score: negatively worded scales/items. Max depends on scale kind.
          var max = sec.scale.kind==='likert7' ? 7 : 5;
          if(sc.reverse) v = (max+1) - v;
          raw += v; n++;
        });
        if(n===0){ scaleScores[sc.key] = {raw:0, pct:0, band:bandFor(0), label:sc.label, section:sec.key}; return; }
        // scale to full item count if partially answered (keeps comparability to norm sum)
        var fullRaw = raw * (sc.items.length / n);
        var pct;
        if(sc.sd){
          // Norm-referenced: where he stands against the published norm group.
          pct = pctFromZ((fullRaw - sc.mean) / sc.sd);
        } else {
          // No norms published for this instrument. Score criterion-referenced:
          // where he placed himself along the scale's own range. Previously this
          // branch produced z=0 for every scale, which meant every man scored
          // exactly 50 on all 26 scales and strength and gap were arbitrary ties.
          // This is a different claim from a percentile and the report says so.
          var mx = sec.scale.kind==='likert7' ? 7 : 5;
          var lo = sc.items.length, hi = sc.items.length * mx;
          pct = Math.round(((fullRaw - lo) / (hi - lo)) * 100);
          pct = Math.max(0, Math.min(100, pct));
        }
        scaleScores[sc.key] = {raw: Math.round(fullRaw), pct: pct, band: bandFor(pct), label: sc.label, section: sec.key, mean: sc.mean};
        secPcts.push(pct); allPcts.push(pct);
      });
      sectionSums[sec.key] = secPcts.length ? Math.round(secPcts.reduce(function(a,b){return a+b;},0)/secPcts.length) : 0;
    });
    var overall = allPcts.length ? Math.round(allPcts.reduce(function(a,b){return a+b;},0)/allPcts.length) : 0;
    // gap = lowest, strength = highest, chosen only among scales the man actually answered
    var gap=null, gapV=Infinity, str=null, strV=-1;
    Object.keys(scaleScores).forEach(function(k){
      if(scaleScores[k].raw===0 && scaleScores[k].pct===0 && scaleScores[k].mean==null) return; // unanswered
      var p = scaleScores[k].pct;
      if(p<gapV){gapV=p;gap=k;}
      if(p>strV){strV=p;str=k;}
    });
    if(!str){ var ks=Object.keys(scaleScores); str=ks[0]; gap=ks[0]; }
    return { overall: overall, sections: sectionSums, scales: scaleScores, gap: gap, strength: str };
  };

  KS.saveResult = function(scored){
    if(!(window.FC && FC.live && FC.uid() && session)) return Promise.resolve({demo:true});
    return FC.sb.from('keystone_results').insert({
      session_id: session.id, user_id: FC.uid(),
      // Which instrument produced this. Without it the report falls back to the
      // father profile, which is how a manhood result used to render as a
      // father report. Identity on the row, never inferred from shape.
      assessment_slug: (INS && INS.slug) || 'keystone-father-profile',
      overall_pct: scored.overall, section_scores: scored.sections,
      scale_scores: scored.scales, gap_scale: scored.gap, strength_scale: scored.strength
    }).then(function(){
      return FC.sb.from('keystone_sessions').update({
        status:'completed', completed_at:new Date().toISOString()
      }).eq('id', session.id);
    });
  };
})();
