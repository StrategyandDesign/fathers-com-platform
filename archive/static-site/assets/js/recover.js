/* Rebuild results that were lost.

   WHAT HAPPENED
   keystone_results had no assessment_slug column while the app was writing it.
   Every insert was rejected, and the save path marked the sitting complete
   anyway. Six men finished a profile, saw "done", and had no result stored.

   WHAT SURVIVED
   Their answers. keystone_answers is written item by item during the sitting and
   was never affected. Everything needed to rebuild the result is there.

   HOW THIS REBUILDS THEM
   It does not reimplement scoring. It loads the same instruments the app loads,
   feeds the stored answers into the same KS engine, and calls the same
   KS.score(). A rebuilt result is therefore identical to the one the man would
   have received, not an approximation of it.

   WHICH INSTRUMENT
   The result row that would have said is the thing that is missing, so the
   instrument is identified from the answer keys. The two profiles share 13 scale
   keys and each has 13 of its own, so a sitting that contains 'involvement' is a
   father profile and one containing 'presence' is a manhood profile. A sitting
   showing neither, or both, is reported and skipped rather than guessed at.

   NOTHING IS WRITTEN UNTIL YOU PRESS WRITE. Preview first. */
(function(){
  var root = document.getElementById('rcRoot');
  if(!root) return;

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function say(h){ root.innerHTML = h; }

  var FOUND = [];   // {session_id, user_id, slug, scored, items}

  function scaleKeysOf(K){
    var out = {};
    (K.sections||[]).forEach(function(s){ s.scales.forEach(function(x){ out[x.key] = true; }); });
    return out;
  }

  /* Identify the instrument from the scale keys present in the answers. */
  function detectInstrument(answerKeys){
    var F = scaleKeysOf(window.KEYSTONE), M = scaleKeysOf(window.KEYSTONE_MANHOOD);
    var fOnly = 0, mOnly = 0;
    answerKeys.forEach(function(k){
      var scale = String(k).split('.')[1];
      if(!scale) return;
      if(F[scale] && !M[scale]) fOnly++;
      if(M[scale] && !F[scale]) mOnly++;
    });
    if(fOnly > 0 && mOnly === 0) return window.KEYSTONE;
    if(mOnly > 0 && fOnly === 0) return window.KEYSTONE_MANHOOD;
    return null;                      // ambiguous: report, never guess
  }

  /* Score using the real engine, exactly as a live sitting does. */
  function scoreFrom(answers){
    var keys = answers.map(function(a){ return a.item_key; });
    var INS = detectInstrument(keys);
    if(!INS) return null;
    KS.init(INS);
    KS.setPath('father');             // full path: every item, both instruments
    answers.forEach(function(a){ KS.saveAnswer(a.item_key, a.value); });
    return { slug: INS.slug, scored: KS.score(), items: answers.length };
  }

  function scan(){
    say('<p class="ash">Looking for sittings marked complete with no result\u2026</p>');
    FC.sb.from('keystone_sessions').select('id,user_id,completed_at')
      .eq('status','completed').order('completed_at',{ascending:false})
      .then(function(s){
        if(s.error){ say('<div class="notice brass">'+esc(s.error.message)+'</div>'); return; }
        var sessions = s.data || [];
        if(!sessions.length){ say('<p class="ash">No completed sittings found.</p>'); return; }
        FC.sb.from('keystone_results').select('session_id').then(function(r){
          var has = {};
          ((r && r.data) || []).forEach(function(x){ has[x.session_id] = true; });
          var orphans = sessions.filter(function(x){ return !has[x.id]; });
          if(!orphans.length){
            say('<div class="notice"><b>Nothing to recover.</b> Every completed sitting has a result.</div>');
            return;
          }
          loadAnswers(orphans);
        }, function(e){ say('<div class="notice brass">'+esc(e.message||'read failed')+'</div>'); });
      }, function(e){ say('<div class="notice brass">'+esc(e.message||'read failed')+'</div>'); });
  }

  function loadAnswers(orphans){
    say('<p class="ash">Found '+orphans.length+'. Reading their answers\u2026</p>');
    var ids = orphans.map(function(o){ return o.id; });
    FC.sb.from('keystone_answers').select('session_id,item_key,value').in('session_id', ids)
      .then(function(a){
        if(a.error){ say('<div class="notice brass">'+esc(a.error.message)+'</div>'); return; }
        var by = {};
        ((a && a.data) || []).forEach(function(x){
          (by[x.session_id] = by[x.session_id] || []).push(x);
        });
        FOUND = [];
        var skipped = [];
        orphans.forEach(function(o){
          var ans = by[o.id] || [];
          if(!ans.length){ skipped.push({ id:o.id, why:'no answers stored' }); return; }
          var out = scoreFrom(ans);
          if(!out){ skipped.push({ id:o.id, why:'instrument could not be identified' }); return; }
          FOUND.push({ session_id:o.id, user_id:o.user_id, completed_at:o.completed_at,
                       slug:out.slug, scored:out.scored, items:out.items });
        });
        preview(skipped);
      }, function(e){ say('<div class="notice brass">'+esc(e.message||'read failed')+'</div>'); });
  }

  function preview(skipped){
    var rows = FOUND.map(function(f){
      return '<tr>'+
        '<td style="padding:6px 12px 6px 0">'+esc(String(f.session_id).slice(0,8))+'</td>'+
        '<td style="padding:6px 12px 6px 0">'+esc(f.slug)+'</td>'+
        '<td style="padding:6px 12px 6px 0">'+f.items+' answers</td>'+
        '<td style="padding:6px 12px 6px 0">overall '+Math.round(f.scored.overall)+'</td>'+
        '<td style="padding:6px 12px 6px 0">'+esc(String(f.completed_at||'').slice(0,10))+'</td>'+
      '</tr>';
    }).join('');
    var skipHtml = skipped.length
      ? '<div class="notice brass" style="margin-top:16px"><b>'+skipped.length+' skipped.</b> '+
        skipped.map(function(s){ return esc(String(s.id).slice(0,8))+': '+esc(s.why); }).join('; ')+
        '. These are not guessed at.</div>' : '';
    say(
      '<div class="card" style="padding:24px">'+
        '<h3 style="margin:0 0 6px">'+FOUND.length+' result'+(FOUND.length===1?'':'s')+' can be rebuilt</h3>'+
        '<p class="fine" style="margin:0 0 16px">Scored with the same engine the live app uses, so each is exactly what the man would have received. Nothing is written until you press the button.</p>'+
        (FOUND.length ? '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px">'+
          '<tr><th style="text-align:left;padding-right:12px">Sitting</th><th style="text-align:left;padding-right:12px">Profile</th>'+
          '<th style="text-align:left;padding-right:12px">Answers</th><th style="text-align:left;padding-right:12px">Score</th>'+
          '<th style="text-align:left">Completed</th></tr>'+rows+'</table>' : '')+
        (FOUND.length ? '<button class="btn btn-primary" id="rcWrite">Write '+FOUND.length+' result'+(FOUND.length===1?'':'s')+'</button>' : '')+
        skipHtml+
      '</div>');
    var b = document.getElementById('rcWrite');
    if(b) b.addEventListener('click', write);
  }

  function write(){
    var btn = document.getElementById('rcWrite');
    if(btn){ btn.disabled = true; btn.textContent = 'Writing\u2026'; }
    var rows = FOUND.map(function(f){
      return { session_id:f.session_id, user_id:f.user_id, assessment_slug:f.slug,
               overall_pct:f.scored.overall, section_scores:f.scored.sections,
               scale_scores:f.scored.scales, gap_scale:f.scored.gap,
               strength_scale:f.scored.strength, completed_at:f.completed_at };
    });
    FC.sb.from('keystone_results').insert(rows).then(function(r){
      if(r && r.error){
        say('<div class="notice brass"><b>Not written.</b> '+esc(r.error.message)+'</div>');
        return;
      }
      say('<div class="notice"><b>'+rows.length+' result'+(rows.length===1?'':'s')+' rebuilt.</b> '+
          'Each man\u2019s report, plan and dashboard now work. Re-run this to confirm nothing is left.</div>');
    }, function(e){ say('<div class="notice brass">'+esc(e.message||'write failed')+'</div>'); });
  }

  function boot(){
    if(!(window.FC && FC.live)){ say('<div class="notice brass">Not connected to the database.</div>'); return; }
    if(!(window.KS && window.KEYSTONE && window.KEYSTONE_MANHOOD)){
      say('<div class="notice brass">The instruments did not load.</div>'); return; }
    FC.ready.then(function(){
      if(window.FCR && FCR.guard){
        FCR.guard(['admin']).then(function(ok){
          ok ? scan() : say('<div class="notice brass">Admin access required.</div>');
        }, scan);
      } else scan();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
