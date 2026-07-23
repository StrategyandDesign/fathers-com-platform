/* ============================================================
   THE KEYSTONE MANHOOD PROFILE
   ============================================================
   Structural twin of the Keystone Father Profile: three sections, 26 scales,
   128 items, the same response scales and the same item grammar. What differs
   is the construct. The Father Profile measures a man toward his child. This
   measures a man toward the people who depend on him, and toward the man he is
   when no one is watching.

   WHY THIS EXISTS SEPARATELY
   The populations this platform serves (reentry, treatment, military
   separation) include many men who are not currently fathering, or who are
   fathering at a distance. Handing those men a fathering instrument produces
   floor effects and shame. Every construct below is answerable by any man.

   PROVENANCE
   Each scale carries a `source` naming the element of Dr. Ken Canfield's
   published framework it derives from:
     I-CAN       his four dimensions of fathering: Involvement, Consistency,
                 Awareness, Nurturance
     7-SECRETS   Commitment, Knowing Your Child, Consistency, Protecting and
                 Providing, Loving Their Mother, Active Listening, Spiritual
                 Equipping
     HEART       The Heart of a Father: examine your own heart, resolve your
                 relationship with your own father, take the long view
     PFP         a construct carried across from the Personal Fathering Profile
                 structure itself
   Where a construct has no direct antecedent it is marked EXTENSION with the
   rationale stated. Nothing is attributed to him that he did not write.

   DESIGN GUARDRAIL
   Canfield's fathering work has been noted for avoiding the chest-beating,
   paternalistic tone of some men's movements. A manhood instrument is exactly
   where that tone creeps back in. So there are no items about dominance,
   headship, toughness, provider-as-identity, or gender role prescription.
   Manhood is measured here as character in relationship, which is the
   through-line of his research. Items assume no wife, no children, no job and
   no house, because many respondents will have none of those.

   CALIBRATION STATUS: NOT YET NORMED.
   The Father Profile is scored against published norms from 2,066 fathers.
   This instrument has none. It is therefore scored criterion-referenced (where
   a man placed himself on the scale) rather than norm-referenced (how he
   compares to other men). Those are different claims and the platform must
   never confuse them. See `calibration` for the plan that retires this status.

   REQUIRES Dr. Ken Canfield psychometric sign-off before participant use.
   ============================================================ */
window.KEYSTONE_MANHOOD = {
  slug: 'keystone-manhood-profile',
  title: 'The Keystone Manhood Profile',
  description: 'A mirror of how you carry yourself, and the one move that changes the most.',

  version: '1.0',

  // Released to participants. Released is not the same as calibrated: see below.
  released: true,

  /* Norm-referenced scoring requires norms. There are none yet, so scores are
     computed against the range of the scale itself. The scorer reads this. */
  scoring: {
    mode: 'criterion_referenced',
    basis: 'percent_of_scale_range',
    note: 'Scores show where a man placed himself on each scale. They are not percentile ranks and must not be described as a comparison to other men until norms exist.'
  },

  norms_n: 0,
  norm_group_noun: 'men',
  subject_noun: 'your life as a man',

  calibration: {
    // Content validity is cleared. The remaining steps are empirical and cannot
    // be cleared by expert review, only by data. Until step 5 is done this
    // instrument has no norm group and must never be described as if it does.
    status: 'content_validity_cleared',
    content_validity: {
      cleared_by: 'Dr. Ken Canfield',
      scope: 'Review of all 128 items against the I-CAN dimensions, the Seven Secrets, and The Heart of a Father.',
      note: 'Establishes that the instrument measures what it claims. Does not establish reliability, factor structure, or norms.'
    },
    blocking_gate: null,
    remaining: [
      'Cognitive pretest',
      'Pilot for reliability (target alpha >=.80)',
      'Factor structure (EFA then CFA)',
      'Norming (n>=1000) before any norm-referenced claim',
      'Differential item functioning across the three populations'
    ],
    plan: [
      'DONE. Content validity. Dr. Canfield reviewed all 128 items against his framework.',
      'Cognitive pretest with 8 to 12 men drawn from the three target populations, confirming each item is understood as intended.',
      'Pilot at n>=250 across partner sites for item analysis: item-total correlations, floor and ceiling effects, Cronbach alpha per scale. Target alpha >=.80, matching the Father Profile range of .80 to .87.',
      'Exploratory factor analysis to test whether the three-section structure holds, then confirmatory factor analysis on a fresh sample.',
      'Norming at n>=1000 to publish mean and SD per scale. At that point scoring.mode flips to norm_referenced and norms_n is set.',
      'Differential item functioning check across the reentry, treatment and separation populations before any high-stakes use.'
    ]
  },

  sections: [
    /* -------------------------------------------------------------------
       SECTION 1 - DIMENSIONS
       The Father Profile opens with Canfield's I-CAN dimensions, the load
       bearing walls of his model, so this opens the same way, translated
       from "toward my child" to "toward the people who depend on me."
       Involvement becomes Presence: a man with no children can still be
       present or absent to the people in front of him.
       ------------------------------------------------------------------- */
    {
      key: 'dimensions',
      title: 'Manhood Dimensions',
      instruction: 'Decide how accurate each statement is concerning your life as a man.',
      scale: { kind: 'likert5', labels: ['Mostly False','Somewhat False','Uncertain','Somewhat True','Mostly True'] },
      scales: [
        { key:'presence', label:'Presence', mean:null, sd:null, rel:null,
          source:'I-CAN (Involvement)',
          items:[
            'I am present in the lives of the people who depend on me.',
            'I give people my full attention when I am with them.',
            'I set aside time for the people who matter most to me.',
            'I show up on ordinary days, not only for the big ones.',
            'I take an active part in what the people close to me are going through.',
            'The people close to me and I do things together regularly.'
          ]},
        { key:'consistency', label:'Consistency', mean:null, sd:null, rel:null,
          source:'I-CAN (Consistency); 7-SECRETS (Consistency)',
          items:[
            'I am the same man in private that I am in public.',
            'The people close to me know what to expect from me.',
            'I keep my word even when it costs me something.',
            'My mood does not decide how I treat people.',
            'I follow through on what I start.',
            'People can count on me to be steady when things get hard.'
          ]},
        { key:'awareness', label:'Awareness', mean:null, sd:null, rel:null,
          source:'I-CAN (Awareness); HEART (examine your own heart)',
          items:[
            'I know what sets me off before it happens.',
            'I can name what I am feeling when I am under pressure.',
            'I notice when someone close to me is struggling.',
            'I understand how my upbringing shaped the man I am.',
            'I know my own strengths and my own limits.',
            'I can tell when I have hurt someone, even if they say nothing.'
          ]},
        { key:'nurturance', label:'Nurturance', mean:null, sd:null, rel:null,
          source:'I-CAN (Nurturance)',
          items:[
            'I encourage the people close to me.',
            'I am gentle with people who are hurting.',
            'I tell the people I love that I love them.',
            'I look for ways to make someone else\u2019s day easier.',
            'I am patient with people who need more time than I do.',
            'People feel safe bringing me bad news.'
          ]},
        { key:'commitment', label:'Commitment', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Commitment)',
          items:[
            'I do not quit on people when it gets hard.',
            'The people who depend on me know they come first.',
            'I stay in relationships through seasons that are not easy.',
            'I have decided what kind of man I intend to be.',
            'I keep commitments I made when circumstances were different.',
            'I am reachable when the people who need me reach for me.',
            'I would give up something I want for someone I am responsible for.'
          ]},
        { key:'active_listening', label:'Active Listening', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Active Listening)',
          items:[
            'I listen without planning my answer.',
            'I let people finish before I speak.',
            'I ask questions instead of assuming I already know.',
            'People tell me they feel heard by me.'
          ]},
        { key:'work_contribution', label:'Work and Contribution', mean:null, sd:null, rel:null,
          source:'PFP (Job Satisfaction); 7-SECRETS (Protecting and Providing). EXTENSION: widened from employment to contribution, because many respondents are between jobs, incarcerated, or in treatment.',
          items:[
            'The work I do matters to me.',
            'I carry my share of the load.',
            'I own my mistakes instead of explaining them away.',
            'I do honest work even when no one is checking.',
            'What I do with my days is worth doing.'
          ]},
        { key:'emotional_regulation', label:'Emotional Regulation', mean:null, sd:null, rel:null,
          source:'PFP (Emotional Regulation)',
          items:[
            'I stay calm when I am provoked.',
            'I handle frustration without taking it out on people.',
            'I can sit with a hard feeling without acting on it.',
            'I settle back down quickly after something goes wrong.',
            'My anger does not run the room.'
          ]},
        { key:'legacy_and_planning', label:'Legacy and Planning', mean:null, sd:null, rel:null,
          source:'HEART (take the long view); PFP (Legacy and Planning)',
          items:[
            'I think about what people will remember about me.',
            'I am building something that will outlast me.',
            'I plan for the years ahead, not only for this week.',
            'I have thought about what I want to pass on.',
            'I am deliberate about the direction my life is going.',
            'The choices I make now account for the people who come after me.'
          ]},
        { key:'flourishing', label:'Flourishing', mean:null, sd:null, rel:null,
          source:'PFP (Flourishing)',
          items:[
            'I have a sense of purpose.',
            'I am mostly at peace with myself.',
            'I have people I can be honest with.',
            'I am growing rather than standing still.',
            'My life is going in a good direction.'
          ]}
      ]
    },

    /* -------------------------------------------------------------------
       SECTION 2 - PRACTICES
       The Father Profile's practices operationalize the Seven Secrets as
       tasks a man rates himself on. Same grammar here: gerund phrases rated
       Very Poor to Very Good. "Loving their mother" becomes the closest
       relationship, answerable whether a man is married, co-parenting,
       separated, or single.
       ------------------------------------------------------------------- */
    {
      key: 'practices',
      title: 'Manhood Practices',
      instruction: 'Decide how successful you are in each of the following.',
      scale: { kind: 'likert5', labels: ['Very Poor','Poor','Fair','Good','Very Good'] },
      scales: [
        { key:'modeling', label:'Modeling', mean:null, sd:null, rel:null,
          source:'PFP (Modeling)',
          items:[
            'Demonstrating emotional maturity to the people around me.',
            'Being a man someone younger could pattern himself after.',
            'Setting an example I would be glad to see repeated.',
            'Living out the values I say I hold.'
          ]},
        { key:'freedom_of_expression', label:'Freedom of Expression', mean:null, sd:null, rel:null,
          source:'PFP (Freedom of Expression)',
          items:[
            'Making it safe for people to disagree with me.',
            'Letting the people close to me say hard things without paying for it.',
            'Admitting when I am wrong.',
            'Taking criticism without shutting down or striking back.',
            'Leaving room for honest conversation.'
          ]},
        { key:'knowing_my_people', label:'Knowing My People', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Knowing Your Child)',
          items:[
            'Knowing what the people closest to me are carrying right now.',
            'Remembering what matters to the people I love.',
            'Knowing who the important people in their lives are.',
            'Recognizing when someone close to me has had a hard day.',
            'Understanding what encourages the people I care about.',
            'Knowing what the people close to me are hoping for.'
          ]},
        { key:'financial_provision', label:'Financial Provision', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Protecting and Providing)',
          items:[
            'Meeting my financial obligations on time.',
            'Providing what I am responsible for providing.',
            'Handling money openly with the people it affects.',
            'Planning ahead financially instead of only reacting.'
          ]},
        { key:'learning_growth', label:'Learning and Growth', mean:null, sd:null, rel:null,
          source:'PFP (Education Involvement). EXTENSION: redirected from a child\u2019s schooling to the man\u2019s own continued learning, which is answerable without children.',
          items:[
            'Learning something new on purpose.',
            'Reading, studying, or training to get better at something.',
            'Asking for help when I do not know how.',
            'Taking correction and actually using it.',
            'Building a skill that makes me more useful to someone.',
            'Staying curious about lives that are not like mine.'
          ]},
        { key:'seeking_counsel', label:'Seeking Counsel', mean:null, sd:null, rel:null,
          source:'PFP (Parental Discussion). EXTENSION: widened from co-parent discussion to shared decision making with whoever a man is accountable to.',
          items:[
            'Talking big decisions through before I make them.',
            'Asking someone I trust what they think.',
            'Weighing advice that runs against what I already want.',
            'Working out a disagreement instead of going silent.'
          ]},
        { key:'handling_crises', label:'Handling Crises', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Protecting and Providing); PFP (Family Crises)',
          items:[
            'Staying steady when something goes wrong.',
            'Handling a crisis calmly and constructively.',
            'Being someone others turn to in an emergency.',
            'Making clear decisions under pressure.',
            'Helping people feel safe when things are uncertain.',
            'Getting the household or the team back on its feet after a setback.'
          ]},
        { key:'showing_affection', label:'Showing Affection', mean:null, sd:null, rel:null,
          source:'PFP (Showing Affection)',
          items:[
            'Telling the people close to me that they matter.',
            'Showing appropriate physical affection.',
            'Saying thank you out loud.',
            'Being warm rather than only useful.',
            'Letting people see that I care.',
            'Making people feel wanted rather than tolerated.'
          ]},
        { key:'spiritual_moral_grounding', label:'Spiritual and Moral Grounding', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Spiritual Equipping)',
          items:[
            'Living by a moral code I could explain to someone.',
            'Practicing what I believe rather than only stating it.',
            'Passing on what I believe to people who look to me.',
            'Facing my own failings honestly.',
            'Drawing strength from something bigger than myself.'
          ]},
        { key:'time_commitment', label:'Time Commitment', mean:null, sd:null, rel:null,
          source:'PFP (Time Commitment)',
          items:[
            'Giving my time to the people who need it most.',
            'Protecting time that belongs to the people I love.',
            'Being unhurried when someone needs me.',
            'Keeping my work and my people in balance.'
          ]},
        { key:'giving_receiving_guidance', label:'Giving and Receiving Guidance', mean:null, sd:null, rel:null,
          source:'PFP (Giving Guidance). EXTENSION: made two directional, because being mentored is as diagnostic as mentoring for these populations.',
          items:[
            'Giving guidance without taking over.',
            'Letting an older or wiser man speak into my life.',
            'Helping someone coming up behind me.',
            'Correcting someone without shaming him.'
          ]},
        { key:'closest_relationship', label:'Closest Relationship', mean:null, sd:null, rel:null,
          source:'7-SECRETS (Loving Their Mother); PFP (Marital Relationship). EXTENSION: framed as the closest relationship so single, separated and co-parenting men can answer it.',
          items:[
            'Tending to my closest relationship.',
            'Speaking well of that person when they are not in the room.',
            'Settling conflict instead of letting it sit.',
            'Being a partner rather than a project.'
          ]}
      ]
    },

    /* -------------------------------------------------------------------
       SECTION 3 - SATISFACTION
       The Heart of a Father argues a man must resolve his relationship with
       his own father before he can build well with anyone else. The Father
       Profile encodes that by opening its satisfaction section with
       childhood. Those four items carry across unchanged: they were already
       about the man, not about his child.
       ------------------------------------------------------------------- */
    {
      key: 'satisfaction',
      title: 'Manhood Satisfaction',
      instruction: 'Decide how satisfied you are for each area stated below.',
      scale: { kind: 'likert7', labels: ['Extremely Dissatisfied','Very Dissatisfied','Somewhat Dissatisfied','Mixed','Somewhat Satisfied','Very Satisfied','Extremely Satisfied'] },
      scales: [
        { key:'childhood_satisfaction', label:'Childhood Satisfaction', mean:null, sd:null, rel:null,
          source:'HEART (resolve your relationship with your own father). Items carried across unchanged from the Father Profile.',
          items:[
            'How satisfied were you with your childhood?',
            'How satisfied were you with your relationship to your father while growing up?',
            'How satisfied were you with your relationship to your mother while growing up?',
            'How satisfied are you with the guidance you received growing up?'
          ]},
        { key:'manhood_satisfaction', label:'Manhood Satisfaction', mean:null, sd:null, rel:null,
          source:'PFP (Fathering Satisfaction), turned toward the man himself',
          items:[
            'How satisfied are you with the man you have become?',
            'How satisfied are you with the way you carry responsibility?',
            'How satisfied are you with the direction your life is going?'
          ]},
        { key:'leadership_satisfaction', label:'Leadership Satisfaction', mean:null, sd:null, rel:null,
          source:'PFP (Leadership Satisfaction)',
          items:[
            'How satisfied are you with the influence you have on others?',
            'How satisfied are you with the way you lead in your home or your circle?',
            'How satisfied are you with the way you handle authority over you?',
            'How satisfied are you with the trust you have earned?'
          ]},
        { key:'relationship_satisfaction', label:'Satisfaction with Close Relationships', mean:null, sd:null, rel:null,
          source:'PFP (Satisfaction with Child Relationship), widened to close relationships',
          items:[
            'How satisfied are you with your closest relationship?',
            'How satisfied are you with the friendships you have?',
            'How satisfied are you with how well the people close to you know you?'
          ]}
      ]
    }
  ]
};

/* Per-scale results copy for THIS instrument. The runner used to read a single
   father-specific library keyed by scale name. Because this instrument shares
   several scale keys with the Father Profile, a man taking the Manhood Profile
   was shown copy about his kids. Every instrument now carries its own copy.
   Voice matches the father set: blunt, short, no clinical language, no shame,
   and no assumption that he has children, a wife, or a job. */
window.KEYSTONE_MANHOOD.scale_copy = {
  presence:{about:"How present you are in the lives of the people who depend on you: the ordinary days, not only the big ones.",s:"You show up. People know you are actually there.",g:"Being present is the whole game, and it is the thing to build first.",m:["When you walk in, your phone stays in your pocket for ten minutes.","Put one standing time with someone who matters on the calendar this week.","Before you talk about your day, ask about theirs."]},
  consistency:{about:"Whether people can predict you: kept promises, steady moods, the same man on Tuesday as on Saturday.",s:"You are the same man twice. People can plan around you.",g:"People trust what repeats. The fix is the same thing, kept, again and again.",m:["Tell one person the next time they will see you, and keep it.","Pick one promise this week and do not renegotiate it.","If your mood is bad, say so out loud instead of letting it set the tone."]},
  awareness:{about:"How well you read your own state and other people's: what sets you off, and what they are carrying.",s:"You know yourself, and you notice other people.",g:"Awareness is a habit, not a talent. It grows by asking.",m:["Name what you are feeling once a day, even just to yourself.","Ask one person how they are actually doing, then wait.","When something sets you off, write down what happened right before."]},
  nurturance:{about:"The warmth people feel from you, and whether you are safe to come to when something is wrong.",s:"You are warm. People come to you when it is hard.",g:"Warmth is a practice. Say the thing you assume people already know.",m:["Tell one person what you appreciate about them, out loud.","When someone brings you bad news, thank them for telling you.","Do one small thing that makes someone's day easier, without mentioning it."]},
  commitment:{about:"Your staying power: whether the people who depend on you experience you as all in, at cost to yourself.",s:"You stay. The people who depend on you know it.",g:"Commitment shows up on ordinary days, not big ones.",m:["Do one thing you said you would do, today, before anything else.","Call the person you have been meaning to call.","When you want to quit on someone, wait a day before deciding."]},
  active_listening:{about:"Whether people feel heard by you, or handled.",s:"You listen. People feel heard when they talk to you.",g:"Listening is not waiting. Let people finish before you answer.",m:["In your next hard conversation, ask a question before you give an opinion.","Let one silence sit for three seconds before you fill it.","Repeat back what you heard before you respond to it."]},
  work_contribution:{about:"Whether the work you do matters to you, and whether you carry your share of it.",s:"Your work matters to you, and you carry your load.",g:"Work you respect changes how you carry everything else.",m:["Finish one thing you have been avoiding.","Own one mistake out loud this week, without explaining it away.","Name what your work is actually for."]},
  emotional_regulation:{about:"What your anger and frustration do to a room, and how quickly you settle again.",s:"You keep your head. Your anger does not run the room.",g:"Regulation is a skill you can drill. Buy yourself a few seconds.",m:["When you feel it rise, take one breath before speaking.","Leave the room instead of raising your voice.","Name the feeling to yourself before you act on it."]},
  legacy_and_planning:{about:"Whether you are building something that outlasts you, or only getting through this week.",s:"You think past this week. You are building something.",g:"A long view turns good intentions into a direction.",m:["Write down one thing you want to be true in five years.","Tell someone what you are building and why.","Take one step this week that only pays off later."]},
  flourishing:{about:"Your own condition: purpose, health, and whether you have anyone you can be honest with.",s:"You are growing, and you have people you can be honest with.",g:"You cannot pour from empty. Tending yourself is part of the job.",m:["Do one thing this week that is only for your own health.","Tell one person something true that you have been carrying.","Read, train, or learn one thing on purpose."]},
  modeling:{about:"Whether the way you live is something you would be glad to see repeated.",s:"You live what you say. Someone could pattern himself after you.",g:"The example is the message. Close one gap between what you say and do.",m:["Pick one value you claim and act on it visibly this week.","Apologize where you fell short of your own standard.","Do the right thing once when no one would know."]},
  freedom_of_expression:{about:"Whether people can disagree with you without paying for it.",s:"People can disagree with you without paying for it.",g:"Safety to speak is built by how you take the first hard thing.",m:["Ask someone what you are getting wrong, and just listen.","Say I was wrong once this week without adding but.","When criticized, ask a question instead of defending."]},
  knowing_my_people:{about:"How well you know what the people closest to you are actually carrying right now.",s:"You know what the people close to you are carrying.",g:"Knowing people is upkeep, not a one-time thing.",m:["Ask one person what they are hoping for right now.","Learn the name of someone important in their life.","Notice one thing that changed for them and mention it."]},
  financial_provision:{about:"Whether you meet what you owe, and handle money in the open with the people it affects.",s:"You meet what you owe. People can count on that.",g:"Money handled openly builds trust faster than money handled well.",m:["Pay one obligation before it is due.","Tell the person it affects where things actually stand.","Write down what next month looks like."]},
  learning_growth:{about:"Whether you are still learning on purpose, or coasting on what you already know.",s:"You are still learning on purpose.",g:"Staying teachable is what keeps a man useful.",m:["Ask for help with one thing you do not know how to do.","Take one piece of correction and act on it this week.","Learn one skill that makes you more useful to someone."]},
  seeking_counsel:{about:"Whether you run decisions past anyone before you make them.",s:"You talk decisions through before you make them.",g:"Counsel costs nothing and catches what you cannot see.",m:["Run one decision past someone you trust before you commit.","Ask someone who will disagree with you.","Work out one disagreement instead of going quiet."]},
  handling_crises:{about:"What you do when something goes wrong, and whether people feel safe while you do it.",s:"You are steady when things go wrong. People turn to you.",g:"Steadiness is decided before the crisis, not during it.",m:["Decide now what you do first when something goes wrong.","In the next setback, say out loud what you know and what you do not.","Help one person feel safe before you fix anything."]},
  showing_affection:{about:"Whether the people close to you hear that they matter, or are left to assume it.",s:"People know they matter to you, because you tell them.",g:"Warmth said out loud lands differently than warmth assumed.",m:["Tell one person you are glad they are in your life.","Say thank you for something small and specific.","Be warm before you are useful, once this week."]},
  spiritual_moral_grounding:{about:"Whether you live by a code you could explain out loud, and whether you practice it.",s:"You live by something you could explain, and you practice it.",g:"A code you can name is a code you can keep.",m:["Say out loud what you believe and why, to one person.","Face one thing you have been avoiding about yourself.","Give ten minutes to whatever steadies you."]},
  time_commitment:{about:"Where your hours actually go, measured against who needs them.",s:"You give your time to the people who need it.",g:"Time is the one thing you cannot fake giving.",m:["Put one person on the calendar and protect it.","Be unhurried with someone for fifteen minutes.","Say no to one thing so you can say yes to someone."]},
  giving_receiving_guidance:{about:"Whether you guide without controlling, and whether you let anyone guide you.",s:"You guide without controlling, and you let others guide you.",g:"Being mentored is as telling as mentoring.",m:["Ask an older or wiser man one real question.","Correct someone this week without shaming him.","Offer one hour to someone coming up behind you."]},
  closest_relationship:{about:"How you tend the relationship closest to you, rather than coasting on it.",s:"You tend your closest relationship instead of coasting on it.",g:"The closest relationship gets the leftovers unless you decide otherwise.",m:["Speak well of that person when they are not in the room.","Settle one thing you have been letting sit.","Give them your full attention for one conversation."]},
  childhood_satisfaction:{about:"How you were raised, and how much of it still runs you today.",s:"You have looked honestly at how you were raised.",g:"Your upbringing had gifts and gaps, like most. Naming them is the first real step.",m:["Write down one thing you want to keep from how you were raised.","Write down one thing you intend to do differently.","Tell one person what you are still carrying from back then."]},
  manhood_satisfaction:{about:"How you regard the man you have become, and the direction you are headed.",s:"You are at peace with the man you are becoming.",g:"Confidence grows from small wins. Stack a few and it climbs.",m:["Notice one thing you handled well this week.","Ask someone who knows you what you are good at.","Keep one small promise to yourself and let it count."]},
  leadership_satisfaction:{about:"The trust you have earned from the people who follow you.",s:"People follow you because you have earned it.",g:"Influence is trust spent well. It is rebuilt in small keeps.",m:["Make one decision clearly instead of leaving it open.","Give credit publicly for something that was not yours.","Ask the people you lead what you should stop doing."]},
  relationship_satisfaction:{about:"Whether the people close to you actually know you.",s:"The people close to you actually know you.",g:"Being known takes telling. Let someone further in.",m:["Tell one person something true you usually keep back.","Ask a friend how they are, then ask again.","Reach out to someone you have let drift."]},
};

/* The ninety-day tracks for THIS instrument.
   Twelve weeks per scale, two actions a week, phased Establish, Deepen,
   Sustain. The father tracks are written around a man's children, so a
   Manhood result used to pick them up on shared scale keys and hand a man
   without children a plan about his kids. These are his own.

   Method follows Canfield: fathering, and manhood, is a marathon rather
   than a sprint, built on little promises kept, with a battle buddy walking
   alongside. Consistency is treated the way he defines it, across moods,
   presence, promises, ethics, and schedule. Repair is possible and it is
   named as costly. Nothing assumes children, a wife, a job, or a house. */
window.KEYSTONE_MANHOOD.tracks = {
  presence: {
    focus: "Being in the room, on purpose, for the people who count on you.",
    weeks: [
      ["Put two fixed times with people who matter on your calendar this week.","Do one ordinary task alongside someone instead of alone."],
      ["Keep both times. No reschedule.","When you walk in a room, put the phone away for ten minutes."],
      ["Ask one person what they would want to do with you.","Show up to one thing that matters to them."],
      ["Hold the schedule through one hard day.","Be the first to arrive once this week."],
      ["Add a third standing time.","Start something with someone that takes more than one sitting."],
      ["Let someone else pick what you do together.","Give one person a full hour with no phone at all."],
      ["Start one small thing that only you two do.","Ask about their day before you talk about yours."],
      ["Notice who got less of you, and rebalance.","Help one person with something they are learning."],
      ["Make the standing times automatic, not negotiated.","Bring someone along to something you already do."],
      ["Ask someone to teach you something they are good at.","Show up early to one thing, unhurried."],
      ["Look back at the ninety days with one of them in the room.","Plan one bigger thing together for next season."],
      ["Lock the rhythm in for the next quarter.","Tell one person what you noticed change in you."],
    ]
  },
  consistency: {
    focus: "Being a man people can predict and count on.",
    weeks: [
      ["Make one small promise and keep it exactly.","Tell one person the next time they will hear from you."],
      ["Make two small promises this week. Keep both.","Write down every promise you make for seven days."],
      ["Keep a promise on a day you do not feel like it.","Say no to one thing instead of overpromising."],
      ["Review the week. Count what you kept.","Fix one thing you keep saying and not doing."],
      ["Keep the same wake time all week.","Let your mood stop deciding how you speak to people."],
      ["Do one thing at the same time every day this week.","Tell someone what you are working on so they can ask."],
      ["Keep a promise that costs you something.","Apologize once, specifically, for a promise you broke."],
      ["Ask one person if you are predictable. Take the answer.","Keep your word on the small thing nobody would check."],
      ["Make the routine boring on purpose. Boring is the point.","Hold your schedule through a week that goes wrong."],
      ["Be the same man in the room you are on your own.","Let someone rely on you without asking twice."],
      ["Count the promises kept over ninety days.","Name the one you still drop, and plan for it."],
      ["Set the rhythm for the next quarter and write it down.","Tell someone what they can count on from you now."],
    ]
  },
  awareness: {
    focus: "Knowing yourself well enough to see other people clearly.",
    weeks: [
      ["Name what you are feeling once a day, even to yourself.","Notice one thing that set you off and write down what came first."],
      ["Ask one person how they are actually doing, then wait.","Track your mood for a week. Look for the pattern."],
      ["Name one way you carry your upbringing without meaning to.","Notice when you go quiet, and say what is happening instead."],
      ["Ask someone close what they see in you that you miss.","Sit with one hard feeling for five minutes without acting."],
      ["Learn the signs that come before you lose your temper.","Ask a second person the same question and compare."],
      ["Notice who in your life is struggling and say something.","Name one strength you have been discounting."],
      ["Catch one assumption you made and check it.","Write down what you actually want, not what you should want."],
      ["Say one true thing you would normally keep back.","Notice one way you are different at work than at home."],
      ["Make the daily check a habit, not an effort.","Ask someone what changed in you over these weeks."],
      ["Name your two hardest triggers and your plan for each.","Tell one person what you are learning about yourself."],
      ["Look back at ninety days of notes and find the pattern.","Name one thing you now see that you could not see before."],
      ["Set a monthly check with yourself and keep it.","Tell someone what you intend to keep watching."],
    ]
  },
  nurturance: {
    focus: "Being a man people feel safe around.",
    weeks: [
      ["Tell one person, out loud, what you appreciate about them.","Do one small thing that makes someone's day easier."],
      ["Encourage someone before they ask for it.","When someone brings you bad news, thank them for telling you."],
      ["Be patient once where you would normally push.","Ask someone what they need instead of guessing."],
      ["Sit with someone who is hurting without fixing it.","Say something kind about a person who is not in the room."],
      ["Encourage two people this week, specifically.","Notice who never gets thanked, and thank them."],
      ["Let someone be slow without making them feel it.","Give something away without mentioning it."],
      ["Tell someone you love them, plainly.","Check on the person you assume is fine."],
      ["Be gentle in the moment you would usually be sharp.","Ask a struggling person what actually helps."],
      ["Make encouragement your default, not your effort.","Bless what someone is doing well, out loud, in front of others."],
      ["Show up for someone in a way that costs you time.","Be the safe place for one hard conversation."],
      ["Ask the people close to you if they feel safe with you.","Name what you want to be known for."],
      ["Choose one person to keep encouraging past ninety days.","Tell them why you are not going anywhere."],
    ]
  },
  commitment: {
    focus: "Staying, on the ordinary days, when it would be easier not to.",
    weeks: [
      ["Do one thing you said you would do, before anything else today.","Call the person you have been meaning to call."],
      ["Decide what kind of man you intend to be. Write it down.","Keep one commitment you made when things were different."],
      ["Show up somewhere you did not feel like going.","Tell one person they can count on you, and mean it."],
      ["When you want to quit on someone, wait a day.","Finish one thing you started and abandoned."],
      ["Give up something you want for someone you are responsible for.","Be reachable this week when someone needs you."],
      ["Stay in one conversation past the point it gets uncomfortable.","Renew one commitment out loud."],
      ["Do the unglamorous thing nobody will notice.","Keep going in the week you get no encouragement."],
      ["Name what you are actually committed to, and what you are not.","Cut one commitment so you can keep the rest."],
      ["Make showing up automatic, not a decision you relitigate.","Tell someone what you are staying for."],
      ["Stay through a setback without renegotiating.","Ask someone if you have been reliable. Take the answer."],
      ["Count what you stayed with over ninety days.","Name the commitment you will not drop next quarter."],
      ["Put the next quarter's commitments in writing.","Tell one person what they can expect from you now."],
    ]
  },
  active_listening: {
    focus: "Letting people finish, and actually hearing them.",
    weeks: [
      ["In your next hard conversation, ask a question before you answer.","Let one silence sit three seconds before you fill it."],
      ["Repeat back what you heard before you respond.","Listen to one person all the way through without interrupting."],
      ["Ask a second question instead of giving your opinion.","Notice when you are planning your answer, and stop."],
      ["Ask someone how they felt, not just what happened.","Put your phone face down in every conversation this week."],
      ["Have one conversation where you say almost nothing.","Ask a follow-up that shows you were listening."],
      ["Let someone finish a story you have heard before.","Ask someone what they wish you understood."],
      ["Hear something hard without defending yourself.","Ask one person if they feel heard by you."],
      ["Listen to someone you usually tune out.","Wait a full day before answering something that stung."],
      ["Make asking before answering your default.","Notice how the conversations change and say so."],
      ["Listen to someone you disagree with, all the way.","Thank someone for telling you the truth."],
      ["Ask the people close to you if you listen better now.","Name the person you still cut off, and stop."],
      ["Carry the habit into the next quarter.","Tell someone what you heard from them that changed you."],
    ]
  },
  work_contribution: {
    focus: "Doing work you can respect, and carrying your share.",
    weeks: [
      ["Finish one thing you have been avoiding.","Do one piece of honest work when nobody is checking."],
      ["Own one mistake out loud, without explaining it away.","Name what your work is actually for."],
      ["Carry a load that is not officially yours.","Ask what would actually help, then do that."],
      ["Show up on time every day this week.","Leave one thing better than you found it."],
      ["Do the boring part well.","Ask someone how your work lands on them."],
      ["Take on one thing that stretches you.","Give credit publicly for something that was not yours."],
      ["Fix a shortcut you have been taking.","Finish the week without cutting a corner."],
      ["Ask what you should stop doing, and stop it.","Do one thing that only pays off later."],
      ["Make honest work your default, not your effort.","Teach someone one thing you know how to do."],
      ["Hold your standard on a week you are tired.","Say no to work you cannot do well."],
      ["Look at ninety days of work. Name what you are proud of.","Name the habit you are keeping."],
      ["Set one work standard for the next quarter.","Tell someone what you are building toward."],
    ]
  },
  emotional_regulation: {
    focus: "Staying steady when you would rather not.",
    weeks: [
      ["When you feel it rise, take one breath before speaking.","Leave the room instead of raising your voice."],
      ["Name the feeling to yourself before you act on it.","Notice what happens right before you lose it."],
      ["Let one thing go that you would normally argue.","Sleep on one message before you send it."],
      ["Sit with a hard feeling for five minutes.","Apologize once for how you said something."],
      ["Handle one frustration without taking it out on anyone.","Tell someone in advance when you are running hot."],
      ["Come back to a conversation after you cooled down.","Get the sleep, the food, and the walk. They are not optional."],
      ["Stay calm when someone is not calm with you.","Ask someone whether your anger lands on them."],
      ["Recover in an hour instead of a day.","Name one thing you are carrying that is not about them."],
      ["Make the pause automatic.","Handle a bad week without a blowup."],
      ["Tell a battle buddy what sets you off, so he can ask.","Take one piece of criticism without striking back."],
      ["Count the times you paused over ninety days.","Name the trigger you are still working on."],
      ["Set your plan for the next hard moment, in writing.","Tell someone what they can expect from you under pressure."],
    ]
  },
  legacy_and_planning: {
    focus: "Building something that outlasts you.",
    weeks: [
      ["Write down one thing you want to be true in five years.","Take one step this week that only pays off later."],
      ["Name what you want to pass on.","Tell one person what you are building and why."],
      ["Put one long-range thing on the calendar.","Save or set aside something small, on purpose."],
      ["Ask an older man what he wishes he had started sooner.","Write down what you want said about you."],
      ["Break the five-year thing into this year's step.","Start one tradition worth repeating."],
      ["Do one thing now that helps someone after you.","Write down what you learned from your own upbringing."],
      ["Tell someone younger something worth carrying.","Put one plan in writing so it survives your memory."],
      ["Review the plan and cut what does not matter.","Invest one hour in something that grows slowly."],
      ["Make the long view a monthly habit.","Ask who is watching how you handle things."],
      ["Take the step that is inconvenient but right.","Name the cycle you intend to break."],
      ["Look at ninety days. Name what is actually built.","Write next quarter's one long-range step."],
      ["Set a yearly review date and keep it.","Tell someone what you want to leave behind."],
    ]
  },
  flourishing: {
    focus: "Tending yourself, because you cannot pour from empty.",
    weeks: [
      ["Do one thing this week that is only for your own health.","Tell one person something true you have been carrying."],
      ["Move your body three times this week.","Read, train, or learn one thing on purpose."],
      ["Get to sleep on time four nights running.","Name one thing that steadies you, and do it."],
      ["Ask one person to be your battle buddy for ninety days.","Cut one thing that is draining you for no return."],
      ["Tell your battle buddy the truth about a hard week.","Add one thing back that you used to love."],
      ["Take a full day off from the thing you grind at.","Eat like a man who intends to be around."],
      ["Say no to something so you can rest.","Do something creative or physical with no purpose."],
      ["Ask for help with one thing.","Notice what has actually improved and say it out loud."],
      ["Make the health habit automatic, not heroic.","Check in with your battle buddy without being asked."],
      ["Handle a hard week without dropping the basics.","Name what you want your next season to feel like."],
      ["Look at ninety days. Name what got better.","Name the one habit you are keeping."],
      ["Set next quarter's one health commitment.","Ask your battle buddy to keep walking with you."],
    ]
  },
  modeling: {
    focus: "Being a man someone could pattern himself after.",
    weeks: [
      ["Pick one value you claim and act on it visibly this week.","Do the right thing once when nobody would know."],
      ["Close one gap between what you say and what you do.","Apologize where you fell short of your own standard."],
      ["Let someone younger see you handle something badly, then repair it.","Name the man who modeled something worth copying."],
      ["Ask someone what they think you stand for.","Stop one habit you would not want repeated."],
      ["Do the unglamorous right thing in front of someone.","Tell someone why you do a thing the way you do."],
      ["Handle a mistake in the open instead of hiding it.","Keep your standard on a day nobody is watching."],
      ["Let someone watch you take correction well.","Choose the harder honest route once."],
      ["Ask if what you model matches what you want passed on.","Fix one thing your example is teaching by accident."],
      ["Make the standard automatic, not performed.","Invite someone to call you on the gap."],
      ["Hold the line in a week where it costs you.","Bless someone publicly for doing the right thing."],
      ["Look at ninety days. Name what you now model well.","Name the gap you are still closing."],
      ["Set the standard you will hold next quarter.","Tell someone what you want copied and what you do not."],
    ]
  },
  freedom_of_expression: {
    focus: "Making it safe for people to tell you the truth.",
    weeks: [
      ["Ask someone what you are getting wrong, and just listen.","Say I was wrong once, without adding but."],
      ["Take one piece of criticism without defending yourself.","Thank someone for telling you something hard."],
      ["Ask a question instead of arguing back.","Let someone disagree with you and leave it standing."],
      ["Invite one honest opinion you would rather not hear.","Notice when you shut a conversation down, and reopen it."],
      ["Ask two people the same hard question.","Change your mind out loud about something."],
      ["Let a disagreement stay unresolved without punishing anyone.","Ask what people do not say around you."],
      ["Receive a complaint without explaining it away.","Say the thing you have been avoiding saying."],
      ["Ask someone if they can be honest with you. Take the answer.","Repair one relationship where honesty got expensive."],
      ["Make asking for correction a habit, not an event.","Notice who started speaking up more, and thank them."],
      ["Take hard feedback in a week you are already tired.","Give someone permission to interrupt you."],
      ["Ask whether people find you easier to tell the truth to.","Name the topic people still cannot raise with you."],
      ["Set one standing question you will keep asking.","Tell people what you want to hear from them."],
    ]
  },
  knowing_my_people: {
    focus: "Knowing what the people closest to you are carrying.",
    weeks: [
      ["Ask one person what they are carrying right now.","Learn the name of someone important in their life."],
      ["Ask what they are hoping for.","Notice one thing that changed for them and mention it."],
      ["Remember one detail and bring it up a week later.","Ask what encourages them, then do that."],
      ["Ask about the thing they are worried about.","Write down what matters to two people close to you."],
      ["Ask a harder question than usual.","Find out what their week actually looks like."],
      ["Learn one thing about their past you did not know.","Notice who had a bad day and say so."],
      ["Ask what they wish you understood.","Show up for something that matters only to them."],
      ["Check whether what you assumed is still true.","Ask what they need from you specifically."],
      ["Make the asking routine, not an event.","Bring up something they told you months ago."],
      ["Ask one person if they feel known by you.","Learn something about the person you know least."],
      ["Look at ninety days. Name what you now know.","Name who you still do not really know."],
      ["Set a rhythm for keeping up with two people.","Tell one person what you have noticed about them."],
    ]
  },
  financial_provision: {
    focus: "Meeting what you owe, in the open.",
    weeks: [
      ["Pay one obligation before it is due.","Write down what you actually owe and to whom."],
      ["Tell the person it affects where things really stand.","Cancel one thing you do not use."],
      ["Set aside something small on purpose.","Look at last month honestly, without flinching."],
      ["Make one plan for the obligation you are behind on.","Ask for help or terms if you need them."],
      ["Put one bill on automatic so it cannot slip.","Say no to one purchase you would regret."],
      ["Save the same small amount again.","Have one honest money conversation you have avoided."],
      ["Pay something down instead of adding to it.","Write next month's plan before it starts."],
      ["Check the plan against what actually happened.","Tell someone what you are working toward."],
      ["Make the saving automatic, not a decision.","Handle an unexpected cost without panic."],
      ["Keep the plan through a hard month.","Ask someone you trust to look at it with you."],
      ["Look at ninety days. Name what improved.","Name the habit that is still costing you."],
      ["Write next quarter's plan and tell one person.","Set the standard you intend to hold."],
    ]
  },
  learning_growth: {
    focus: "Staying teachable, which is what keeps a man useful.",
    weeks: [
      ["Ask for help with one thing you do not know how to do.","Read, watch, or train on one thing for thirty minutes."],
      ["Take one piece of correction and act on it.","Ask someone better than you how they learned it."],
      ["Practice the thing you are worst at.","Finish one thing you started learning and abandoned."],
      ["Learn one skill that makes you more useful to someone.","Admit you do not know, out loud, once."],
      ["Put thirty minutes of learning on the calendar twice.","Ask a question in a room where you feel behind."],
      ["Teach someone one thing you just learned.","Read something outside your own experience."],
      ["Get feedback on the skill you are building.","Try the thing you have been avoiding because you might fail."],
      ["Review what you learned and what stuck.","Ask what you should learn next, and from whom."],
      ["Make the learning time automatic.","Find one person who will keep pushing you."],
      ["Keep learning in a week you are busy.","Use the new skill for someone else's benefit."],
      ["Look at ninety days. Name what you can do now.","Name what you want to learn next."],
      ["Set next quarter's one skill.","Tell someone what you are working on so they can ask."],
    ]
  },
  seeking_counsel: {
    focus: "Running decisions past someone before you make them.",
    weeks: [
      ["Run one decision past someone you trust before you commit.","Ask someone who will disagree with you."],
      ["Weigh advice that runs against what you already want.","Name the two people whose judgment you trust."],
      ["Work out one disagreement instead of going quiet.","Ask for input earlier than feels comfortable."],
      ["Take one piece of advice you did not like.","Tell someone the decision you are actually facing."],
      ["Ask a second opinion on something you already decided.","Bring someone into a problem you have been carrying alone."],
      ["Say what you are afraid of out loud to one person.","Ask an older man how he handled the same thing."],
      ["Change course based on counsel you received.","Thank someone whose advice you took."],
      ["Ask whether you actually listen, or just consult.","Build the short list of people you will call."],
      ["Make asking first your default.","Go to your battle buddy before the decision, not after."],
      ["Take counsel in a week you feel certain.","Give counsel to someone who asked."],
      ["Look at ninety days. Name the decision counsel improved.","Name the thing you still decide alone."],
      ["Set who you will call for what, in writing.","Tell those people you intend to keep calling."],
    ]
  },
  handling_crises: {
    focus: "Being steady when things go wrong.",
    weeks: [
      ["Decide now what you do first when something goes wrong.","Say out loud what you know and what you do not."],
      ["Handle one small setback without escalating it.","Help one person feel safe before you fix anything."],
      ["Make one clear decision under pressure.","Ask for help early instead of late."],
      ["Write down who you call when it goes bad.","Fix one thing that keeps causing small crises."],
      ["Stay calm through something that usually rattles you.","Check on the people affected, not just the problem."],
      ["Sort what is urgent from what is loud.","Take the first step instead of the whole plan."],
      ["Be the person others turn to once.","Debrief a setback without blaming anyone."],
      ["Prepare for the failure you can see coming.","Ask what people needed from you and did not get."],
      ["Make the first move automatic.","Get the household or the team back on its feet."],
      ["Handle a real setback with the plan you wrote.","Thank the people who held steady with you."],
      ["Look at ninety days. Name what you handled well.","Name what still knocks you sideways."],
      ["Write next quarter's plan for the likely crisis.","Tell people what to expect from you when it goes wrong."],
    ]
  },
  showing_affection: {
    focus: "Saying the thing you assume people already know.",
    weeks: [
      ["Tell one person you are glad they are in your life.","Say thank you for something small and specific."],
      ["Be warm before you are useful, once this week.","Tell someone what you admire about them."],
      ["Say the affectionate thing you usually think and skip.","Let someone see that you care."],
      ["Give appropriate physical affection where it fits.","Make one person feel wanted rather than tolerated."],
      ["Encourage two people specifically this week.","Write one short note instead of saying nothing."],
      ["Tell someone you love them, plainly.","Notice who never hears it from you."],
      ["Show up warm on a day you feel flat.","Praise someone in front of other people."],
      ["Ask whether the people close to you feel it.","Say the thing you have been putting off saying."],
      ["Make the warmth default, not occasional.","Tell someone what they have meant to you over the years."],
      ["Be affectionate in a week that is going badly.","Reach out to someone you have let drift."],
      ["Look at ninety days. Name who hears it now.","Name who still does not."],
      ["Set one person you will keep telling.","Tell them why."],
    ]
  },
  spiritual_moral_grounding: {
    focus: "Living by a code you could explain out loud.",
    weeks: [
      ["Write down what you actually believe, in plain words.","Give ten minutes to whatever steadies you."],
      ["Say out loud to one person what you believe and why.","Face one thing you have been avoiding about yourself."],
      ["Practice it once when it costs you something.","Notice one gap between your code and your week."],
      ["Ask an older man what has held up for him.","Make the ten minutes a daily thing."],
      ["Tell the truth in a spot where a lie would be easier.","Read or listen to something that sharpens you."],
      ["Pass on one thing you believe to someone who looks to you.","Sit with something bigger than your own week."],
      ["Own one failing honestly, without excuse.","Forgive one thing, for your own sake."],
      ["Check whether your code survives pressure.","Ask what you want your convictions to cost."],
      ["Make the practice automatic, not occasional.","Talk it through with your battle buddy."],
      ["Hold the code in a week you do not feel it.","Do the quiet right thing nobody will see."],
      ["Look at ninety days. Name what steadied you.","Name where you still bend."],
      ["Write the code down for the next quarter.","Tell one person what you intend to live by."],
    ]
  },
  time_commitment: {
    focus: "Giving your time to the people who need it.",
    weeks: [
      ["Put one person on the calendar and protect it.","Say no to one thing so you can say yes to someone."],
      ["Be unhurried with someone for fifteen minutes.","Look at where your hours actually went last week."],
      ["Keep the protected time through a busy week.","Cut one thing that eats time and gives nothing back."],
      ["Give someone your full attention with no phone.","Add a second protected time."],
      ["Leave work at the time you said you would.","Be early once instead of exactly on time."],
      ["Give an hour to someone who cannot repay it.","Notice who gets your leftovers and change it."],
      ["Protect the time when something urgent competes.","Ask someone if you seem rushed with them."],
      ["Review where the hours went and adjust once.","Say no to something good for something better."],
      ["Make the protected time automatic.","Tell people what time is not available and why."],
      ["Hold the calendar through a hard week.","Give time to the person you keep postponing."],
      ["Look at ninety days. Name who got your time.","Name who still does not."],
      ["Set next quarter's protected time and write it down.","Tell one person it is theirs."],
    ]
  },
  giving_receiving_guidance: {
    focus: "Guiding without controlling, and letting others guide you.",
    weeks: [
      ["Ask an older or wiser man one real question.","Correct someone this week without shaming him."],
      ["Offer one hour to someone coming up behind you.","Take one piece of guidance and act on it."],
      ["Give advice only after you have asked two questions.","Tell someone what you got wrong and what it taught you."],
      ["Ask your battle buddy to speak into one area.","Let someone finish a mistake that will not hurt them."],
      ["Check in on the person you are helping.","Ask the man mentoring you what he sees."],
      ["Give credit to the people who guided you.","Say the hard thing kindly, once."],
      ["Let someone teach you something you think you know.","Ask whether your correction lands as help or shame."],
      ["Step back where you have been taking over.","Introduce one person to someone who can help them."],
      ["Make both directions a habit.","Meet with the man you are helping, on schedule."],
      ["Take correction well in front of someone watching.","Encourage the person you are guiding, specifically."],
      ["Look at ninety days. Name who you helped.","Name who helped you."],
      ["Set the next quarter's rhythm for both.","Tell both men you intend to keep going."],
    ]
  },
  closest_relationship: {
    focus: "Tending your closest relationship instead of coasting on it.",
    weeks: [
      ["Speak well of that person when they are not in the room.","Give them your full attention for one conversation."],
      ["Settle one thing you have been letting sit.","Ask what they need from you this week."],
      ["Do one thing they have asked for more than once.","Say thank you for something they always do."],
      ["Put time with them on the calendar.","Apologize for one thing, specifically, without qualifying it."],
      ["Ask how you are actually doing by them.","Take the answer without defending yourself."],
      ["Do the chore or task they hate, without mentioning it.","Tell them one thing you admire about them."],
      ["Handle one disagreement without going cold.","Ask what would make this month easier for them."],
      ["Check whether you are a partner or a project.","Bring something up before it becomes a problem."],
      ["Make the protected time automatic.","Choose them over your phone, visibly."],
      ["Hold the connection through a hard week.","Do something together that is not logistics."],
      ["Look at ninety days. Ask them what changed.","Name what you are still getting wrong."],
      ["Set next quarter's rhythm with them, together.","Tell them what you are committing to."],
    ]
  },
  childhood_satisfaction: {
    focus: "Understanding how you were raised, so it stops running you.",
    weeks: [
      ["Name one thing you did not get that you intend to give.","Notice one way you act like the man who raised you."],
      ["Write down one good thing you were given.","Catch one reaction that comes from back then, not from now."],
      ["Name one thing you are choosing to do differently.","Tell one person something true about your upbringing."],
      ["Name the cycle you intend to break.","Notice what you do when you feel like that boy again."],
      ["Write what you wish had been said to you.","Say that thing to someone who needs it."],
      ["Forgive one thing, for your own sake, not his.","Ask an older man how he made peace with his own father."],
      ["Name what you inherited that is worth keeping.","Name what stops with you."],
      ["Talk it through with your battle buddy, honestly.","Notice where the old pattern still shows up."],
      ["Do one thing that proves the cycle is breakable.","Write down what you want remembered about how you raised people."],
      ["Sit with the grief if it comes. It is part of it.","Bless something about the man who raised you, if you can."],
      ["Look at ninety days. Name what loosened its grip.","Name what you are still carrying."],
      ["Decide what you keep and what stops here. Write it down.","Tell one person what you have decided."],
    ]
  },
  manhood_satisfaction: {
    focus: "Making peace with the man you are becoming.",
    weeks: [
      ["Notice one thing you handled well this week.","Keep one small promise to yourself and let it count."],
      ["Ask someone who knows you what you are good at.","Write down one thing you are no longer doing."],
      ["Stack a second small win on the first.","Catch one piece of harsh self-talk and stop it."],
      ["Name the direction you are actually going.","Do one thing today that the man you want to be would do."],
      ["Take stock of the last month honestly, without flinching.","Tell your battle buddy where you actually are."],
      ["Give yourself credit out loud for one thing.","Fix one thing that has been nagging you."],
      ["Do the hard thing and notice you did it.","Name what you would tell a younger man in your spot."],
      ["Ask whether the standard you hold yourself to is fair.","Adjust one expectation that was never realistic."],
      ["Make the weekly stock-take a habit.","Notice how you talk about yourself, and change one word."],
      ["Handle a bad week without concluding you are a bad man.","Name one thing you are genuinely proud of."],
      ["Look at ninety days. Name what changed in you.","Name what you are still working on, without shame."],
      ["Write what kind of man you intend to be next quarter.","Tell your battle buddy so he can hold you to it."],
    ]
  },
  leadership_satisfaction: {
    focus: "Earning the trust of the people who follow you.",
    weeks: [
      ["Make one decision clearly instead of leaving it open.","Give credit publicly for something that was not yours."],
      ["Ask the people you lead what you should stop doing.","Take the answer without defending yourself."],
      ["Own one call that went badly, in front of them.","Do one thing you said the group would do."],
      ["Ask what people need from you that they are not getting.","Handle authority over you well, once, visibly."],
      ["Make a hard call and explain the reason.","Protect someone who took a risk for the group."],
      ["Serve the group in a way nobody will notice.","Ask an older leader what he would have done."],
      ["Follow well where you are not in charge.","Give someone else the decision that is theirs to make."],
      ["Check whether people can tell you bad news.","Fix one thing that makes it hard to work with you."],
      ["Make the asking routine, not an event.","Bless what people are doing well, out loud."],
      ["Lead steadily through a week that goes wrong.","Thank the people who carried it with you."],
      ["Look at ninety days. Ask whether trust grew.","Name where you still lose people."],
      ["Set the standard you will lead by next quarter.","Tell them what they can expect from you."],
    ]
  },
  relationship_satisfaction: {
    focus: "Letting the people close to you actually know you.",
    weeks: [
      ["Tell one person something true you usually keep back.","Reach out to someone you have let drift."],
      ["Ask a friend how he is, then ask again.","Say yes to one invitation you would normally decline."],
      ["Have one conversation that is not about logistics.","Name the two people you would call at 2am."],
      ["Ask one person to be your battle buddy.","Tell someone what you are actually dealing with."],
      ["Meet your battle buddy and say the hard thing.","Make one plan with someone and keep it."],
      ["Reach out first instead of waiting.","Ask someone what they wish you knew about them."],
      ["Let someone help you with something.","Repair one friendship that went quiet for no reason."],
      ["Ask whether the people close to you feel close.","Say the thing you have been rehearsing for months."],
      ["Make reaching out a rhythm, not a mood.","Bring two people in your life together."],
      ["Stay connected through a week you want to withdraw.","Tell someone what their friendship has meant."],
      ["Look at ninety days. Name who knows you now.","Name who you are still hiding from."],
      ["Set the rhythm for the next quarter, with names on it.","Tell your battle buddy you intend to keep going."],
    ]
  },
};

/* Section intros and the practice call-out for THIS instrument. The report
   carries father-worded versions of both, which described a man's fathering to
   a man who may not be a father. */
window.KEYSTONE_MANHOOD.section_intro = {
  dimensions: "The core of how you carry yourself: presence, steadiness, attention, warmth, and staying power. These move slowest and matter most.",
  practices: "What you actually do, week to week. Practices are the most trainable part of this whole profile: pick one, repeat it, and the dimension above it moves.",
  satisfaction: "How it feels from the inside: your own read on the man you are and the ground you hold. Satisfaction follows action, not the other way around."
};
window.KEYSTONE_MANHOOD.practice_callout =
  "The most trainable part of how you carry yourself. Pick one practice below, do it every day this week, and the dimension it feeds gets stronger. This is the fastest place to win.";
