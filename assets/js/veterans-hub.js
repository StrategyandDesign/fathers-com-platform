/* Veterans hub. Renders support matched to the father's context.
   The rest of the hub (Voice, modules, check-in) is static in the page. */
(function(){
  'use strict';
  if (!window.VET) return;
  var matchEl = document.getElementById('vetMatch');
  var secEl = document.getElementById('vetSecondary');
  var greetEl = document.getElementById('vetGreet');
  if (!matchEl) return;

  var GREET = {
    active: 'You are serving now. Here is support built for that.',
    guard_reserve: 'Guard and Reserve carry a double load. Here is support for it.',
    veteran: 'Welcome home. Here is support built for veterans and their families.',
    family: 'You hold the home together. Here is support for military families.'
  };

  function init(){
    VET.getProfile().then(function(profile){
      if (!profile || !profile.service_context) {
        // No context yet. Send them to the front door to answer one question.
        location.href = 'veterans.html';
        return;
      }

      if (greetEl && GREET[profile.service_context]) {
        greetEl.textContent = GREET[profile.service_context];
      }

      var primary = VET.matchResource(profile);
      matchEl.innerHTML = VET.resourceCardHTML(primary, { primary: true, full: true });

      if (secEl) {
        var extra = VET.secondaryKeys(profile).map(function(k){
          return VET.resourceCardHTML(VET.RESOURCES[k], { full: false });
        }).join('');
        secEl.innerHTML = extra;
      }
    });
  }

  // Wait for the footer client scripts to load before reading the signed-in profile.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
