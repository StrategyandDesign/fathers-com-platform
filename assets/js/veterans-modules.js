/* Six original micro-modules on what returning fathers named they need.
   Original content. General skills, plain language, one concrete action each.
   No clinical program material is reproduced. */
window.VET_MODULES = {
  reconnecting: {
    slug: 'reconnecting',
    title: 'When your child feels like a stranger',
    sub: 'Rebuilding closeness after time away',
    minutes: 6,
    body: [
      'A year is a long time in a childhood. You came back, and the child in front of you is not quite the one you left. That gap is not a failure of love. It is the ordinary cost of distance, and it closes the same way it opened, a little at a time.',
      'Closeness is rebuilt through small, repeated, low-pressure moments, not through one big talk. A child trusts what is predictable. Show up at the same time, in the same small way, and let the relationship warm on the child\u2019s schedule instead of yours.',
      'Follow the child\u2019s lead. Sit on the floor where they are playing and do what they are doing without steering it. You are not there to fix or teach in these moments. You are there to be a safe, familiar presence they can come back to.',
      'Expect a cold shoulder sometimes, especially from older kids. That is a test, not a verdict. Keep showing up anyway. Steadiness is the message.'
    ],
    action: 'This week: pick one daily moment, the same time each day, and be fully present for it. No phone. Ten minutes counts.'
  },
  emotion: {
    slug: 'emotion',
    title: 'Saying what you feel',
    sub: 'Putting words to it, out loud',
    minutes: 5,
    body: [
      'The military trained you to hold it together and drive on. That skill kept people alive. At home it can wall you off from the people who most need to reach you.',
      'You do not have to become a different man. You have to add one skill: naming a feeling out loud, simply. \u201cI\u2019m frustrated.\u201d \u201cI missed you today.\u201d \u201cThat made me proud.\u201d Short and plain is enough.',
      'When you name what is happening inside you, two things happen. The feeling loses some of its grip, and your child learns that feelings are safe to have and to say. Kids read a parent\u2019s face long before they understand words. Giving the feeling a name turns confusion into connection.',
      'Start with the easy ones. Pride. Gladness. Missing someone. The harder feelings get easier to name once the muscle is built.'
    ],
    action: 'This week: say one feeling out loud to your child each day. Name it in three or four words, then let it sit. No explanation needed.'
  },
  temper: {
    slug: 'temper',
    title: 'Staying steady, and repairing when you do not',
    sub: 'Anger, the pause, and the way back',
    minutes: 6,
    body: [
      'Combat rewires the alarm system. Small things can trigger a big response, fast, before thought catches up. This is common, it is not a character flaw, and it can be worked with.',
      'The most useful skill is the pause. When you feel the heat rise, name it to yourself and step back before you act. Leave the room. Get a glass of water. Take sixty seconds. You are not avoiding the moment, you are buying the time your thinking brain needs to come back online.',
      'You will not always catch it in time. When you snap, the relationship is not broken, it is waiting on a repair. Go back, own your part plainly, and stay. \u201cI raised my voice. That was me, not you. I\u2019m sorry.\u201d A child who sees a father repair learns that mistakes are survivable and that they are still safe.',
      'If the anger feels bigger than you can manage, that is worth talking to someone about. It is a sign of a load worth sharing, not weakness. The support pages here can point you to a Vet Center or a counselor who gets it.'
    ],
    action: 'This week: practice the pause once. The next time heat rises, step back for sixty seconds before you respond. If you miss it, repair it.'
  },
  coparenting: {
    slug: 'coparenting',
    title: 'Fathering across two homes',
    sub: 'Presence when you are not the only house',
    minutes: 5,
    body: [
      'Whether it is divorce, a deployment, or a season apart, many fathers are parenting across more than one home. Your presence still counts, even when it is part time. Children do not keep score by hours. They keep it by whether you show up when you say you will.',
      'Protect the handoffs. Transitions between homes are where kids feel the split most. Keep them calm, keep them on time, and keep the other adult out of the child\u2019s ears. What you say about the other household, your child hears as something about themselves.',
      'Build your own rhythm in your own home. A standing meal, a bedtime routine, a Saturday habit. Predictable time in your house becomes the thing the child can count on, and the thing they carry between houses.',
      'You cannot control the other home. You can control that yours is steady, warm, and reliable. That is enough to matter.'
    ],
    action: 'This week: set one standing time that is yours, and keep it exactly. Same day, same thing. Reliability is the point.'
  },
  command: {
    slug: 'command',
    title: 'From command to connection',
    sub: 'Leading a family is a different job',
    minutes: 5,
    body: [
      'You led people who followed orders because the mission required it. A family runs on a different engine. Kids follow a parent they feel connected to, not a parent who issues commands. The goal at home is not compliance, it is relationship.',
      'That means fewer orders and more questions. Instead of \u201cGo do your homework,\u201d try \u201cWhat\u2019s your plan for tonight?\u201d You still hold the standard. You just hand the child a role in meeting it, which is how they grow.',
      'Discipline still matters, and structure is a gift to a child. But the structure lands when the connection is already there. A child who feels close to you will accept a limit from you. A child who only feels commanded will fight it.',
      'You are not lowering the standard. You are changing how you lead so the people you love will actually follow.'
    ],
    action: 'This week: replace one order with a question. Ask instead of tell, once a day, and see what your child does with the room you gave them.'
  },
  nurturing: {
    slug: 'nurturing',
    title: 'Small acts, every day',
    sub: 'Nurturing is a set of habits, not a personality',
    minutes: 4,
    body: [
      'Some men worry that being nurturing means becoming soft. It does not. Nurturing is just the daily proof that a child is known, wanted, and safe with you. It is built from small acts, and any father can build it.',
      'It is the specific stuff. Knowing the name of the friend, the hard subject at school, the stuffed animal that has to come to bed. Noticing out loud when they try hard at something. Being the one who shows up for the ordinary moments, not just the big ones.',
      'Warmth and high standards are not opposites. The strongest fathers hold both: they expect a lot and they are deeply, obviously for their kids. A child needs to know, without doubting it, that you are on their side.',
      'You do not need more time to do this. You need to aim the time you already have at your child, on purpose.'
    ],
    action: 'This week: learn one specific thing about your child\u2019s world you did not know, and mention it back to them later. Show them you were paying attention.'
  }
};

VET_MODULES.order = ['reconnecting', 'emotion', 'temper', 'coparenting', 'command', 'nurturing'];

/* Reader: renders one module when the page has #vetModule and ?m=slug */
(function(){
  'use strict';
  var host = document.getElementById('vetModule');
  if (!host || !window.VET) return;
  var e = VET.esc;

  var slug = new URLSearchParams(location.search).get('m') || 'reconnecting';
  var m = VET_MODULES[slug] || VET_MODULES.reconnecting;

  var paras = m.body.map(function(p){ return '<p>' + e(p) + '</p>'; }).join('');
  host.innerHTML =
    '<div class="eyebrow brass" style="margin-bottom:14px">' + e(String(m.minutes)) + '-MINUTE READ</div>' +
    '<h1 class="d-36" style="margin-bottom:8px">' + e(m.title) + '</h1>' +
    '<p class="lead" style="margin-bottom:28px">' + e(m.sub) + '</p>' +
    '<div class="vet-prose">' + paras + '</div>' +
    '<div class="vet-action"><div class="eyebrow" style="margin-bottom:8px">YOUR ACTION</div><p>' + e(m.action) + '</p></div>';

  // Simple next-module link
  var idx = VET_MODULES.order.indexOf(m.slug);
  var next = VET_MODULES.order[(idx + 1) % VET_MODULES.order.length];
  var nextEl = document.getElementById('vetModuleNext');
  if (nextEl && VET_MODULES[next]) {
    nextEl.setAttribute('href', 'veterans-module.html?m=' + encodeURIComponent(next));
    nextEl.textContent = 'Next: ' + VET_MODULES[next].title + ' \u2192';
  }
})();
