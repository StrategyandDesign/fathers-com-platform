/* The shared player. One token, one recording, nothing collected.
   A recipient opens the link, hears the father's voice, and that is all. */
(function(){
  'use strict';
  var title = document.getElementById('shTitle');
  var audio = document.getElementById('shAudio');
  var msg = document.getElementById('shMsg');
  function fail(txt){
    if (title) title.textContent = 'This link is not active.';
    if (msg) msg.textContent = txt || 'It may have expired, or the father who made it turned it off.';
    if (audio) audio.hidden = true;
  }
  var t = new URLSearchParams(location.search).get('t');
  if (!t) { fail('No recording was named in this link.'); return; }
  if (!(window.FC && FC.live)) { fail('The player could not start.'); return; }
  FC.ready.then(function(){
    return FC.sb.rpc('get_shared_voice', { p_token: t }).then(function(r){
      var row = r && r.data && r.data[0];
      if (!row) { fail(); return; }
      if (title) title.textContent = (row.title || 'A message for you').replace(/\.\s*$/, '');
      document.title = 'A message for you | Fathers.com';
      return FC.sb.storage.from('voice').download(row.storage_path).then(function(d){
        if (!d || d.error || !d.data) { fail('The recording could not be loaded.'); return; }
        audio.src = URL.createObjectURL(d.data);
        audio.hidden = false;
        if (msg) msg.textContent = 'Recorded on Fathers.com. Yours to replay.';
      });
    });
  }).catch(function(){ fail(); });
})();
