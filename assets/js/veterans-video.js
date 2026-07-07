/* Veterans free films: lead-generation video modal. Public, no account needed.
   ADD YOUR THREE VIDEO URLS BELOW. Use MP4 files hosted anywhere, for example a
   public Supabase storage bucket. Leave a URL blank and that film shows a
   dignified "on its way" card that still drives signups. */
(function(){
  'use strict';

  // ====== Add your video URLs here (direct MP4 links). Blank = coming-soon state. ======
  var VIDEOS = {
    reconnecting: '',
    emotion: '',
    temper: ''
  };
  // =====================================================================================

  var modal = document.getElementById('vetVideoModal');
  if (!modal || !window.VET) return;
  var e = VET.esc;
  var stage = document.getElementById('vetVideoStage');
  var titleEl = document.getElementById('vetVideoTitle');

  function open(key, title){
    if (titleEl) titleEl.textContent = title || '';
    var url = VIDEOS[key] || '';
    if (url) {
      stage.innerHTML = '<video controls autoplay playsinline preload="metadata" src="' + e(url) +
        '" style="width:100%;height:100%;background:#000"></video>';
    } else {
      stage.innerHTML =
        '<div class="vet-vsoon">' +
          '<div class="eyebrow brass" style="margin-bottom:12px">On its way</div>' +
          '<b style="font-size:20px;color:var(--bone)">This film is being finished.</b>' +
          '<p class="small" style="margin:10px auto 0;max-width:44ch">Join free and we will send it to you the moment it is ready, along with the rest of the field guide.</p>' +
        '</div>';
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close(){
    modal.hidden = true;
    if (stage) stage.innerHTML = '';   // stops any playback
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.vet-film').forEach(function(btn){
    btn.addEventListener('click', function(){
      open(btn.getAttribute('data-key'), btn.getAttribute('data-title'));
    });
  });
  modal.querySelectorAll('[data-vclose]').forEach(function(el){ el.addEventListener('click', close); });
  document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape' && !modal.hidden) close(); });
})();
