/* The Legacy Archive. One prompt, one button.
   The man talks; the machine does the rest. Recording auto-saves on stop,
   with Undo instead of a confirm. Signed-out men record first: the take is
   held in this browser and kept the moment they join. */
(function(){
  'use strict';
  var app = document.getElementById('voiceApp');
  if (!app || !window.VET) return;
  var e = VET.esc;

  var btn = document.getElementById('vBtn');
  var btnLbl = document.getElementById('vBtnLbl');
  var promptEl = document.getElementById('vPrompt');
  var swap = document.getElementById('vSwap');
  var allBtn = document.getElementById('vAllBtn');
  var allWrap = document.getElementById('vAllWrap');
  var done = document.getElementById('vDone');
  var doneTxt = document.getElementById('vDoneTxt');
  var undo = document.getElementById('vUndo');
  var again = document.getElementById('vAgain');
  var keep = document.getElementById('vKeep');
  var guest = document.getElementById('vGuest');
  var preview = document.getElementById('voicePreview');
  var msg = document.getElementById('voiceMsg');
  var timerEl = document.getElementById('voiceTimer');

  var mediaRecorder = null, chunks = [], stream = null, blob = null, tick = null, seconds = 0;
  var state = 'idle'; // idle | rec | saving | done
  var lastSaved = null; // {id, path}

  var supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!supported) { setMsg('Recording is not supported in this browser. Try Chrome or Safari on your phone.', true); if (btn) btn.disabled = true; return; }

  function setMsg(t, err){ if (msg){ msg.textContent = t || ''; msg.style.color = err ? 'var(--error)' : 'var(--ash)'; } }
  function fmt(s){ var m = Math.floor(s/60), r = s%60; return m + ':' + (r<10?'0':'') + r; }
  function startTimer(){ seconds = 0; timerEl.textContent = '0:00'; tick = setInterval(function(){ seconds++; timerEl.textContent = fmt(seconds) + (seconds < 60 ? '' : ''); if (seconds >= 300) stopRec(); }, 1000); }
  function stopTimer(){ if (tick){ clearInterval(tick); tick = null; } }
  function releaseStream(){ if (stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; } }

  /* ---------- the adaptive prompt: the machine picks, the man can override ---------- */
  var FLAT = [];
  (window.FC_VOICE_PROMPTS || []).forEach(function(c){ (c.items||[]).forEach(function(t){ FLAT.push({ cat: c.cat, title: t }); }); });
  var doneTitles = {};
  try { (JSON.parse(localStorage.getItem('fc_voice_done')||'[]')).forEach(function(t){ doneTitles[t] = 1; }); } catch(_){}
  var cursor = 0;
  function currentPrompt(){ return FLAT[cursor % FLAT.length] || { cat:'', title:'Say what is on your heart.' }; }
  function showPrompt(){
    var p = currentPrompt();
    window.FC_VOICE_PROMPT = { title: p.title, cat: p.cat };
    if (promptEl) promptEl.textContent = p.title;
  }
  function pickFirstUnrecorded(){
    for (var i = 0; i < FLAT.length; i++){ if (!doneTitles[FLAT[i].title]){ cursor = i; return; } }
    cursor = (new Date().getDate()) % FLAT.length; // everything banked: rotate by day
  }
  function advance(){ var start = cursor; do { cursor = (cursor + 1) % FLAT.length; } while (doneTitles[FLAT[cursor].title] && cursor !== start); showPrompt(); }
  pickFirstUnrecorded(); showPrompt();
  if (swap) swap.addEventListener('click', advance);
  if (allBtn) allBtn.addEventListener('click', function(){ if (allWrap){ allWrap.open = true; allWrap.scrollIntoView({behavior:'smooth', block:'nearest'}); } });
  var picker = document.getElementById('promptPicker');
  if (picker) picker.addEventListener('click', function(){ setTimeout(function(){
    if (window.FC_VOICE_PROMPT && window.FC_VOICE_PROMPT.title && promptEl){ promptEl.textContent = FC_VOICE_PROMPT.title; if (allWrap) allWrap.open = false; window.scrollTo({ top: app.offsetTop - 90, behavior: 'smooth' }); }
  }, 30); });

  function kindFor(cat){ return cat === 'Away nights' ? 'bedtime_story' : 'message'; }

  /* ---------- one button ---------- */
  function onBtn(){ if (state === 'idle') startRec(); else if (state === 'rec') stopRec(); }
  if (btn) btn.addEventListener('click', onBtn);

  function startRec(){
    setMsg('');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(s){
      stream = s; chunks = []; blob = null;
      try { mediaRecorder = new MediaRecorder(stream); } catch (err) { mediaRecorder = new MediaRecorder(stream, {}); }
      mediaRecorder.ondataavailable = function(ev){ if (ev.data && ev.data.size) chunks.push(ev.data); };
      mediaRecorder.onstop = function(){
        blob = new Blob(chunks, { type: (chunks[0] && chunks[0].type) || 'audio/webm' });
        if (preview) preview.src = URL.createObjectURL(blob);
        releaseStream();
        keepIt();
      };
      mediaRecorder.start();
      state = 'rec';
      btn.classList.add('is-rec');
      if (btnLbl) btnLbl.textContent = 'Stop';
      setMsg('Talking to them now. Tap when you are done; sixty seconds is plenty.');
      if (done) done.hidden = true;
      startTimer();
    }).catch(function(err){
      var m = 'Could not start recording.';
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) m = 'Microphone access was blocked. Allow it in your browser settings, then tap again.';
      else if (err && err.name === 'NotFoundError') m = 'No microphone was found on this device.';
      setMsg(m, true);
    });
  }

  function stopRec(){
    stopTimer();
    state = 'saving';
    btn.classList.remove('is-rec');
    if (btnLbl) btnLbl.textContent = 'Record';
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  }

  /* ---------- the machine keeps it ---------- */
  function markDone(title){ doneTitles[title] = 1; try { localStorage.setItem('fc_voice_done', JSON.stringify(Object.keys(doneTitles))); } catch(_){} }

  function keepIt(){
    var p = window.FC_VOICE_PROMPT || currentPrompt();
    var signedIn = window.FC && FC.live && FC.uid && FC.uid();
    if (!signedIn){
      // Hold the take in this browser; keep it the moment he joins.
      var r = new FileReader();
      r.onload = function(){
        try { sessionStorage.setItem('fc_voice_pending', JSON.stringify({ b64: r.result, type: blob.type || 'audio/webm', title: p.title, kind: kindFor(p.cat) })); } catch(_){}
        state = 'done';
        if (doneTxt) doneTxt.textContent = 'Recorded: ' + p.title + '. It is held on this device.';
        if (keep) keep.hidden = false;
        if (undo) undo.hidden = true;
        if (done) done.hidden = false;
        if (guest) guest.hidden = false;
        setMsg('');
      };
      r.readAsDataURL(blob);
      return;
    }
    setMsg('Keeping it\u2026');
    uploadBlob(blob, p.title, kindFor(p.cat)).then(function(saved){
      lastSaved = saved;
      markDone(p.title);
      state = 'done';
      if (doneTxt) doneTxt.textContent = 'Kept: ' + p.title + ' \u00b7 today. It is waiting for them whenever they want it.';
      if (keep) keep.hidden = true;
      if (undo) undo.hidden = false;
      if (done) done.hidden = false;
      setMsg('');
      loadList();
    }, function(){
      state = 'done';
      if (doneTxt) doneTxt.textContent = 'Recorded, but it could not be kept just now. Play it here, or tap Record another to try again.';
      if (undo) undo.hidden = true;
      if (done) done.hidden = false;
      setMsg('');
    });
  }

  function uploadBlob(b, title, kind){
    return FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) throw new Error('no session');
      var path = uid + '/' + Date.now() + '.webm';
      return FC.sb.storage.from('voice').upload(path, b, { contentType: b.type || 'audio/webm', upsert: false })
        .then(function(up){
          if (up && up.error) throw up.error;
          try { localStorage.setItem('fc_vet_step_voice','1'); } catch(_){}
          return FC.sb.from('voice_recordings').insert({ user_id: uid, kind: kind, storage_path: path, title: title }).select('id').single();
        })
        .then(function(ins){ return { id: ins && ins.data && ins.data.id, path: path }; });
    });
  }

  if (undo) undo.addEventListener('click', function(){
    if (!lastSaved) { if (done) done.hidden = true; state = 'idle'; return; }
    undo.disabled = true;
    FC.sb.storage.from('voice').remove([lastSaved.path])
      .then(function(){ return lastSaved.id ? FC.sb.from('voice_recordings').delete().eq('id', lastSaved.id) : null; })
      .then(function(){ undo.disabled = false; lastSaved = null; if (done) done.hidden = true; state = 'idle'; setMsg('Undone. It is gone.'); loadList(); },
            function(){ undo.disabled = false; setMsg('Could not undo just now.', true); });
  });
  if (again) again.addEventListener('click', function(){ if (done) done.hidden = true; timerEl.textContent = '\u00a0'; lastSaved = null; state = 'idle'; advance(); startRec(); });

  /* ---------- a pending take from before sign-in gets kept automatically ---------- */
  function keepPending(){
    var raw = null;
    try { raw = sessionStorage.getItem('fc_voice_pending'); } catch(_){}
    if (!raw || !(window.FC && FC.live)) return;
    FC.ready.then(function(){
      if (!(FC.uid && FC.uid())) return;
      var p = JSON.parse(raw);
      fetch(p.b64).then(function(res){ return res.blob(); }).then(function(b){
        return uploadBlob(b, p.title, p.kind);
      }).then(function(){
        try { sessionStorage.removeItem('fc_voice_pending'); } catch(_){}
        markDone(p.title);
        setMsg('Kept the one you recorded before you joined: ' + p.title + '.');
        loadList();
      }).catch(function(){});
    });
  }

  /* ---------- the shelf ---------- */
  var KIND_LABEL = { bedtime_story: 'Bedtime story', message: 'A message', thinking: 'Thinking of you' };
  function loadList(){
    var list = document.getElementById('voiceList');
    if (!list || !window.FC || !FC.live) return;
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) return;
      return FC.sb.from('voice_recordings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
        .then(function(r){
          var rows = (r && r.data) || [];
          rows.forEach(function(row){ if (row.title) doneTitles[row.title] = 1; });
          if (state === 'idle'){ pickFirstUnrecorded(); showPrompt(); }
          if (!rows.length) { list.innerHTML = ''; return; }
          list.innerHTML = '<div class="vx-shelfhead">The Archive \u00b7 ' + rows.length + ' kept</div>' +
            rows.map(function(row){
              var when = row.created_at ? new Date(row.created_at).toLocaleDateString() : '';
              var rTitle = (row.title || KIND_LABEL[row.kind] || 'Recording').replace(/\.\s*$/,'');
              return '<div class="voice-item vx-row" data-path="' + e(row.storage_path) + '" data-id="' + e(row.id) + '" data-title="' + e(rTitle) + '">' +
                '<button class="voice-play vx-ic" type="button" aria-label="Play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>' +
                '<span class="vx-rowmain"><span class="vx-rowline"><span class="vx-rowtitle">' + e(rTitle) + '</span>' + (when ? '<span class="vx-rowdate">\u00b7 ' + when + '</span>' : '') + '</span><span class="vx-shared" hidden></span></span>' +
                '<span class="vx-actions"><button class="vx-share" type="button">Share</button>' +
                '<button class="voice-del" type="button">Delete</button></span></div>';
            }).join('');
          list.querySelectorAll('.voice-play').forEach(function(b){
            b.addEventListener('click', function(){
              var path = b.closest('.voice-item').getAttribute('data-path');
              FC.sb.storage.from('voice').createSignedUrl(path, 3600).then(function(s2){
                var url = s2 && s2.data && s2.data.signedUrl;
                if (url) { var a = new Audio(url); a.play(); }
              });
            });
          });
          list.querySelectorAll('.vx-share').forEach(function(b){
            b.addEventListener('click', function(){
              var item = b.closest('.voice-item');
              var path = item.getAttribute('data-path');
              var rTitle2 = item.getAttribute('data-title');
              var label = window.prompt('Who is this for? A name helps you keep track of who has what. Leave blank to skip.');
              if (label === null) return;
              label = (label || '').trim() || null;
              b.disabled = true; b.textContent = 'Making link\u2026';
              FC.ready.then(function(){
                var uid2 = FC.uid && FC.uid();
                if (!uid2) throw new Error('no session');
                return FC.sb.from('voice_shares').insert({ user_id: uid2, storage_path: path, title: rTitle2, label: label }).select('token').single();
              }).then(function(r2){
                var tok = r2 && r2.data && r2.data.token;
                if (!tok) throw new Error('no token');
                var url = location.origin + '/share.html?t=' + tok;
                var copied = navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject();
                return copied.then(function(){ b.textContent = 'Link copied'; }, function(){ window.prompt('Copy this link:', url); b.textContent = 'Link made'; })
                  .then(function(){
                    loadShares(list);
                    setTimeout(function(){ b.textContent = 'Share'; b.disabled = false; }, 2200);
                  });
              }).catch(function(){ b.disabled = false; b.textContent = 'Share'; setMsg('Could not make the link just now.', true); });
            });
          });
          list.querySelectorAll('.voice-del').forEach(function(b){
            b.addEventListener('click', function(){
              var item = b.closest('.voice-item');
              var path = item.getAttribute('data-path'), id = item.getAttribute('data-id');
              if (!window.confirm('Delete this recording? This cannot be undone.')) return;
              b.disabled = true;
              FC.sb.storage.from('voice').remove([path])
                .then(function(){ return FC.sb.from('voice_recordings').delete().eq('id', id); })
                .then(function(){ loadList(); }, function(){ b.disabled = false; });
            });
          });
          loadShares(list);
        });
    }).catch(function(){});
  }

  function loadShares(list){
    if (!window.FC || !FC.live) return;
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) return;
      return FC.sb.from('voice_shares').select('storage_path,label')
        .eq('user_id', uid).is('revoked_at', null).gt('expires_at', new Date().toISOString())
        .then(function(r){
          var by = {};
          ((r && r.data) || []).forEach(function(sh){
            (by[sh.storage_path] = by[sh.storage_path] || []).push(sh.label);
          });
          list.querySelectorAll('.voice-item').forEach(function(item){
            var el = item.querySelector('.vx-shared');
            if (!el) return;
            var labels = by[item.getAttribute('data-path')];
            if (!labels || !labels.length) { el.hidden = true; el.innerHTML = ''; return; }
            var named = labels.filter(Boolean);
            var who = named.length ? named.join(', ') : (labels.length + (labels.length > 1 ? ' links' : ' link'));
            el.innerHTML = 'Shared with ' + e(who) + ' <button class="vx-revoke" type="button">Revoke</button>';
            el.hidden = false;
            var rv = el.querySelector('.vx-revoke');
            rv.addEventListener('click', function(){
              if (!window.confirm('Turn off every shared link for this recording? People you sent it to will lose access.')) return;
              rv.disabled = true;
              FC.sb.from('voice_shares').update({ revoked_at: new Date().toISOString() })
                .eq('user_id', FC.uid()).eq('storage_path', item.getAttribute('data-path')).is('revoked_at', null)
                .then(function(){ loadShares(list); }, function(){ rv.disabled = false; });
            });
          });
        });
    }).catch(function(){});
  }

  function boot(){
    var signedIn = window.FC && FC.live;
    if (!signedIn && guest) guest.hidden = false;
    keepPending();
    loadList();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
