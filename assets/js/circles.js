/* Circles. Real posts and replies against Supabase. No demo.
   A signed-in father is auto-joined to his circle, sees the feed, posts,
   replies, and can report. Author names come from profiles. */
(function(){
  'use strict';
  var feed = document.getElementById('circleFeed');
  if (!feed) return;

  function esc(s){
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function initials(name){
    var parts = (name || 'A').trim().split(/\s+/);
    return ((parts[0]||'A')[0] + (parts.length > 1 ? parts[parts.length-1][0] : '')).toUpperCase();
  }
  function ago(ts){
    var s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime())/1000));
    if (s < 60) return 'just now';
    var m = Math.floor(s/60); if (m < 60) return m + 'm';
    var h = Math.floor(m/60); if (h < 24) return h + 'h';
    var d = Math.floor(h/24); if (d < 7) return d + 'd';
    return new Date(ts).toLocaleDateString();
  }

  var circleId = null, uid = null;

  function init(){
    if (!window.FC || !FC.live) { feed.innerHTML = '<p class="ash" style="padding:12px 0">Sign in to see your circle.</p>'; return; }
    FC.ready.then(function(){
      uid = FC.uid && FC.uid();
      if (!uid) { location.href = 'login.html?next=circles.html'; return; }
      resolveCircle().then(function(cid){
        if (!cid) { feed.innerHTML = '<p class="ash" style="padding:12px 0">No circle is available yet. A leader can create one.</p>'; return; }
        circleId = cid;
        wireComposer();
        load();
      }).catch(function(){ feed.innerHTML = '<p class="ash" style="padding:12px 0">Could not load your circle. Try again in a moment.</p>'; });
    });
  }

  // The father's circle, or auto-join the first available one.
  function resolveCircle(){
    return FC.sb.from('circle_members').select('circle_id').eq('user_id', uid).limit(1)
      .then(function(r){
        if (r.data && r.data.length) return r.data[0].circle_id;
        return FC.sb.from('circles').select('id').limit(1).then(function(cr){
          if (!cr.data || !cr.data.length) return null;
          var cid = cr.data[0].id;
          return FC.sb.from('circle_members').insert({ circle_id: cid, user_id: uid })
            .then(function(){ return cid; }, function(){ return cid; });
        });
      });
  }

  function load(){
    FC.sb.from('circle_posts')
      .select('id,user_id,body,parent_id,created_at,reported')
      .eq('circle_id', circleId).eq('reported', false)
      .order('created_at', { ascending: true })
      .then(function(r){
        var rows = r.data || [];
        if (!rows.length) { feed.innerHTML = '<p class="ash" style="padding:12px 0">No posts yet. Say the first thing.</p>'; return; }
        var ids = Array.from(new Set(rows.map(function(p){ return p.user_id; })));
        FC.sb.from('profiles').select('id,name,email').in('id', ids)
          .then(function(pr){
            var names = {};
            (pr.data || []).forEach(function(p){ names[p.id] = p.name || (p.email ? p.email.split('@')[0] : 'A father'); });
            render(rows, names);
          }, function(){ render(rows, {}); });
      }, function(){ feed.innerHTML = '<p class="ash" style="padding:12px 0">Could not load posts.</p>'; });
  }

  function render(rows, names){
    var byParent = {};
    rows.forEach(function(p){ if (p.parent_id) { (byParent[p.parent_id] = byParent[p.parent_id] || []).push(p); } });
    var tops = rows.filter(function(p){ return !p.parent_id; }).reverse();

    feed.innerHTML = tops.map(function(p){
      var name = names[p.user_id] || 'A father';
      var replies = (byParent[p.id] || []).map(function(rp){
        var rn = names[rp.user_id] || 'A father';
        return '<div class="cir-reply"><span class="avatarchip sm">' + esc(initials(rn)) + '</span>' +
          '<div><div class="cir-reply-head"><b>' + esc(rn) + '</b><span class="fine">' + esc(ago(rp.created_at)) + '</span></div>' +
          '<p class="cir-reply-body">' + esc(rp.body) + '</p></div></div>';
      }).join('');
      return '<div class="cir-post" data-id="' + esc(p.id) + '">' +
        '<div class="cir-post-head"><span class="avatarchip">' + esc(initials(name)) + '</span>' +
        '<b>' + esc(name) + '</b><span class="fine">' + esc(ago(p.created_at)) + '</span>' +
        '<button class="cir-report" type="button" data-id="' + esc(p.id) + '">Report</button></div>' +
        '<p class="cir-body">' + esc(p.body) + '</p>' +
        (replies ? '<div class="cir-replies">' + replies + '</div>' : '') +
        '<div class="cir-replyform"><input class="input" placeholder="Reply to ' + esc(name) + '" data-reply="' + esc(p.id) + '">' +
        '<button class="btn btn-secondary btn-sm cir-replybtn" data-reply="' + esc(p.id) + '">Reply</button></div>' +
      '</div>';
    }).join('');
    wireFeed();
  }

  function write(body, parentId){
    return FC.sb.from('circle_posts').insert({
      circle_id: circleId, user_id: uid, body: body.trim(), parent_id: parentId || null
    });
  }

  function wireComposer(){
    var input = document.getElementById('circlePostInput');
    var btn = document.getElementById('circlePostBtn');
    if (!btn || !input) return;
    function submit(){
      var v = input.value || '';
      if (!v.trim()) { input.focus(); return; }
      btn.disabled = true;
      write(v, null).then(function(r){
        btn.disabled = false;
        if (r && r.error) { return; }
        input.value = ''; load();
      }, function(){ btn.disabled = false; });
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });
  }

  function wireFeed(){
    feed.querySelectorAll('.cir-replybtn').forEach(function(b){
      b.addEventListener('click', function(){
        var pid = b.getAttribute('data-reply');
        var input = feed.querySelector('input[data-reply="' + pid + '"]');
        if (!input || !input.value.trim()) { if (input) input.focus(); return; }
        b.disabled = true;
        write(input.value, pid).then(function(){ load(); }, function(){ b.disabled = false; });
      });
    });
    feed.querySelectorAll('.cir-report').forEach(function(b){
      b.addEventListener('click', function(){
        if (!window.confirm('Report this post? A leader will review it.')) return;
        b.disabled = true;
        FC.sb.from('circle_posts').update({ reported: true }).eq('id', b.getAttribute('data-id'))
          .then(function(){ load(); }, function(){ b.disabled = false; });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
