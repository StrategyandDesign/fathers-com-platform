/* A participant's own settings.

   The account page was a shell. A man had no way to see what the platform holds
   about him, change how it contacts him, withdraw from research, take his data
   with him, or close his account.

   For the men this serves that is not a nicety. They are in treatment or
   reentry, several of them are enrolled through a programme rather than by their
   own choice, and the platform holds a document about how they father and how
   they carry themselves. Being able to see it, control it, and leave with it is
   the difference between a tool and a file kept on you.

   Every control here does something. Nothing is decorative.

   Grouping follows what people expect: who you are, how we reach you, what is
   private, what leaves with you, and how to close it. One decision per row. */
(function(){
  var root = document.getElementById('acctRoot');
  if(!root) return;

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function say(id, m, bad){
    var n = el(id); if(!n) return;
    n.textContent = m; n.className = 'fine' + (bad ? ' brass' : '');
    if(m) setTimeout(function(){ if(n.textContent === m) n.textContent = ''; }, 4000);
  }

  var ME = null, PREFS = null, CONSENT = null;

  function shell(){
    root.innerHTML =
    '<div class="card" style="padding:26px;margin-bottom:18px">'+
      '<div class="eyebrow" style="margin-bottom:6px">YOU</div>'+
      '<h3 style="margin:0 0 14px">Your name and sign in</h3>'+
      '<div class="field" style="max-width:420px"><label for="acName">Name</label>'+
        '<input class="input" id="acName" placeholder="How you want to be addressed"></div>'+
      '<div class="field" style="max-width:420px"><label for="acEmail">Email</label>'+
        '<input class="input" id="acEmail" disabled></div>'+
      '<p class="fine" style="margin:0 0 14px;color:var(--ash)">Your email is how you sign in. To change it, contact your facilitator.</p>'+
      '<button class="btn btn-primary btn-sm" id="acSaveName">Save</button> <span id="acNameMsg" class="fine"></span>'+
    '</div>'+

    '<div class="card" style="padding:26px;margin-bottom:18px">'+
      '<div class="eyebrow" style="margin-bottom:6px">HOW WE REACH YOU</div>'+
      '<h3 style="margin:0 0 6px">Email</h3>'+
      '<p class="fine" style="margin:0 0 16px;color:var(--ash)">Weekly plan and course reminders stay on so you do not lose the thread. Turn either off anytime. News stays off until you opt in.</p>'+
      '<label class="actionrow" style="cursor:pointer"><input type="checkbox" id="acWeekly">'+
        '<div><b>The week\u2019s move</b><div class="fine">One short message a week naming the one action from your plan. Nothing else.</div></div></label>'+
      '<label class="actionrow" style="cursor:pointer;margin-top:12px"><input type="checkbox" id="acCourse">'+
        '<div><b>Course reminders</b><div class="fine">Only while you are part-way through a course.</div></div></label>'+
      '<label class="actionrow" style="cursor:pointer;margin-top:12px"><input type="checkbox" id="acNews">'+
        '<div><b>News from Fathers.com</b><div class="fine">Occasional. You can turn this off and keep the other two.</div></div></label>'+
      '<div style="margin-top:16px"><button class="btn btn-primary btn-sm" id="acSavePrefs">Save</button> <span id="acPrefsMsg" class="fine"></span></div>'+
    '</div>'+

    '<div class="card" style="padding:26px;margin-bottom:18px">'+
      '<div class="eyebrow" style="margin-bottom:6px">WHO CAN SEE YOUR RESULTS</div>'+
      '<h3 style="margin:0 0 6px">Your profile is private</h3>'+
      '<p class="fine" style="margin:0 0 16px;color:var(--ash)">Your answers and your report belong to you. Your facilitator can see that you finished, so they can walk with you. They cannot see the men in another programme, and no one outside your programme can see you.</p>'+
      '<label class="actionrow" style="cursor:pointer"><input type="checkbox" id="acShareFac">'+
        '<div><b>Let my facilitator open my report</b><div class="fine">Off means they see only that you completed it, and the date.</div></div></label>'+
      '<div style="margin-top:16px"><button class="btn btn-primary btn-sm" id="acSaveShare">Save</button> <span id="acShareMsg" class="fine"></span></div>'+
    '</div>'+

    '<div class="card" style="padding:26px;margin-bottom:18px">'+
      '<div class="eyebrow" style="margin-bottom:6px">RESEARCH</div>'+
      '<h3 style="margin:0 0 6px">Helping the next man</h3>'+
      '<p class="fine" style="margin:0 0 16px;color:var(--ash)">Separate from everything above, and entirely your choice. Saying no changes nothing about what you receive here. You can withdraw at any time before your record is anonymised, and once it is anonymised it can no longer be found or removed, because nothing links it back to you. That is the point of anonymising it, and it is why we say so plainly.</p>'+
      '<label class="actionrow" style="cursor:pointer"><input type="checkbox" id="acResearch">'+
        '<div><b>Allow my results to be used, anonymously, for research</b><div class="fine">No name, no email, no dates, nothing that identifies you or your programme.</div></div></label>'+
      '<div style="margin-top:16px"><button class="btn btn-primary btn-sm" id="acSaveResearch">Save</button> <span id="acResearchMsg" class="fine"></span></div>'+
    '</div>'+

    '<div class="card" style="padding:26px;margin-bottom:18px">'+
      '<div class="eyebrow" style="margin-bottom:6px">YOUR DATA</div>'+
      '<h3 style="margin:0 0 6px">Take a copy with you</h3>'+
      '<p class="fine" style="margin:0 0 16px;color:var(--ash)">Everything the platform holds about you, in one file. Yours to keep whatever happens to your account.</p>'+
      '<button class="btn btn-secondary btn-sm" id="acExport">Download my data</button> <span id="acExportMsg" class="fine"></span>'+
    '</div>'+

    '<div class="card" style="padding:26px">'+
      '<div class="eyebrow" style="margin-bottom:6px">CLOSING YOUR ACCOUNT</div>'+
      '<h3 style="margin:0 0 6px">Delete everything</h3>'+
      '<p class="fine" style="margin:0 0 16px;color:var(--ash)">Your answers, your reports, your plans and your course progress are removed. If you allowed research use and your record has already been anonymised, that copy cannot be found or removed, because nothing links it to you. Download your own copy first if you want one. This cannot be undone.</p>'+
      '<button class="btn btn-secondary btn-sm" id="acDelete">Delete my account</button> <span id="acDeleteMsg" class="fine"></span>'+
    '</div>';
  }

  function load(){
    var uid = FC.uid && FC.uid();
    if(!uid) return;
    FC.sb.from('profiles').select('id,name,email,prefs').eq('id', uid).maybeSingle()
      .then(function(r){
        ME = (r && r.data) || {};
        PREFS = ME.prefs || {};
        if(el('acName'))  el('acName').value  = ME.name  || '';
        if(el('acEmail')) el('acEmail').value = ME.email || '';
        // Retention defaults for new participants: weekly + course on, news opt-in.
        if(PREFS.email_weekly === undefined && PREFS.email_course === undefined && PREFS.email_news === undefined){
          PREFS.email_weekly = true; PREFS.email_course = true; PREFS.email_news = false;
          FC.sb.from('profiles').update({ prefs: PREFS }).eq('id', uid).then(function(){}, function(){});
        }
        if(el('acWeekly'))   el('acWeekly').checked   = PREFS.email_weekly !== false;
        if(el('acCourse'))   el('acCourse').checked   = PREFS.email_course !== false;
        if(el('acNews'))     el('acNews').checked     = !!PREFS.email_news;
        // Facilitator sharing defaults ON: it is how a programme supports him.
        if(el('acShareFac')) el('acShareFac').checked = PREFS.share_facilitator !== false;
      }, function(){});
    FC.sb.from('research_consent').select('*').eq('user_id', uid).maybeSingle()
      .then(function(r){
        CONSENT = (r && r.data) || null;
        if(el('acResearch')) el('acResearch').checked =
          !!(CONSENT && CONSENT.granted && !CONSENT.withdrawn_at);
      }, function(){});
  }

  function savePrefs(patch, msgId, okText){
    var uid = FC.uid && FC.uid();
    if(!uid) return say(msgId, 'Sign in first.', true);
    PREFS = PREFS || {};
    for(var k in patch) PREFS[k] = patch[k];
    FC.sb.from('profiles').update({ prefs: PREFS }).eq('id', uid).then(function(r){
      if(r && r.error) return say(msgId, r.error.message, true);
      say(msgId, okText);
    }, function(e){ say(msgId, (e && e.message) || 'Could not save.', true); });
  }

  function wire(){
    el('acSaveName').addEventListener('click', function(){
      var uid = FC.uid && FC.uid();
      FC.sb.from('profiles').update({ name: el('acName').value.trim() }).eq('id', uid)
        .then(function(r){ say('acNameMsg', (r && r.error) ? r.error.message : 'Saved.', !!(r && r.error)); },
              function(){ say('acNameMsg', 'Could not save.', true); });
    });

    el('acSavePrefs').addEventListener('click', function(){
      savePrefs({ email_weekly: el('acWeekly').checked,
                  email_course: el('acCourse').checked,
                  email_news:   el('acNews').checked }, 'acPrefsMsg', 'Saved.');
    });

    el('acSaveShare').addEventListener('click', function(){
      savePrefs({ share_facilitator: el('acShareFac').checked }, 'acShareMsg', 'Saved.');
    });

    el('acSaveResearch').addEventListener('click', function(){
      var uid = FC.uid && FC.uid(); var on = el('acResearch').checked;
      FC.sb.from('research_consent').upsert({
        user_id: uid, granted: on, consent_version: 'v1',
        granted_at: on ? new Date().toISOString() : null,
        withdrawn_at: on ? null : new Date().toISOString(),
        irreversibility_disclosed: true,
        updated_at: new Date().toISOString()
      }, { onConflict:'user_id' }).then(function(r){
        if(r && r.error) return say('acResearchMsg', r.error.message, true);
        say('acResearchMsg', on ? 'Thank you. Saved.' : 'Withdrawn. Saved.');
      }, function(){ say('acResearchMsg', 'Could not save.', true); });
    });

    el('acExport').addEventListener('click', function(){
      var uid = FC.uid && FC.uid();
      say('acExportMsg', 'Gathering\u2026');
      /* "Everything the platform holds about you" has to mean it. This shipped
         results and sittings only, leaving out his actual answers, which are the
         most personal thing here, and his plan progress. */
      var bundle = { exported_at: new Date().toISOString(), account: ME, preferences: PREFS };
      FC.sb.from('keystone_results').select('*').eq('user_id', uid).then(function(r){
        bundle.results = (r && r.data) || [];
        return FC.sb.from('keystone_sessions').select('*').eq('user_id', uid);
      }).then(function(r){
        bundle.sittings = (r && r.data) || [];
        var ids = bundle.sittings.map(function(x){ return x.id; });
        return ids.length
          ? FC.sb.from('keystone_answers').select('*').in('session_id', ids)
          : Promise.resolve({ data: [] });
      }).then(function(r){
        bundle.answers = (r && r.data) || [];
        return FC.sb.from('plan_checkins').select('*').eq('user_id', uid);
      }).then(function(r){
        bundle.plan_progress = (r && r.data) || [];
        return FC.sb.from('research_consent').select('*').eq('user_id', uid);
      }).then(function(r){
        bundle.research_consent = (r && r.data) || [];
        var blob = new Blob([JSON.stringify(bundle, null, 2)], { type:'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'fathers-com-my-data.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        say('acExportMsg', 'Downloaded.');
      }, function(){ say('acExportMsg', 'Could not gather your data.', true); });
    });

    el('acDelete').addEventListener('click', function(){
      var btn = el('acDelete');
      if(btn.dataset.armed !== '1'){
        btn.dataset.armed = '1';
        btn.textContent = 'Press again to delete everything';
        say('acDeleteMsg', 'This cannot be undone.', true);
        setTimeout(function(){ btn.dataset.armed=''; btn.textContent='Delete my account'; }, 8000);
        return;
      }
      var uid = FC.uid && FC.uid();
      say('acDeleteMsg', 'Deleting\u2026');
      /* "Delete everything" has to mean everything he can see.
         This removed results, sittings and the profile row, and left his plan
         check-ins and his course enrolments behind. His raw answers do go, but
         only because keystone_answers cascades from keystone_sessions, which is
         luck rather than intent, so sessions are deleted last on purpose.

         Research records are deliberately NOT touched: once a record has been
         anonymised nothing links it to him, which is what the consent text says
         plainly. Withdrawing before that point is done from the switch above. */
      FC.sb.from('plan_checkins').delete().eq('user_id', uid).then(function(){
        return FC.sb.from('certificate_enrollments').delete().eq('user_id', uid);
      }).then(function(){
        return FC.sb.from('keystone_results').delete().eq('user_id', uid);
      }).then(function(){
        return FC.sb.from('keystone_sessions').delete().eq('user_id', uid);   // cascades to answers
      }).then(function(){
        return FC.sb.from('research_consent').delete().eq('user_id', uid);
      }).then(function(){
        return FC.sb.from('profiles').delete().eq('id', uid);
      }).then(function(){
        say('acDeleteMsg', 'Deleted. Signing you out.');
        setTimeout(function(){ if(FC.signOut) FC.signOut(); window.location.href=(window.FCPath && FCPath.afterSignOut)?FCPath.afterSignOut():'index.html'; }, 1200);
      }, function(e){ say('acDeleteMsg', (e && e.message) || 'Could not delete. Contact your facilitator.', true); });
    });
  }

  function boot(){
    shell();
    if(!(window.FC && FC.live)){
      root.insertAdjacentHTML('afterbegin',
        '<div class="notice brass" style="margin-bottom:18px">Not connected. These controls will not save.</div>');
      return;
    }
    FC.ready.then(function(){
      if(!(FC.uid && FC.uid())){
        root.innerHTML = '<div class="card" style="padding:30px">'+
          '<h3 class="d-22" style="margin:0 0 8px">Sign in to see your settings</h3>'+
          '<a class="btn btn-yellow btn-sm" href="login.html">Sign in</a></div>';
        return;
      }
      wire(); load();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
