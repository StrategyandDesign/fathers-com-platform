/* Veterans hub. Tools-first. Personalizes the greeting and names the single
   best-fit support resource in the minimal support line. The full directory
   lives on veterans-resources.html. */
(function(){
  'use strict';
  if (!window.VET) return;
  var greetEl = document.getElementById('vetGreet');
  var nameEl = document.getElementById('vetMatchName');
  var callEl = document.getElementById('vetMatchCall');
  if (!greetEl && !nameEl) return;

  var GREET = {
    active: 'You are still in the fight. This is for the front no one briefs you on: home.',
    guard_reserve: 'You carry two lives at once. This is for the one waiting at home.',
    veteran: 'You carried the load out there. Here is where you pick up the one that matters most.',
    family: 'You hold the line at home. Here is support for your family and the one who served.'
  };

  function init(){
    VET.getProfile().then(function(profile){
      if (!profile || !profile.service_context) { location.href = 'veterans-start.html'; return; }
      if (greetEl && GREET[profile.service_context]) greetEl.textContent = GREET[profile.service_context];

      var res = VET.matchResource(profile);
      if (nameEl && res) nameEl.textContent = res.name;
      if (callEl) {
        if (res && res.phoneHref) { callEl.setAttribute('href', res.phoneHref); }
        else { callEl.style.display = 'none'; }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* START HERE: three steps with honest done-states.
   Steps 1 and 2 are device-local flags; step 3 is real (a recording exists). */
(function(){
  function setState(step, done){
    var card=document.querySelector('[data-vetstep="'+step+'"]'); if(!card) return;
    var st=card.querySelector('[data-state]'); if(!st) return;
    if(done){ st.textContent='DONE \u2713'; st.style.color='var(--pine-hi, #7fb069)'; card.style.opacity='.82'; }
    else { st.textContent='NOT YET'; st.style.color='var(--ash)'; }
  }
  document.addEventListener('DOMContentLoaded', function(){
    if(!document.getElementById('startHere')) return;
    var ck=false, fm=false;
    try{ ck = localStorage.getItem('fc_vet_step_checkin')==='1'; fm = localStorage.getItem('fc_vet_step_film')==='1'; }catch(_){}
    setState('checkin', ck); setState('film', fm); setState('voice', false);
    try{
      if(window.FC && FC.live && FC.uid && FC.uid()){
        FC.sb.from('voice_recordings').select('id',{count:'exact',head:true}).eq('user_id',FC.uid())
          .then(function(r){ setState('voice', (r.count||0)>0); }, function(){});
      } else if(localStorage.getItem('fc_vet_step_voice')==='1'){ setState('voice', true); }
    }catch(_){}
  });
})();
