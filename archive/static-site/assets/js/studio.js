/* Studio: course-builder + assessment instrument builder. Author = instructor/admin. */
(function(){
  var demo = !(window.FC && FC.live);
  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function boot(){
    if(demo){ el('demo-note').style.display=''; el('app').style.display='';
      el('instr-list').innerHTML='<p class="fine">Same here. Build an instrument to see items, scales, domains, and weights.</p>';
      brandingInit(true);
      loadCourses();
      return; }
    FCR.guard(['instructor','admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display=''; loadCourses(); loadInstruments(); brandingInit(false);
    });
  }

  /* ------------- REPORT BRANDING -------------
     The whole creator surface for the participant report: two logos and the
     highlight colors. Nothing else is editable, by design. RLS enforces the
     same boundary server-side (instructor/admin only). */
  function brandingInit(isDemo){
    var card = el('rb-card'); if(!card) return;
    var prev = {1:el('rb-prev1'), 2:el('rb-prev2')};
    var empty = {1:el('rb-empty1'), 2:el('rb-empty2')};
    var files = {1:el('rb-logo1'), 2:el('rb-logo2')};
    var clears = {1:el('rb-clear1'), 2:el('rb-clear2')};
    var accent = el('rb-accent'), accent2 = el('rb-accent2');
    var save = el('rb-save'), msg = el('rb-msg');
    var state = { logo_primary:null, logo_secondary:null, photo_dimensions:null, photo_practices:null, photo_satisfaction:null, photo_cover:null, photo_footer:null };

    function show(n, dataUrl){
      if(dataUrl){ prev[n].src = dataUrl; prev[n].style.display=''; empty[n].style.display='none'; }
      else { prev[n].removeAttribute('src'); prev[n].style.display='none'; empty[n].style.display=''; }
    }
    function wire(n, field){
      files[n].addEventListener('change', function(){
        var f = files[n].files && files[n].files[0]; if(!f) return;
        if(f.size > 300*1024){ msg.textContent='That file is over 300 KB. Export it smaller and try again.'; files[n].value=''; return; }
        var rd = new FileReader();
        rd.onload = function(){ state[field] = rd.result; show(n, rd.result); msg.textContent=''; };
        rd.readAsDataURL(f);
      });
      clears[n].addEventListener('click', function(){ state[field]=''; files[n].value=''; show(n, null); });
    }
    wire(1,'logo_primary'); wire(2,'logo_secondary');

    var pmap = {dim:'photo_dimensions', prac:'photo_practices', sat:'photo_satisfaction', cover:'photo_cover', footer:'photo_footer'};
    var pprev = {dim:el('rb-pprev-dim'), prac:el('rb-pprev-prac'), sat:el('rb-pprev-sat'), cover:el('rb-pprev-cover'), footer:el('rb-pprev-footer')};
    var pempty = {dim:el('rb-pempty-dim'), prac:el('rb-pempty-prac'), sat:el('rb-pempty-sat'), cover:el('rb-pempty-cover'), footer:el('rb-pempty-footer')};
    var pfiles = {dim:el('rb-photo-dim'), prac:el('rb-photo-prac'), sat:el('rb-photo-sat'), cover:el('rb-photo-cover'), footer:el('rb-photo-footer')};
    var pclear = {dim:el('rb-pclear-dim'), prac:el('rb-pclear-prac'), sat:el('rb-pclear-sat'), cover:el('rb-pclear-cover'), footer:el('rb-pclear-footer')};
    function showP(k, url){
      if(!pprev[k]) return;
      if(url){ pprev[k].src=url; pprev[k].style.display=''; pempty[k].style.display='none'; }
      else { pprev[k].removeAttribute('src'); pprev[k].style.display='none'; pempty[k].style.display=''; }
    }
    function wireP(k){
      if(!pfiles[k]) return;
      pfiles[k].addEventListener('change', function(){
        var f = pfiles[k].files && pfiles[k].files[0]; if(!f) return;
        if(f.size > 500*1024){ msg.textContent='That image is over 500 KB. Export it smaller and try again.'; pfiles[k].value=''; return; }
        var rd = new FileReader();
        rd.onload = function(){ state[pmap[k]] = rd.result; showP(k, rd.result); msg.textContent=''; };
        rd.readAsDataURL(f);
      });
      pclear[k].addEventListener('click', function(){ state[pmap[k]]=''; pfiles[k].value=''; showP(k, null); });
    }
    wireP('dim'); wireP('prac'); wireP('sat'); wireP('cover'); wireP('footer');

    if(isDemo){
      save.disabled = true;
      msg.textContent = 'Demo mode. Connect Supabase keys and branding saves live.';
      return;
    }
    /* Branding follows the assessment. A creator picks which report he is
       styling; the default applies to any assessment without its own. Before
       this there was one global row, so styling one report styled them all. */
    var brandSlug = null;   // assessment slug, or null for the default row
    var brandOrg  = null;   // org id when styling a partner's report
    function loadBranding(){
      if(brandOrg){
        FC.sb.from('org_branding').select('*').eq('org_id', brandOrg).maybeSingle()
          .then(function(r){ paintBranding((r && r.data) || {}); }, function(){ paintBranding({}); });
        return;
      }
      FC.sb.from('report_branding').select('*').then(function(r){
        var rows = (r && r.data) || [];
        var b = null;
        for(var i=0;i<rows.length;i++){
          if(brandSlug ? rows[i].assessment_slug === brandSlug : !rows[i].assessment_slug) b = rows[i];
        }
        paintBranding(b || {});
      }, function(){});
    }
    /* Colours the panel falls back to when a scope has none of its own. Captured
       once, before anything is loaded, so they are the true blank state. */
    var BLANK_ACCENT  = accent.value  || '#E8E84A';
    var BLANK_ACCENT2 = accent2.value || '#B08D57';

    /* FULL repaint, not a merge.

       This used to apply only the fields that were present: every line was
       `if(b.x){ set }`. Switching to a report with no branding of its own
       therefore changed nothing on screen, so the panel still showed the
       previous report's logo, colours and photos. Two consequences, both bad:
       the picker looked broken, and saving would have copied one report's
       colours into another report's row without anyone intending it.

       Every field is now written on every paint, cleared when absent. */
    function paintBranding(b){
      b = b || {};
      state.logo_primary   = b.logo_primary   || null;
      state.logo_secondary = b.logo_secondary || null;
      show(1, b.logo_primary   || null);
      show(2, b.logo_secondary || null);
      accent.value  = b.accent  || BLANK_ACCENT;
      accent2.value = b.accent2 || BLANK_ACCENT2;
      ['dim','prac','sat','cover','footer'].forEach(function(k){
        var field = pmap[k];
        state[field] = b[field] || null;
        showP(k, b[field] || null);
      });
      // Clear any lingering filename from the previous scope's file inputs.
      try {
        if(files[1]) files[1].value = '';
        if(files[2]) files[2].value = '';
        for(var k2 in pfiles){ if(pfiles[k2]) pfiles[k2].value = ''; }
      } catch(e){}
      if(msg) msg.textContent = '';
    }

    /* Which report am I styling? Built from the registry, so a new assessment
       appears here the moment it is registered. */
    (function buildPicker(){
      var host = document.getElementById('rb-scope');
      if(!host) return;
      var opts = ['<option value="">Every report (default)</option>'];
      if(window.FCReg && FCReg.list){
        FCReg.list().forEach(function(a){
          var K = FCReg.data(a) || {};
          opts.push('<option value="a:'+esc(K.slug||a.slug)+'">'+esc(K.title||a.name)+'</option>');
        });
      }
      host.innerHTML = opts.join('');
      /* Partners sit above assessments: a co-branded report for Returning Home
         overrides the assessment look, field by field. */
      FC.sb.from('orgs').select('id,name').order('name').then(function(r){
        var rows = (r && r.data) || [];
        if(!rows.length) return;
        var g = '<optgroup label="Partners">' + rows.map(function(o){
          return '<option value="o:'+esc(o.id)+'">'+esc(o.name)+'</option>'; }).join('') + '</optgroup>';
        host.insertAdjacentHTML('beforeend', g);
      }, function(){});
      /* The preview must open the report you are actually styling.

         It was hardcoded to report.html, which loads the viewer's own latest
         result. So a creator styling the Manhood report clicked preview and was
         shown his own Father Profile, with father branding, and reasonably
         concluded the editor was broken. */
      function retargetPreview(){
        var a = document.getElementById('rb-preview');
        if(!a) return;
        var q = ['preview=1'];
        if(brandSlug) q.push('assessment=' + encodeURIComponent(brandSlug));
        if(brandOrg)  q.push('org=' + encodeURIComponent(brandOrg));
        a.href = 'report.html?' + q.join('&');
      }
      retargetPreview();

      host.addEventListener('change', function(){
        var v = host.value || '';
        brandSlug = v.indexOf('a:') === 0 ? v.slice(2) : null;
        brandOrg  = v.indexOf('o:') === 0 ? v.slice(2) : null;
        retargetPreview();
        for(var k in state){ if(Object.prototype.hasOwnProperty.call(state,k)) state[k]=null; }
        loadBranding();
      });
    })();
    loadBranding();
    save.addEventListener('click', function(){
      save.disabled = true; save.textContent='Saving\u2026'; msg.textContent='';
      var row = { assessment_slug: brandSlug, accent:accent.value, accent2:accent2.value,
        updated_at:new Date().toISOString(), updated_by:(FC.uid&&FC.uid())||null };
      if(state.logo_primary!==null) row.logo_primary = state.logo_primary;
      if(state.logo_secondary!==null) row.logo_secondary = state.logo_secondary;
      if(state.photo_dimensions!==null) row.photo_dimensions = state.photo_dimensions;
      if(state.photo_practices!==null) row.photo_practices = state.photo_practices;
      if(state.photo_satisfaction!==null) row.photo_satisfaction = state.photo_satisfaction;
      if(state.photo_cover!==null) row.photo_cover = state.photo_cover;
      if(state.photo_footer!==null) row.photo_footer = state.photo_footer;
      var q;
      if(brandOrg){
        delete row.assessment_slug;
        q = FC.sb.from('org_branding').upsert(Object.assign({org_id:brandOrg}, row), {onConflict:'org_id'});
      } else if(brandSlug){
        q = FC.sb.from('report_branding').upsert(row, {onConflict:'assessment_slug'});
      } else {
        q = FC.sb.from('report_branding').upsert(Object.assign({id:1}, row), {onConflict:'id'});
      }
      q.then(function(r2){
        save.disabled=false; save.textContent='Save branding';
        if(r2.error){ msg.textContent = r2.error.message || 'Could not save. Are you an instructor or admin?'; return; }
        msg.textContent = brandOrg
          ? 'Saved. That partner\u2019s reports now carry it, over the assessment look.'
          : brandSlug
            ? 'Saved. That report now carries it.'
            : 'Saved. Every report without its own branding now carries it.';
      });
    });
  }

  /* ---------------- COURSES ---------------- */
  function newCourse(){
    // Courses are born on the content rail, not in this screen: a JSON file,
    // validated and imported, so course content obeys the same law as pages.
    alert('New courses ship through the content rail: add content/<slug>.json and run the importer or regenerate SEED-CONTENT.sql. Runbook: docs/CONTENT-PIPELINE.md');
  }
  function loadCourses(){
    var SLUG_PAGE = { fundamentals:'course-fathering-fundamentals.html', reentry:'course-coming-home-present.html', anger:'course-steady-under-pressure.html', coparenting:'course-same-team.html', manhood:'course-the-man-before-you.html' };
    var host = el('course-list'); if(!host) return;
    function card(c, counts){
      var n = counts[c.id] || {sessions:0, films:0, checkpoints:0};
      var pub = c.published !== false;
      var page = SLUG_PAGE[c.slug];
      var SHAPE = {fundamentals:true, reentry:true, anger:true, coparenting:true};
      var open = (page && pub) ? '<a class="btn btn-secondary btn-sm" href="'+page+'">Open the course page &rarr;</a>'
               : '<span class="fine">Staged dark until its flag flips</span>';
      var filmLine = n.films + ' films live';
      var shapeNote = '';
      if(SHAPE[c.slug]){
        shapeNote = '<p class="fine" style="color:var(--ash);margin:0 0 10px">Shape preview stills + checkpoints live on the course page. Studio edits assessments here; session film swaps ship through the content rail.</p>';
      }
      return '<div class="card" style="padding:20px">'
        + '<div class="row between" style="align-items:baseline;margin-bottom:6px"><b>'+esc(c.title)+'</b>'
        + '<span class="pill-status '+(pub?'published':'draft')+'">'+(pub?'PUBLISHED':'DRAFT')+'</span></div>'
        + '<p class="fine mono" style="color:var(--ash);margin-bottom:8px">'+esc(c.slug)+' &middot; '+n.sessions+' sessions &middot; '+filmLine+'</p>'
        + shapeNote
        + open + '</div>';
    }
    function paint(courses, counts, demo){
      host.innerHTML = (demo?'<p class="fine" style="margin-bottom:12px">DEMO VIEW &middot; sign in on the live site for database truth.</p>':'')
        + '<div class="grid-2" style="gap:14px">' + courses.map(function(c){return card(c, counts);}).join('') + '</div>'
        + '<div class="card" style="padding:18px;margin-top:16px"><div class="eyebrow" style="margin-bottom:8px">HOW COURSES SHIP</div>'
        + '<p class="small" style="color:var(--ash)">Courses, sessions, checkpoints, and finals live in <span class="mono">content/&lt;slug&gt;.json</span> and import through the content rail: <span class="mono">tools/import_content.py</span> or the generated <span class="mono">content/SEED-CONTENT.sql</span> pasted into the SQL editor. Films swap in by editing two fields per session and re-importing. The runbook is <span class="mono">docs/CONTENT-PIPELINE.md</span>.</p></div>';
    }
    if(!(window.FC && FC.live)){
      var demoCourses = [
        {id:'d1', slug:'fundamentals', title:'Fathering Fundamentals', published:true},
        {id:'d2', slug:'reentry', title:'Coming Home Present', published:true},
        {id:'d3', slug:'anger', title:'Steady Under Pressure', published:true},
        {id:'d4', slug:'coparenting', title:'Same Team', published:true}
      ];
      var demoCounts = {d1:{sessions:9,films:0}, d2:{sessions:12,films:0}, d3:{sessions:12,films:0}, d4:{sessions:12,films:0}};
      paint(demoCourses, demoCounts, true); return;
    }
    Promise.all([
      FC.sb.from('certificate_courses').select('id,slug,title,published').order('title'),
      FC.sb.from('course_videos').select('course_id,video_url,duration_seconds')
    ]).then(function(rs){
      if(rs[0].error){ host.innerHTML = '<p class="fine">Could not load courses: '+esc(rs[0].error.message)+'</p>'; return; }
      var counts = {};
      (rs[1].data||[]).forEach(function(v){
        var c = counts[v.course_id] = counts[v.course_id] || {sessions:0, films:0};
        c.sessions++; if(v.duration_seconds > 0 && v.video_url && v.video_url !== 'pending') c.films++;
      });
      paint(rs[0].data||[], counts, false);
    });
  }
  function insFacts(A){
    var K = (window.FCReg && FCReg.data(A)) || null;
    if(!K) return null;
    var scales=0, items=0;
    (K.sections||[]).forEach(function(s){
      scales += (s.scales||[]).length;
      (s.scales||[]).forEach(function(x){ items += (x.items||[]).length; });
    });
    var normed  = !!(K.norms_n > 0);
    var mode    = (K.scoring && K.scoring.mode) || (normed ? 'norm_referenced' : 'criterion_referenced');
    var calib   = (K.calibration && K.calibration.status) || (normed ? 'normed' : 'pending');
    return {
      slug: K.slug || A.slug,
      title: K.title || A.reportTitle || A.name,
      version: K.version || 'v1',
      scales: scales, items: items,
      normed: normed, norms_n: K.norms_n || 0,
      mode: mode, calibration: calib,
      gate: (K.calibration && K.calibration.blocking_gate) || null,
      cleared: (K.calibration && K.calibration.content_validity && K.calibration.content_validity.cleared_by) || null,
      remaining: (K.calibration && K.calibration.remaining) || [],
      sections: (K.sections||[]).map(function(s){ return s.title || s.key; }).join(', ')
    };
  }

  function registryCard(f){
    var live = f.calibration === 'normed';
    var badge = live
      ? '<span class="pill-status published">calibrated</span>'
      : '<span class="pill-status draft">not calibrated</span>';
    var scoring = f.normed
      ? 'norm-referenced against ' + f.norms_n.toLocaleString() + ' in the norm group'
      : 'criterion-referenced, no norm group yet';
    return '<div class="card">'+
      '<div class="row between" style="margin-bottom:8px;gap:10px"><b>'+esc(f.title)+'</b>'+badge+'</div>'+
      '<p class="fine" style="margin-bottom:6px">'+esc(f.version)+' &middot; '+f.scales+' scales &middot; '+f.items+' items</p>'+
      '<p class="fine" style="margin-bottom:6px">Scoring: '+esc(scoring)+'</p>'+
      '<p class="fine" style="margin-bottom:12px;color:var(--ash)">'+esc(f.sections)+'</p>'+
      (!live
        ? '<div class="notice brass" style="margin:0 0 12px;font-size:13px">'+
            (f.cleared ? 'Content validity cleared by '+esc(f.cleared)+'. ' : '')+
            (f.gate ? 'Blocked until: '+esc(f.gate)+'.'
                    : 'Not yet normed. Remaining: '+esc(f.remaining.join('; '))+'.')+
          '</div>'
        : '')+
      '<p class="fine" style="margin:0;color:var(--ash)">Defined in code. Edit the instrument file, not here.</p>'+
    '</div>';
  }

  function loadInstruments(){
    var box = el('instr-list');
    // 1. The real instruments, from the registry. Rendered first and read only.
    var live = '';
    if(window.FCReg && FCReg.list){
      var facts = FCReg.list().map(insFacts).filter(Boolean);
      if(facts.length){
        live = '<div class="eyebrow" style="margin:0 0 10px">IN THE PLATFORM &middot; WHAT PARTICIPANTS ACTUALLY TAKE</div>'+
               '<div class="grid-auto">'+facts.map(registryCard).join('')+'</div>';
      }
    }
    if(!live){
      live = '<div class="notice brass" style="margin:0 0 8px">The assessment registry did not load, so the live instruments cannot be listed.</div>';
    }

    // 2. The Studio-authored table, labelled honestly.
    FC.sb.from('instruments').select('*').order('created_at',{ascending:false}).then(function(r){
      var rows=r.data||[];
      var reg = (window.FCReg && FCReg.list) ? FCReg.list().map(function(a){return a.slug;}) : [];
      var drafts='<div class="eyebrow" style="margin:26px 0 10px">STUDIO DRAFTS &middot; NOT YET WIRED TO THE PARTICIPANT FLOW</div>';
      if(!rows.length){
        drafts += '<p class="fine">No Studio instruments yet.</p>';
      } else {
        drafts += '<div class="grid-auto">';
        rows.forEach(function(i){
          var collides = reg.indexOf(i.slug) > -1;
          drafts+='<div class="card"><div class="row between" style="margin-bottom:8px;gap:10px"><b>'+esc(i.title)+'</b><span class="pill-status '+i.status+'">'+i.status+'</span></div>'+
            '<p class="fine" style="margin-bottom:12px">v'+i.version+' &middot; scoring: '+esc(i.scoring)+'</p>'+
            (collides
              ? '<div class="notice brass" style="margin:0 0 12px;font-size:13px">Shares a slug with a live instrument. This draft is not what participants take, and publishing it will not change what they take.</div>'
              : '')+
            '<button class="btn btn-secondary mini" data-iedit="'+i.id+'">Edit</button></div>';
        });
        drafts += '</div>';
      }
      box.innerHTML = live + drafts;
      box.querySelectorAll('[data-iedit]').forEach(function(b){b.addEventListener('click',function(){editInstrument(b.dataset.iedit);});});
    }, function(){
      box.innerHTML = live;
    });
  }

  function newInstrument(){
    var slug=prompt('Instrument slug, e.g. keystone-father-profile:');
    if(!slug) return;
    FC.sb.from('instruments').insert({slug:slug.trim(),title:'Untitled instrument',author_id:FC.uid(),status:'draft',scoring:'weighted_mean'}).select().single().then(function(r){
      if(r.error){toast('Failed: '+r.error.message);return;}
      audit&&audit('create_instrument',r.data.id,{slug:slug});loadInstruments();editInstrument(r.data.id);
    });
  }

  function editInstrument(id){
    Promise.all([
      FC.sb.from('instruments').select('*').eq('id',id).single(),
      FC.sb.from('instrument_domains').select('*').eq('instrument_id',id).order('sort'),
      FC.sb.from('instrument_items').select('*').eq('instrument_id',id).order('sort'),
      FC.sb.from('instrument_bands').select('*').eq('instrument_id',id).order('min_score')
    ]).then(function(res){
      var ins=res[0].data, doms=res[1].data||[], items=res[2].data||[], bands=res[3].data||[];
      var box=el('instr-editor'); box.style.display='';
      box.innerHTML=
        '<div class="row between" style="margin-bottom:16px"><h3>Edit instrument</h3>'+
        '<div class="inline-actions"><button class="btn btn-secondary mini" id="ie-close">Close</button>'+
        '<button class="btn '+(ins.status==='published'?'btn-secondary':'btn-primary')+' mini" id="ie-pub">'+(ins.status==='published'?'Retire':'Publish')+'</button></div></div>'+
        '<div class="grid-2" style="gap:14px">'+
          '<div class="field"><label>Title</label><input class="input" id="ie-title" value="'+esc(ins.title)+'"></div>'+
          '<div class="field"><label>Scoring method</label><select class="input" id="ie-scoring">'+
            ['weighted_mean','mean','sum'].map(function(m){return '<option '+(ins.scoring===m?'selected':'')+'>'+m+'</option>';}).join('')+'</select></div>'+
        '</div>'+
        '<div class="field"><label>Description</label><textarea class="input" id="ie-desc">'+esc(ins.description||'')+'</textarea></div>'+
        '<button class="btn btn-primary btn-sm" id="ie-save">Save</button>'+

        '<hr class="hr" style="margin:22px 0"><div class="row between" style="margin-bottom:12px"><h3>Domains &amp; weights</h3></div><div id="ie-domains"></div>'+
        '<div class="row" style="margin-top:10px;max-width:640px"><input class="input mini" id="nd-key" placeholder="key e.g. involvement"><input class="input mini" id="nd-label" placeholder="Label"><input class="input mini" id="nd-weight" type="number" step="0.1" value="1" style="max-width:90px" title="weight"><button class="btn btn-secondary mini" id="nd-go">Add domain</button></div>'+

        '<hr class="hr" style="margin:22px 0"><div class="row between" style="margin-bottom:12px"><h3>Items</h3></div><div id="ie-items"></div>'+
        '<div class="card" style="margin-top:12px;background:var(--ink)"><b style="font-size:14px">Add an item</b>'+
          '<div class="field" style="margin-top:10px"><label>Prompt</label><input class="input" id="ni-prompt"></div>'+
          '<div class="grid-4" style="gap:10px;align-items:end">'+
            '<div class="field" style="margin:0"><label>Domain</label><select class="input" id="ni-domain"></select></div>'+
            '<div class="field" style="margin:0"><label>Scale</label><select class="input" id="ni-kind"><option value="likert5">Likert 1-5</option><option value="likert7">Likert 1-7</option><option value="binary">Yes/No</option></select></div>'+
            '<div class="field" style="margin:0"><label>Weight</label><input class="input" id="ni-weight" type="number" step="0.1" value="1"></div>'+
            '<div class="field" style="margin:0"><label>Reverse</label><select class="input" id="ni-rev"><option value="false">No</option><option value="true">Yes</option></select></div>'+
          '</div><button class="btn btn-secondary btn-sm" id="ni-go" style="margin-top:6px">Add item</button></div>'+

        '<hr class="hr" style="margin:22px 0"><h3 style="margin-bottom:12px">Score bands (interpretation)</h3><div id="ie-bands"></div>'+
        '<div class="row" style="margin-top:10px;max-width:640px"><input class="input mini" id="nb-min" type="number" placeholder="min" style="max-width:80px"><input class="input mini" id="nb-max" type="number" placeholder="max" style="max-width:80px"><input class="input mini" id="nb-label" placeholder="Label e.g. Solid. Uneven."><button class="btn btn-secondary mini" id="nb-go">Add band</button></div>';

      renderDomains(id, doms); renderItems(id, items, doms); renderBands(id, bands);
      var dsel=el('ni-domain'); dsel.innerHTML=doms.map(function(d){return '<option value="'+d.id+'">'+esc(d.label)+'</option>';}).join('');

      el('ie-close').onclick=function(){box.style.display='none';};
      el('ie-save').onclick=function(){
        FC.sb.from('instruments').update({title:el('ie-title').value,scoring:el('ie-scoring').value,description:el('ie-desc').value}).eq('id',id).then(function(r){
          if(r.error){toast('Failed: '+r.error.message);return;} toast('Instrument saved.');loadInstruments();
        });
      };
      el('ie-pub').onclick=function(){
        var np=ins.status==='published'?'retired':'published';
        // Publishing a draft that shares a slug with a live, code-defined
        // instrument tells staff something untrue: it does not change what any
        // participant takes, and it puts a "published" badge on a stub.
        if(np==='published' && window.FCReg && FCReg.bySlug && FCReg.bySlug(ins.slug)){
          toast('Not published. This slug belongs to a live instrument defined in code, so publishing here would not change what participants take.');
          return;
        }
        FC.sb.from('instruments').update({status:np,published_at:np==='published'?new Date().toISOString():null}).eq('id',id).then(function(r){
          if(r.error){toast('Failed: '+r.error.message);return;}
          audit&&audit('instrument_'+np,id,{});toast(np==='published'?'Published. Members can take it.':'Retired.');editInstrument(id);loadInstruments();
        });
      };
      el('nd-go').onclick=function(){
        if(!el('nd-key').value){toast('Domain needs a key.');return;}
        FC.sb.from('instrument_domains').insert({instrument_id:id,key:el('nd-key').value,label:el('nd-label').value||el('nd-key').value,weight:parseFloat(el('nd-weight').value)||1,sort:doms.length}).then(function(r){
          if(r.error){toast('Failed: '+r.error.message);return;}editInstrument(id);
        });
      };
      el('ni-go').onclick=function(){
        if(!el('ni-prompt').value){toast('Item needs a prompt.');return;}
        FC.sb.from('instrument_items').insert({instrument_id:id,domain_id:el('ni-domain').value||null,prompt:el('ni-prompt').value,kind:el('ni-kind').value,weight:parseFloat(el('ni-weight').value)||1,reverse:el('ni-rev').value==='true',sort:items.length}).then(function(r){
          if(r.error){toast('Failed: '+r.error.message);return;}editInstrument(id);
        });
      };
      el('nb-go').onclick=function(){
        FC.sb.from('instrument_bands').insert({instrument_id:id,min_score:parseInt(el('nb-min').value,10)||0,max_score:parseInt(el('nb-max').value,10)||100,label:el('nb-label').value||'Band'}).then(function(r){
          if(r.error){toast('Failed: '+r.error.message);return;}editInstrument(id);
        });
      };
    });
  }

  function renderDomains(id, doms){
    el('ie-domains').innerHTML=doms.length?doms.map(function(d){
      return '<div class="lesson-row"><div style="flex:1"><b style="font-size:14px">'+esc(d.label)+'</b> <span class="fine">key: '+esc(d.key)+' · weight '+d.weight+'</span></div>'+
        '<button class="btn btn-secondary mini" data-ddel="'+d.id+'">Delete</button></div>';
    }).join(''):'<p class="fine">No domains. Add at least one.</p>';
    el('ie-domains').querySelectorAll('[data-ddel]').forEach(function(b){b.addEventListener('click',function(){
      if(confirm('Delete domain? Items keep but lose their domain.')) FC.sb.from('instrument_domains').delete().eq('id',b.dataset.ddel).then(function(){editInstrument(id);});
    });});
  }
  function renderItems(id, items, doms){
    var dmap={};doms.forEach(function(d){dmap[d.id]=d.label;});
    el('ie-items').innerHTML=items.length?items.map(function(it){
      return '<div class="item-row"><div class="row between"><b style="font-size:14px">'+esc(it.prompt)+'</b>'+
        '<button class="btn btn-secondary mini" data-idel="'+it.id+'">Delete</button></div>'+
        '<p class="fine" style="margin-top:6px">'+(dmap[it.domain_id]||'no domain')+' · '+it.kind+' · weight '+it.weight+(it.reverse?' · reverse-scored':'')+'</p></div>';
    }).join(''):'<p class="fine">No items yet.</p>';
    el('ie-items').querySelectorAll('[data-idel]').forEach(function(b){b.addEventListener('click',function(){
      if(confirm('Delete item?')) FC.sb.from('instrument_items').delete().eq('id',b.dataset.idel).then(function(){editInstrument(id);});
    });});
  }
  function renderBands(id, bands){
    el('ie-bands').innerHTML=bands.length?bands.map(function(b){
      return '<div class="lesson-row"><span class="num mono">'+b.min_score+'-'+b.max_score+'</span><div style="flex:1"><b style="font-size:14px">'+esc(b.label)+'</b></div>'+
        '<button class="btn btn-secondary mini" data-bdel="'+b.id+'">Delete</button></div>';
    }).join(''):'<p class="fine">No bands. Add ranges like 0-49, 50-69, 70-84, 85-100.</p>';
    el('ie-bands').querySelectorAll('[data-bdel]').forEach(function(x){x.addEventListener('click',function(){
      FC.sb.from('instrument_bands').delete().eq('id',x.dataset.bdel).then(function(){editInstrument(id);});
    });});
  }

  document.addEventListener('DOMContentLoaded',function(){
    boot();
    var nc=el('new-course'); if(nc) nc.addEventListener('click',newCourse);
    var ni=el('new-instr'); if(ni) ni.addEventListener('click',newInstrument);
  });
})();
