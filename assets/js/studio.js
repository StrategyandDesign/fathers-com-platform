/* Studio: course-builder + assessment instrument builder. Author = instructor/admin. */
(function(){
  var demo = !(window.FC && FC.live);
  function el(id){return document.getElementById(id);}
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function boot(){
    if(demo){ el('demo-note').style.display=''; el('app').style.display='';
      el('course-list').innerHTML='<p class="fine">Live data loads with Supabase keys. The New buttons open the real builder.</p>';
      el('instr-list').innerHTML='<p class="fine">Same here. Build an instrument to see items, scales, domains, and weights.</p>';
      return; }
    FCR.guard(['instructor','admin']).then(function(ok){
      if(!ok){ el('denied').style.display=''; return; }
      el('app').style.display=''; loadCourses(); loadInstruments();
    });
  }

  /* ---------------- COURSES ---------------- */
  function loadCourses(){
    FC.sb.from('classes').select('*').order('title').then(function(r){
      if(r.error){ el('course-list').innerHTML='<div class="notice brass" style="margin:0">Could not load courses: '+esc(r.error.message)+'</div>'; return; }
      var rows=r.data||[];
      if(!rows.length){el('course-list').innerHTML='<p class="fine">No courses yet. Create your first.</p>';return;}
      var html='<div class="grid-auto">';
      rows.forEach(function(c){
        html+='<div class="card"><div class="row between" style="margin-bottom:8px"><b>'+esc(c.title)+'</b><span class="pill-status '+(c.published?'published':'draft')+'">'+(c.published?'published':'draft')+'</span></div>'+
          '<p class="fine" style="margin-bottom:12px">'+esc(c.instructor||'')+' · '+(c.lesson_count||0)+' lessons</p>'+
          '<button class="btn btn-secondary mini" data-edit="'+c.id+'">Edit</button></div>';
      });
      el('course-list').innerHTML=html+'</div>';
      el('course-list').querySelectorAll('[data-edit]').forEach(function(b){b.addEventListener('click',function(){editCourse(b.dataset.edit);});});
    });
  }

  function newCourse(){
    var slug=prompt('Course slug (lowercase, no spaces), e.g. fundamentals:');
    if(!slug) return;
    FC.sb.from('classes').insert({slug:slug.trim(),title:'Untitled course',instructor:'',author_id:FC.uid(),published:false,lesson_count:0}).select().single().then(function(r){
      if(r.error){toast('Failed: '+r.error.message);return;}
      audit&&audit('create_class',r.data.id,{slug:slug});loadCourses();editCourse(r.data.id);
    });
  }

  function editCourse(id){
    FC.sb.from('classes').select('*, lessons(*)').eq('id',id).single().then(function(r){
      var box=el('course-editor'); box.style.display='';
      if(r.error || !r.data){
        box.innerHTML='<div class="notice brass" style="margin:0">Could not open this course: '+esc((r.error&&r.error.message)||'not found')+'.<br><span class="fine">If this mentions a missing column, run studio_course_columns.sql in Supabase.</span></div>';
        box.scrollIntoView({behavior:'smooth'});
        return;
      }
      var c=r.data; var lessons=(c.lessons||[]).sort(function(a,b){return a.num-b.num;});
      box.innerHTML=
        '<div class="row between" style="margin-bottom:16px"><h3>Edit course</h3>'+
        '<div class="inline-actions"><button class="btn btn-secondary mini" id="ec-close">Close</button>'+
        '<button class="btn '+(c.published?'btn-secondary':'btn-primary')+' mini" id="ec-pub">'+(c.published?'Unpublish':'Publish')+'</button></div></div>'+
        '<div class="grid-2" style="gap:14px">'+
          '<div class="field"><label>Title</label><input class="input" id="ec-title" value="'+esc(c.title)+'"></div>'+
          '<div class="field"><label>Instructor name</label><input class="input" id="ec-instr" value="'+esc(c.instructor||'')+'"></div>'+
        '</div>'+
        '<div class="field"><label>Summary (one line)</label><input class="input" id="ec-summary" value="'+esc(c.summary||'')+'"></div>'+
        '<div class="field"><label>Description</label><textarea class="input" id="ec-desc">'+esc(c.description||'')+'</textarea></div>'+
        '<label style="display:flex;gap:10px;align-items:center;margin-bottom:16px"><input type="checkbox" id="ec-drip" '+(c.drip_weekly?'checked':'')+'> Drip: lessons unlock by week</label>'+
        '<button class="btn btn-primary btn-sm" id="ec-save">Save course</button>'+
        '<hr class="hr" style="margin:22px 0"><h3 style="margin-bottom:14px">Lessons</h3><div id="ec-lessons"></div>'+
        '<div class="card" style="margin-top:14px;background:var(--ink)"><b style="font-size:14px">Add a lesson</b>'+
          '<div class="grid-4" style="gap:10px;align-items:end;margin-top:10px">'+
            '<div class="field" style="margin:0"><label>#</label><input class="input" id="al-num" type="number" value="'+(lessons.length+1)+'"></div>'+
            '<div class="field" style="margin:0"><label>Title</label><input class="input" id="al-title"></div>'+
            '<div class="field" style="margin:0"><label>Vimeo ID</label><input class="input" id="al-vimeo" placeholder="76979871"></div>'+
            '<div class="field" style="margin:0"><label>Minutes</label><input class="input" id="al-min" type="number" placeholder="9"></div>'+
          '</div>'+
          '<div class="field" style="margin-top:10px"><label>Unlock week (drip only)</label><input class="input mini" id="al-week" type="number" placeholder="1" style="max-width:120px"></div>'+
          '<button class="btn btn-secondary btn-sm" id="al-go" style="margin-top:6px">Add lesson</button></div>';

      renderLessons(id, lessons);
      el('ec-close').onclick=function(){box.style.display='none';};
      el('ec-save').onclick=function(){
        FC.sb.from('classes').update({title:el('ec-title').value,instructor:el('ec-instr').value,summary:el('ec-summary').value,description:el('ec-desc').value,drip_weekly:el('ec-drip').checked}).eq('id',id).then(function(res){
          if(res.error){toast('Save failed: '+res.error.message);return;} toast('Course saved.');loadCourses();
        });
      };
      el('ec-pub').onclick=function(){
        var np=!c.published;
        FC.sb.from('classes').update({published:np}).eq('id',id).then(function(res){
          if(res.error){toast('Failed: '+res.error.message);return;}
          audit&&audit(np?'publish_class':'unpublish_class',id,{});toast(np?'Published. Live to members.':'Unpublished.');editCourse(id);loadCourses();
        });
      };
      el('al-go').onclick=function(){
        var num=parseInt(el('al-num').value,10)||lessons.length+1;
        var body={class_id:id,num:num,title:el('al-title').value||('Lesson '+num),vimeo_id:el('al-vimeo').value||null,duration_seconds:(parseInt(el('al-min').value,10)||0)*60,unlock_week:parseInt(el('al-week').value,10)||null};
        FC.sb.from('lessons').insert(body).then(function(res){
          if(res.error){toast('Failed: '+res.error.message);return;}
          FC.sb.from('classes').update({lesson_count:lessons.length+1}).eq('id',id).then(function(){editCourse(id);});
        });
      };
    });
  }

  function renderLessons(classId, lessons){
    var box=el('ec-lessons');
    if(!lessons.length){box.innerHTML='<p class="fine">No lessons yet.</p>';return;}
    box.innerHTML=lessons.map(function(l){
      return '<div class="lesson-row"><span class="num">'+l.num+'</span>'+
        '<div style="flex:1"><b style="font-size:14px">'+esc(l.title)+'</b>'+
        (l.vimeo_id?' <span class="fine">· Vimeo '+esc(l.vimeo_id)+'</span>':' <span class="fine" style="color:var(--error)">· no video</span>')+
        (l.duration_seconds?' <span class="fine">· '+Math.round(l.duration_seconds/60)+' min</span>':'')+'</div>'+
        '<button class="btn btn-secondary mini" data-del="'+l.id+'">Delete</button></div>';
    }).join('');
    box.querySelectorAll('[data-del]').forEach(function(b){b.addEventListener('click',function(){
      if(confirm('Delete this lesson?')) FC.sb.from('lessons').delete().eq('id',b.dataset.del).then(function(){editCourse(classId);});
    });});
  }

  /* ---------------- INSTRUMENT BUILDER ---------------- */
  function loadInstruments(){
    FC.sb.from('instruments').select('*').order('created_at',{ascending:false}).then(function(r){
      var rows=r.data||[];
      if(!rows.length){el('instr-list').innerHTML='<p class="fine">No instruments yet.</p>';return;}
      var html='<div class="grid-auto">';
      rows.forEach(function(i){
        html+='<div class="card"><div class="row between" style="margin-bottom:8px"><b>'+esc(i.title)+'</b><span class="pill-status '+i.status+'">'+i.status+'</span></div>'+
          '<p class="fine" style="margin-bottom:12px">v'+i.version+' · scoring: '+i.scoring+'</p>'+
          '<button class="btn btn-secondary mini" data-iedit="'+i.id+'">Edit</button></div>';
      });
      el('instr-list').innerHTML=html+'</div>';
      el('instr-list').querySelectorAll('[data-iedit]').forEach(function(b){b.addEventListener('click',function(){editInstrument(b.dataset.iedit);});});
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
