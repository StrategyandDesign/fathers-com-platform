/* ============================================================
   Fathers.com role layer. Loads the signed-in user's roles,
   exposes helpers, and guards dashboard pages. The database
   enforces permissions; this only shapes the UI.
   ============================================================ */
window.FCR = window.FCR || {};
(function(){
  FCR.roles = [];
  FCR.orgRoles = {};   // org_id -> [roles]

  FCR.load = function(){
    if(!(window.FC && FC.live)) return Promise.resolve([]);
    return FC.ready.then(function(){
      if(!FC.uid()) return [];
      return FC.sb.from('user_roles').select('role, org_id').then(function(r){
        FCR.roles = (r.data||[]).map(function(x){return x.role;});
        (r.data||[]).forEach(function(x){
          if(x.org_id){(FCR.orgRoles[x.org_id]=FCR.orgRoles[x.org_id]||[]).push(x.role);}
        });
        return FCR.roles;
      });
    });
  };
  FCR.has = function(role){ return FCR.roles.indexOf(role) > -1; };
  FCR.isAdmin = function(){ return FCR.has('admin'); };
  FCR.canAuthor = function(){ return FCR.has('admin') || FCR.has('instructor'); };
  FCR.leadsAnyOrg = function(){ return FCR.has('admin') || FCR.has('org_admin') || FCR.has('circle_leader') || Object.keys(FCR.orgRoles).length>0; };

  // Guard: call at top of a dashboard page. Redirects if the user lacks any of the roles.
  FCR.guard = function(allowed){
    return FCR.load().then(function(){
      var ok = FCR.isAdmin() || allowed.some(function(r){ return FCR.has(r); });
      if(!ok){
        if(!(window.FC && FC.live)){ /* demo mode: show a notice, do not redirect */ return false; }
        location.href = 'plan.html'; return false;
      }
      return true;
    });
  };

  // Build the role-aware links in the app nav (Dashboard menu).
  FCR.decorateNav = function(){
    var right = document.querySelector('.nav-right');
    if(!right || !FCR.roles.length) return;
    var links = [];
    if(FCR.isAdmin()) links.push(['Admin','admin.html']);
    if(FCR.canAuthor()) links.push(['Studio','studio.html']);
    if(FCR.leadsAnyOrg()) links.push(['Org','org.html']);
    if(FCR.has('circle_leader')) links.push(['Lead','lead.html']);
    if(!links.length) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative';
    var btn = document.createElement('a');
    btn.href = links[0][1]; btn.textContent = 'Dashboards';
    btn.className = 'btn btn-secondary btn-sm';
    wrap.appendChild(btn);
    right.insertBefore(wrap, right.firstChild);
  };

  document.addEventListener('DOMContentLoaded', function(){
    FCR.load().then(function(){ try{ FCR.decorateNav(); }catch(e){} });
  });
})();

/* Hide dashboard nav links the user's roles do not grant. RLS still enforces on the server. */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    FCR.load().then(function(){
      var map={admin:FCR.isAdmin(),author:FCR.canAuthor(),org:FCR.leadsAnyOrg(),leader:FCR.has('circle_leader')||FCR.isAdmin()};
      document.querySelectorAll('.nav-links a[data-role]').forEach(function(a){
        if(!map[a.dataset.role]) a.style.display='none';
      });
    });
  });
})();

/* ---------- dashboard glance populators ----------
   Fill the at-a-glance numbers with real data when live. Each is best-effort:
   if a query fails or we're not live, the placeholder stays. */
(function(){
  function setGlance(key, value){
    var el = document.querySelector('[data-glance="'+key+'"]');
    if(el && value != null) el.textContent = value;
  }
  function ready(){ return window.FC && FC.live && FC.uid && FC.uid(); }

  document.addEventListener('DOMContentLoaded', function(){
    if(!ready()) return;
    var sb = FC.sb;

    // ADMIN glance
    if(document.querySelector('[data-glance="admin-people"]')){
      sb.from('profiles').select('id', {count:'exact', head:true}).then(function(r){
        if(r && r.count != null) setGlance('admin-people', r.count);
      }, function(){});
      sb.from('certificate_courses').select('id', {count:'exact', head:true}).then(function(r){
        if(r && r.count != null) setGlance('admin-content', r.count);
      }, function(){});
    }

    // STUDIO glance (courses owned by this instructor)
    if(document.querySelector('[data-glance="studio-courses"]')){
      sb.from('certificate_courses').select('id', {count:'exact', head:true}).then(function(r){
        if(r && r.count != null) setGlance('studio-courses', r.count);
      }, function(){});
    }

    // ORG glance (roster + activity)
    if(document.querySelector('[data-glance="org-members"]')){
      sb.from('org_members').select('id', {count:'exact', head:true}).then(function(r){
        if(r && r.count != null) setGlance('org-members', r.count);
      }, function(){});
    }

    // LEAD glance (circle members)
    if(document.querySelector('[data-glance="lead-men"]')){
      sb.from('circle_members').select('id', {count:'exact', head:true}).then(function(r){
        if(r && r.count != null) setGlance('lead-men', r.count);
      }, function(){});
    }
  });
})();
