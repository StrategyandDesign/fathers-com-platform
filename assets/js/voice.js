/* Voice. Record a short audio message a child can replay.
   Records in the browser, previews, and saves to Supabase storage when
   signed in. Degrades cleanly with no mic, denied permission, or an old browser. */
(function(){
  'use strict';
  var app = document.getElementById('voiceApp');
  if (!app || !window.VET) return;
  var e = VET.esc;

  var recBtn = document.getElementById('voiceRec');
  var stopBtn = document.getElementById('voiceStop');
  var preview = document.getElementById('voicePreview');
  var after = document.getElementById('voiceAfter');
  var redo = document.getElementById('voiceRedo');
  var save = document.getElementById('voiceSave');
  var msg = document.getElementById('voiceMsg');
  var timerEl = document.getElementById('voiceTimer');
  var typeWrap = document.querySelector('[data-voice-types]');

  var kind = 'bedtime_story';
  var mediaRecorder = null, chunks = [], stream = null, blob = null, tick = null, seconds = 0;

  var supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!supported) {
    setMsg('Recording is not supported in this browser. Try Chrome or Safari on your phone.', true);
    if (recBtn) recBtn.disabled = true;
    return;
  }

  function setMsg(t, err){ if (!msg) return; msg.textContent = t || ''; msg.style.color = err ? 'var(--error)' : 'var(--ash)'; }
  function fmt(s){ var m = Math.floor(s / 60); var r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function startTimer(){ seconds = 0; if (timerEl) timerEl.textContent = '0:00'; tick = setInterval(function(){ seconds++; if (timerEl) timerEl.textContent = fmt(seconds); if (seconds >= 300) stop(); }, 1000); }
  function stopTimer(){ if (tick) { clearInterval(tick); tick = null; } }
  function releaseStream(){ if (stream) { stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; } }

  if (typeWrap) typeWrap.querySelectorAll('[data-kind]').forEach(function(b){
    b.addEventListener('click', function(){
      kind = b.getAttribute('data-kind');
      typeWrap.querySelectorAll('[data-kind]').forEach(function(x){ x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });

  function record(){
    setMsg('');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(s){
      stream = s;
      chunks = []; blob = null;
      try { mediaRecorder = new MediaRecorder(stream); }
      catch (err) { mediaRecorder = new MediaRecorder(stream, {}); }
      mediaRecorder.ondataavailable = function(ev){ if (ev.data && ev.data.size) chunks.push(ev.data); };
      mediaRecorder.onstop = function(){
        blob = new Blob(chunks, { type: (chunks[0] && chunks[0].type) || 'audio/webm' });
        if (preview) { preview.src = URL.createObjectURL(blob); preview.hidden = false; }
        if (after) after.hidden = false;
        releaseStream();
      };
      mediaRecorder.start();
      startTimer();
      if (recBtn) recBtn.hidden = true;
      if (stopBtn) stopBtn.hidden = false;
      if (preview) preview.hidden = true;
      if (after) after.hidden = true;
    }).catch(function(err){
      var m = 'Could not start recording.';
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) m = 'Microphone access was blocked. Allow it in your browser settings, then try again.';
      else if (err && err.name === 'NotFoundError') m = 'No microphone was found on this device.';
      setMsg(m, true);
    });
  }

  function stop(){
    stopTimer();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recBtn) recBtn.hidden = false;
    if (stopBtn) stopBtn.hidden = true;
  }

  function resetForRedo(){
    blob = null;
    if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
    if (after) after.hidden = true;
    if (timerEl) timerEl.textContent = '0:00';
    setMsg('');
  }

  function doSave(){
    if (!blob) return;
    if (!window.FC || !FC.live) {
      setMsg('Saved on this device. Sign in to keep your recordings across devices.');
      if (after) after.hidden = true;
      return;
    }
    if (save) { save.disabled = true; save.textContent = 'Saving\u2026'; }
    setMsg('Saving your recording\u2026');
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) { location.href = 'login.html?next=' + encodeURIComponent('voice.html'); return; }
      var path = uid + '/' + Date.now() + '.webm';
      return FC.sb.storage.from('voice').upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false })
        .then(function(up){
          if (up && up.error) throw up.error;
          var vTitle=(window.FC_VOICE_PROMPT && window.FC_VOICE_PROMPT.title) || null;
          try{ localStorage.setItem('fc_vet_step_voice','1'); }catch(_){}
          return FC.sb.from('voice_recordings').insert({ user_id: uid, kind: kind, storage_path: path, title: vTitle });
        })
        .then(function(){
          setMsg('Saved. It is waiting for your child whenever they want it.');
          if (after) after.hidden = true;
          if (save) { save.disabled = false; save.textContent = 'Save it'; }
          loadList();
        });
    }).catch(function(){
      if (save) { save.disabled = false; save.textContent = 'Save it'; }
      setMsg('Could not save it. Your recording is still here, try Save again.', true);
    });
  }

  if (recBtn) recBtn.addEventListener('click', record);
  if (stopBtn) stopBtn.addEventListener('click', stop);
  if (redo) redo.addEventListener('click', function(){ resetForRedo(); record(); });
  if (save) save.addEventListener('click', doSave);

  // Saved recordings list (best effort).
  var KIND_LABEL = { bedtime_story: 'Bedtime story', message: 'A message', thinking: 'Thinking of you' };
  function loadList(){
    var list = document.getElementById('voiceList');
    if (!list || !window.FC || !FC.live) return;
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) return;
      return FC.sb.from('voice_recordings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
        .then(function(r){
          var rows = (r && r.data) || [];
          if (!rows.length) { list.innerHTML = ''; return; }
          list.innerHTML = '<div class="eyebrow" style="margin:36px 0 16px">YOUR RECORDINGS</div>' +
            rows.map(function(row){
              return '<div class="voice-item" data-path="' + e(row.storage_path) + '" data-id="' + e(row.id) + '">' +
                '<span>' + e(KIND_LABEL[row.kind] || 'Recording') + '</span>' +
                '<span class="voice-item-actions"><button class="link brass voice-play" type="button">Play</button>' +
                '<button class="voice-del" type="button">Delete</button></span></div>';
            }).join('');
          list.querySelectorAll('.voice-play').forEach(function(b){
            b.addEventListener('click', function(){
              var path = b.closest('.voice-item').getAttribute('data-path');
              FC.sb.storage.from('voice').createSignedUrl(path, 3600).then(function(s){
                var url = s && s.data && s.data.signedUrl;
                if (url) { var a = new Audio(url); a.play(); }
              });
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
        });
    }).catch(function(){});
  }
  // Wait for footer client scripts before loading saved recordings.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadList);
  else loadList();
})();
