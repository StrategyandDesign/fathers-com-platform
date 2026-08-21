/* esign-client.js  ·  browser side of the e-sign bridge.
   Calls the server-side esign-bridge function only. It never calls the e-sign
   API directly and never holds credentials. Supabase attaches the caller's
   session JWT to the invoke, which the bridge verifies. */
window.ESIGN = window.ESIGN || {};
(function(){
  'use strict';

  // Self-sign an approved certificate award. Resolves with { ok, envelope_id, verify }.
  ESIGN.selfSignCertificate = function(awardId){
    if (!window.FC || !FC.live) return Promise.reject(new Error('e-sign is not available'));
    if (!awardId) return Promise.reject(new Error('awardId required'));
    return FC.ready.then(function(){
      return FC.sb.functions.invoke('esign-bridge', {
        body: { action: 'self_sign_certificate', award_id: awardId }
      });
    }).then(function(r){
      if (r.error) throw r.error;
      return r.data;
    });
  };
})();
