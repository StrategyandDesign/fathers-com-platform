/* Admin: certificate console. Build a certificate (videos with length, a
   Debrief after each, a final Q&A), publish it, and approve completions.
   Admin-only: the page is role-guarded and every write is RLS-protected. */
(function(){
  if (!document.getElementById('certs-build')) return;
  function el(id){ return document.getElementById(id); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function note(m){ if (window.toast) toast(m); }

  var demo = !(window.FC && FC.live);
  var courses = [], curCourse = null, curVideo = null, videos = [];

  function boot(){
    if (demo) return;                       // admin.js shows the demo note
    FC.ready.then(function(){ loadCourses(); loadApprovals(); });
  }

  // ---------- courses ----------
  function courseObj(){ return courses.find(function(c){ return c.id === curCourse; }); }

  function loadCourses(){
    FC.sb.from('certificate_courses').select('id,title,hours,published').order('title').then(function(r){
      courses = r.data || [];
      var sel = el('cert-course-select');
      if (!courses.length) { sel.innerHTML=''; el('cert-videos').innerHTML='<p class="fine">No courses yet. Run seed_certificate_courses.sql first.</p>'; return; }
      sel.innerHTML = courses.map(function(c){ return '<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>'; }).join('');
      sel.value = courses[0].id;
      selectCourse();
    });
  }

  function selectCourse(){
    curCourse = el('cert-course-select').value;
    curVideo = null;
    var c = courseObj();
    el('cert-publish-state').textContent = c && c.published ? 'Live' : 'Draft';
    el('cert-publish-state').className = 'chip' + (c && c.published ? ' is-on' : '');
    el('cert-publish').textContent = c && c.published ? 'Unpublish' : 'Publish';
    el('cert-debrief-card').style.display = 'none';
    loadVideos();
    loadQA();
  }

  function togglePublish(){
    var c = courseObj(); if (!c) return;
    FC.sb.from('certificate_courses').update({ published: !c.published }).eq('id', curCourse).then(function(r){
      if (r.error) { note('Failed: ' + r.error.message); return; }
      c.published = !c.published; selectCourse(); note(c.published ? 'Published.' : 'Moved to draft.');
    });
  }

  // ---------- videos ----------
  function fmtLen(sec){ sec = sec || 0; var m = Math.floor(sec/60), s = sec % 60; return m + ':' + (s<10?'0':'') + s; }

  function loadVideos(){
    FC.sb.from('course_videos').select('*').eq('course_id', curCourse).order('ord').then(function(r){
      videos = r.data || [];
      if (!videos.length) { el('cert-videos').innerHTML = '<p class="fine">No videos yet. Add the first below.</p>'; return; }
      var html = '<table class="dtable"><thead><tr><th>#</th><th>Title</th><th>Length</th><th>Debrief</th><th></th></tr></thead><tbody>';
      videos.forEach(function(v){
        html += '<tr><td>' + v.ord + '</td><td>' + esc(v.title) + '</td><td class="fine">' + fmtLen(v.duration_seconds) + '</td>' +
          '<td><button class="btn btn-secondary mini" data-debrief="' + esc(v.id) + '">Manage</button></td>' +
          '<td><button class="btn btn-secondary mini" data-delvid="' + esc(v.id) + '">Delete</button></td></tr>';
      });
      html += '</tbody></table>';
      el('cert-videos').innerHTML = html;
      el('cert-videos').querySelectorAll('[data-debrief]').forEach(function(b){ b.addEventListener('click', function(){ manageDebrief(b.dataset.debrief); }); });
      el('cert-videos').querySelectorAll('[data-delvid]').forEach(function(b){ b.addEventListener('click', function(){
        if (!confirm('Delete this video and its Debrief?')) return;
        FC.sb.from('course_videos').delete().eq('id', b.dataset.delvid).then(loadVideos);
      }); });
    });
  }

  function addVideo(){
    var title = el('cv-title').value.trim(), url = el('cv-url').value.trim(), mins = parseFloat(el('cv-mins').value || '0');
    if (!title) { el('cv-title').focus(); return; }
    FC.sb.from('course_videos').insert({
      course_id: curCourse, ord: videos.length + 1, title: title,
      video_url: url || null, duration_seconds: Math.round((mins||0) * 60)
    }).then(function(r){
      if (r.error) { note('Failed: ' + r.error.message); return; }
      el('cv-title').value=''; el('cv-url').value=''; el('cv-mins').value=''; loadVideos();
    });
  }

  // ---------- debrief questions ----------
  function manageDebrief(videoId){
    curVideo = videoId;
    var v = videos.find(function(x){ return x.id === videoId; });
    el('cert-debrief-card').style.display = '';
    el('cert-debrief-title').textContent = 'Debrief for: ' + (v ? v.title : '');
    loadQuestions();
    el('cert-debrief-card').scrollIntoView({ behavior: 'smooth' });
  }

  function loadQuestions(){
    FC.sb.from('quiz_questions').select('*').eq('video_id', curVideo).order('ord').then(function(r){
      var qs = r.data || [];
      if (!qs.length) { el('cert-questions').innerHTML = '<p class="fine">No questions yet. Ten is the target.</p>'; return; }
      el('cert-questions').innerHTML = qs.map(function(q, i){
        var choices = (q.choices || []).map(function(ch, ci){ return ci === q.correct_index ? '<b>' + esc(ch) + '</b>' : esc(ch); }).join('  ·  ');
        return '<div class="row between" style="padding:10px 0;border-top:1px solid var(--hairline);align-items:flex-start;gap:12px">' +
          '<div><b>' + (i+1) + '.</b> ' + esc(q.prompt) + '<div class="fine" style="margin-top:4px">' + choices + '</div></div>' +
          '<button class="btn btn-secondary mini" data-delq="' + esc(q.id) + '">Delete</button></div>';
      }).join('');
      el('cert-questions').querySelectorAll('[data-delq]').forEach(function(b){ b.addEventListener('click', function(){ FC.sb.from('quiz_questions').delete().eq('id', b.dataset.delq).then(loadQuestions); }); });
    });
  }

  function addQuestion(){
    if (!curVideo) return;
    var prompt = el('cq-prompt').value.trim();
    var choices = [el('cq-a').value.trim(), el('cq-b').value.trim(), el('cq-c').value.trim(), el('cq-d').value.trim()].filter(Boolean);
    var correct = parseInt(el('cq-correct').value, 10);
    if (!prompt || choices.length < 2) { note('Add a question and at least two choices.'); return; }
    if (correct >= choices.length) correct = 0;
    FC.sb.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('video_id', curVideo).then(function(cr){
      FC.sb.from('quiz_questions').insert({ video_id: curVideo, ord: (cr.count||0)+1, prompt: prompt, choices: choices, correct_index: correct }).then(function(r){
        if (r.error) { note('Failed: ' + r.error.message); return; }
        el('cq-prompt').value=''; el('cq-a').value=''; el('cq-b').value=''; el('cq-c').value=''; el('cq-d').value=''; loadQuestions();
      });
    });
  }

  // ---------- final Q&A ----------
  function loadQA(){
    FC.sb.from('final_qa_questions').select('*').eq('course_id', curCourse).order('ord').then(function(r){
      var qa = r.data || [];
      if (!qa.length) { el('cert-qa').innerHTML = '<p class="fine">No prompts yet.</p>'; return; }
      el('cert-qa').innerHTML = qa.map(function(q, i){
        return '<div class="row between" style="padding:10px 0;border-top:1px solid var(--hairline)"><div><b>' + (i+1) + '.</b> ' + esc(q.prompt) + '</div><button class="btn btn-secondary mini" data-delqa="' + esc(q.id) + '">Delete</button></div>';
      }).join('');
      el('cert-qa').querySelectorAll('[data-delqa]').forEach(function(b){ b.addEventListener('click', function(){ FC.sb.from('final_qa_questions').delete().eq('id', b.dataset.delqa).then(loadQA); }); });
    });
  }

  function addQA(){
    var prompt = el('qa-prompt').value.trim(); if (!prompt) return;
    FC.sb.from('final_qa_questions').select('id', { count: 'exact', head: true }).eq('course_id', curCourse).then(function(cr){
      FC.sb.from('final_qa_questions').insert({ course_id: curCourse, ord: (cr.count||0)+1, prompt: prompt }).then(function(r){
        if (r.error) { note('Failed: ' + r.error.message); return; }
        el('qa-prompt').value=''; loadQA();
      });
    });
  }

  // ---------- approvals ----------
  function loadApprovals(){
    FC.sb.from('certificate_awards').select('id,user_id,course_id,status,created_at')
      .in('status', ['submitted', 'in_progress', 'approved', 'signed', 'denied'])
      .order('created_at', { ascending: false })
      .then(function(r){
        var awards = r.data || [];
        if (!awards.length) { el('cert-approvals').innerHTML = '<p class="fine">No completions yet. They appear here when fathers finish a course.</p>'; return; }
        var uids = Array.from(new Set(awards.map(function(a){ return a.user_id; })));
        var cmap = {}; courses.forEach(function(c){ cmap[c.id] = c.title; });
        FC.sb.from('profiles').select('id,name,email').in('id', uids).then(function(pr){
          var names = {}; (pr.data || []).forEach(function(p){ names[p.id] = p.name || p.email; });
          var html = '<table class="dtable"><thead><tr><th>Father</th><th>Certificate</th><th>Status</th><th></th></tr></thead><tbody>';
          awards.forEach(function(a){
            var actions = a.status === 'submitted'
              ? '<button class="btn btn-primary mini" data-approve="' + esc(a.id) + '">Approve</button> <button class="btn btn-secondary mini" data-deny="' + esc(a.id) + '">Deny</button>'
              : '<span class="fine">—</span>';
            html += '<tr><td>' + esc(names[a.user_id] || '—') + '</td><td>' + esc(cmap[a.course_id] || '—') + '</td><td><span class="chip">' + esc(a.status) + '</span></td><td>' + actions + '</td></tr>';
          });
          html += '</tbody></table>';
          el('cert-approvals').innerHTML = html;
          el('cert-approvals').querySelectorAll('[data-approve]').forEach(function(b){ b.addEventListener('click', function(){ decide(b.dataset.approve, 'approved'); }); });
          el('cert-approvals').querySelectorAll('[data-deny]').forEach(function(b){ b.addEventListener('click', function(){ decide(b.dataset.deny, 'denied'); }); });
        });
      });
  }

  function decide(id, status){
    var patch = { status: status };
    if (status === 'approved') { patch.approved_at = new Date().toISOString(); patch.approved_by = FC.uid && FC.uid(); }
    FC.sb.from('certificate_awards').update(patch).eq('id', id).then(function(r){
      if (r.error) { note('Failed: ' + r.error.message); return; }
      note(status === 'approved' ? 'Approved. The father can now sign his certificate.' : 'Denied.');
      loadApprovals();
    });
  }

  function wire(){
    el('cert-course-select').addEventListener('change', selectCourse);
    el('cert-publish').addEventListener('click', togglePublish);
    el('cv-add').addEventListener('click', addVideo);
    el('cq-add').addEventListener('click', addQuestion);
    el('qa-add').addEventListener('click', addQA);
    boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
