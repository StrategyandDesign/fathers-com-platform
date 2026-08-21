/* Fathers.com | Legacy Voice Archive prompt library.
   Renders a category > prompt picker into #promptPicker.
   The chosen prompt becomes window.FC_VOICE_PROMPT and titles the saved recording,
   so a child's archive reads like a shelf of moments, not a list of files. */
(function(){
  window.FC_VOICE_PROMPTS = [
    { cat: 'Away nights', items: [
      'Read the book on their nightstand. Just one chapter.',
      'Say good night the way you always do.',
      'Tell them what you can see from where you are right now.',
      'Count the days until you are home, out loud, together.'
    ]},
    { cat: 'The goodbye', items: [
      'Why I go, in my own words.',
      'What I promise you while I am gone.',
      'Play this when you miss me.',
      'For the one holding the line at home.'
    ]},
    { cat: 'Before the moment', items: [
      'What to remember before the big game.',
      'The night before the first day of school.',
      'Before the test: what matters and what does not.',
      'Before their first heartbreak finds them.'
    ]},
    { cat: 'Milestones', items: [
      'For your 13th birthday.',
      'For your 18th birthday.',
      'For the day you graduate.',
      'For your wedding day.',
      'For the day you hold your first child.'
    ]},
    { cat: 'The table', items: [
      'A blessing for the table when my chair is empty.',
      'What our table means to me.',
      'For the first dinner after I come back.',
      'A story from when I was your age, told for dessert.'
    ]},
    { cat: 'The hard days', items: [
      'For a day when you feel alone.',
      'When you fail at something that mattered.',
      'When someone is unkind to you.',
      'What I do when I am afraid, and what you can do.'
    ]},
    { cat: 'Your story', items: [
      'A time I was scared and did it anyway.',
      'How I met your mother.',
      'The best advice my father gave me, or the advice I wish he had.',
      'The day you were born, from where I stood.',
      'What I promised you before you could talk.'
    ]},
    { cat: 'What I believe', items: [
      'The three things I am proudest of about you.',
      'What our name stands for.',
      'A blessing over you, in my own words.',
      'What I pray for you, if you pray. What I hope for you, always.'
    ]}
  ];

  function render(){
    var root = document.getElementById('promptPicker');
    if(!root) return;
    var current = document.getElementById('promptCurrent');
    var cats = document.createElement('div'); cats.className='chiprow'; cats.style.marginBottom='14px';
    var list = document.createElement('div'); list.className='stack-8';
    root.appendChild(cats); root.appendChild(list);

    function showCat(i){
      Array.prototype.forEach.call(cats.children, function(c,j){ c.classList.toggle('selected', j===i); });
      list.innerHTML='';
      FC_VOICE_PROMPTS[i].items.forEach(function(t){
        var b=document.createElement('button'); b.type='button'; b.className='chip'; b.style.textAlign='left'; b.textContent=t;
        b.addEventListener('click', function(){
          Array.prototype.forEach.call(list.children, function(x){ x.classList.remove('selected'); });
          b.classList.add('selected');
          window.FC_VOICE_PROMPT = { title: t, cat: FC_VOICE_PROMPTS[i].cat };
          if(current){ current.hidden=false; current.textContent='Recording: \u201C'+t+'\u201D. It will be titled this in the archive.'; }
        });
        list.appendChild(b);
      });
    }
    FC_VOICE_PROMPTS.forEach(function(g,i){
      var c=document.createElement('button'); c.type='button'; c.className='chip'; c.textContent=g.cat;
      c.addEventListener('click', function(){ showCat(i); });
      cats.appendChild(c);
    });
    showCat(0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
