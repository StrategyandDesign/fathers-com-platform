/* ============================================================
   Live instrument runner. When a published instrument exists,
   the Keystone page renders IT (authored items, scales, domains,
   weights, bands) and scores with the authored formula, writing
   an immutable response. Falls back to the demo engine otherwise.
   ============================================================ */
window.FCI = window.FCI || {};
(function(){
  FCI.loadPublished = function(slug){
    if(!(window.FC && FC.live)) return Promise.resolve(null);
    return FC.ready.then(function(){
      var q = FC.sb.from('instruments').select('*').eq('status','published');
      q = slug ? q.eq('slug',slug) : q.order('published_at',{ascending:false});
      return q.limit(1).maybeSingle().then(function(r){
        if(!r.data) return null;
        var ins = r.data;
        return Promise.all([
          FC.sb.from('instrument_domains').select('*').eq('instrument_id',ins.id).order('sort'),
          FC.sb.from('instrument_items').select('*').eq('instrument_id',ins.id).order('sort'),
          FC.sb.from('instrument_bands').select('*').eq('instrument_id',ins.id).order('min_score')
        ]).then(function(res){
          return { instrument: ins, domains: res[0].data||[], items: res[1].data||[], bands: res[2].data||[] };
        });
      });
    });
  };

  // Normalize a raw response to 0..100 for an item based on its scale + reverse flag.
  function norm(item, raw){
    var max = item.kind==='likert7'?6 : item.kind==='binary'?1 : 4; // 0-indexed maxima
    var v = item.reverse ? (max - raw) : raw;
    return (v / max) * 100;
  }

  FCI.score = function(bundle, answers){
    // answers: {item_id: rawValue(0-indexed)}
    var domScores = {};
    bundle.domains.forEach(function(d){
      var items = bundle.items.filter(function(it){ return it.domain_id===d.id; });
      var wsum=0, acc=0;
      items.forEach(function(it){
        if(answers[it.id]==null) return;
        var w = parseFloat(it.weight)||1;
        acc += norm(it, answers[it.id]) * w; wsum += w;
      });
      domScores[d.key] = wsum ? Math.round(acc/wsum) : 0;
    });
    // overall by instrument.scoring
    var overall, dks=bundle.domains;
    if(bundle.instrument.scoring==='sum'){
      overall = Object.keys(domScores).reduce(function(a,k){return a+domScores[k];},0);
    } else {
      var wsum=0, acc=0;
      dks.forEach(function(d){ var w=parseFloat(d.weight)||1; acc += (domScores[d.key]||0)*w; wsum+=w; });
      overall = wsum ? Math.round(acc/wsum) : 0;
    }
    // gap = lowest domain
    var gap=null, lo=Infinity;
    Object.keys(domScores).forEach(function(k){ if(domScores[k]<lo){lo=domScores[k];gap=k;} });
    // band
    var band = bundle.bands.find(function(b){ return overall>=b.min_score && overall<=b.max_score; });
    return { domScores: domScores, overall: overall, gap: gap, band: band };
  };

  FCI.saveResponse = function(bundle, answers, scored){
    if(!(window.FC && FC.live && FC.uid())) return Promise.resolve(null);
    return FC.sb.from('instrument_responses').insert({
      instrument_id: bundle.instrument.id, instrument_version: bundle.instrument.version,
      user_id: FC.uid(), overall: scored.overall, domain_scores: scored.domScores, gap_domain: scored.gap
    }).select().single().then(function(r){
      if(r.error) throw r.error;
      var rows = Object.keys(answers).map(function(iid){ return { response_id: r.data.id, item_id: iid, raw_value: answers[iid] }; });
      return rows.length ? FC.sb.from('instrument_answers').insert(rows) : r;
    });
  };
})();
