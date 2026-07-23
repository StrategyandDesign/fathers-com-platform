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
  presence:{s:"You show up. People know you are actually there.",g:"Being present is the whole game, and it is the thing to build first.",m:["When you walk in, your phone stays in your pocket for ten minutes.","Put one standing time with someone who matters on the calendar this week.","Before you talk about your day, ask about theirs."]},
  consistency:{s:"You are the same man twice. People can plan around you.",g:"People trust what repeats. The fix is the same thing, kept, again and again.",m:["Tell one person the next time they will see you, and keep it.","Pick one promise this week and do not renegotiate it.","If your mood is bad, say so out loud instead of letting it set the tone."]},
  awareness:{s:"You know yourself, and you notice other people.",g:"Awareness is a habit, not a talent. It grows by asking.",m:["Name what you are feeling once a day, even just to yourself.","Ask one person how they are actually doing, then wait.","When something sets you off, write down what happened right before."]},
  nurturance:{s:"You are warm. People come to you when it is hard.",g:"Warmth is a practice. Say the thing you assume people already know.",m:["Tell one person what you appreciate about them, out loud.","When someone brings you bad news, thank them for telling you.","Do one small thing that makes someone's day easier, without mentioning it."]},
  commitment:{s:"You stay. The people who depend on you know it.",g:"Commitment shows up on ordinary days, not big ones.",m:["Do one thing you said you would do, today, before anything else.","Call the person you have been meaning to call.","When you want to quit on someone, wait a day before deciding."]},
  active_listening:{s:"You listen. People feel heard when they talk to you.",g:"Listening is not waiting. Let people finish before you answer.",m:["In your next hard conversation, ask a question before you give an opinion.","Let one silence sit for three seconds before you fill it.","Repeat back what you heard before you respond to it."]},
  work_contribution:{s:"Your work matters to you, and you carry your load.",g:"Work you respect changes how you carry everything else.",m:["Finish one thing you have been avoiding.","Own one mistake out loud this week, without explaining it away.","Name what your work is actually for."]},
  emotional_regulation:{s:"You keep your head. Your anger does not run the room.",g:"Regulation is a skill you can drill. Buy yourself a few seconds.",m:["When you feel it rise, take one breath before speaking.","Leave the room instead of raising your voice.","Name the feeling to yourself before you act on it."]},
  legacy_and_planning:{s:"You think past this week. You are building something.",g:"A long view turns good intentions into a direction.",m:["Write down one thing you want to be true in five years.","Tell someone what you are building and why.","Take one step this week that only pays off later."]},
  flourishing:{s:"You are growing, and you have people you can be honest with.",g:"You cannot pour from empty. Tending yourself is part of the job.",m:["Do one thing this week that is only for your own health.","Tell one person something true that you have been carrying.","Read, train, or learn one thing on purpose."]},
  modeling:{s:"You live what you say. Someone could pattern himself after you.",g:"The example is the message. Close one gap between what you say and do.",m:["Pick one value you claim and act on it visibly this week.","Apologize where you fell short of your own standard.","Do the right thing once when no one would know."]},
  freedom_of_expression:{s:"People can disagree with you without paying for it.",g:"Safety to speak is built by how you take the first hard thing.",m:["Ask someone what you are getting wrong, and just listen.","Say I was wrong once this week without adding but.","When criticized, ask a question instead of defending."]},
  knowing_my_people:{s:"You know what the people close to you are carrying.",g:"Knowing people is upkeep, not a one-time thing.",m:["Ask one person what they are hoping for right now.","Learn the name of someone important in their life.","Notice one thing that changed for them and mention it."]},
  financial_provision:{s:"You meet what you owe. People can count on that.",g:"Money handled openly builds trust faster than money handled well.",m:["Pay one obligation before it is due.","Tell the person it affects where things actually stand.","Write down what next month looks like."]},
  learning_growth:{s:"You are still learning on purpose.",g:"Staying teachable is what keeps a man useful.",m:["Ask for help with one thing you do not know how to do.","Take one piece of correction and act on it this week.","Learn one skill that makes you more useful to someone."]},
  seeking_counsel:{s:"You talk decisions through before you make them.",g:"Counsel costs nothing and catches what you cannot see.",m:["Run one decision past someone you trust before you commit.","Ask someone who will disagree with you.","Work out one disagreement instead of going quiet."]},
  handling_crises:{s:"You are steady when things go wrong. People turn to you.",g:"Steadiness is decided before the crisis, not during it.",m:["Decide now what you do first when something goes wrong.","In the next setback, say out loud what you know and what you do not.","Help one person feel safe before you fix anything."]},
  showing_affection:{s:"People know they matter to you, because you tell them.",g:"Warmth said out loud lands differently than warmth assumed.",m:["Tell one person you are glad they are in your life.","Say thank you for something small and specific.","Be warm before you are useful, once this week."]},
  spiritual_moral_grounding:{s:"You live by something you could explain, and you practice it.",g:"A code you can name is a code you can keep.",m:["Say out loud what you believe and why, to one person.","Face one thing you have been avoiding about yourself.","Give ten minutes to whatever steadies you."]},
  time_commitment:{s:"You give your time to the people who need it.",g:"Time is the one thing you cannot fake giving.",m:["Put one person on the calendar and protect it.","Be unhurried with someone for fifteen minutes.","Say no to one thing so you can say yes to someone."]},
  giving_receiving_guidance:{s:"You guide without controlling, and you let others guide you.",g:"Being mentored is as telling as mentoring.",m:["Ask an older or wiser man one real question.","Correct someone this week without shaming him.","Offer one hour to someone coming up behind you."]},
  closest_relationship:{s:"You tend your closest relationship instead of coasting on it.",g:"The closest relationship gets the leftovers unless you decide otherwise.",m:["Speak well of that person when they are not in the room.","Settle one thing you have been letting sit.","Give them your full attention for one conversation."]},
  childhood_satisfaction:{s:"You have looked honestly at how you were raised.",g:"Your upbringing had gifts and gaps, like most. Naming them is the first real step.",m:["Write down one thing you want to keep from how you were raised.","Write down one thing you intend to do differently.","Tell one person what you are still carrying from back then."]},
  manhood_satisfaction:{s:"You are at peace with the man you are becoming.",g:"Confidence grows from small wins. Stack a few and it climbs.",m:["Notice one thing you handled well this week.","Ask someone who knows you what you are good at.","Keep one small promise to yourself and let it count."]},
  leadership_satisfaction:{s:"People follow you because you have earned it.",g:"Influence is trust spent well. It is rebuilt in small keeps.",m:["Make one decision clearly instead of leaving it open.","Give credit publicly for something that was not yours.","Ask the people you lead what you should stop doing."]},
  relationship_satisfaction:{s:"The people close to you actually know you.",g:"Being known takes telling. Let someone further in.",m:["Tell one person something true you usually keep back.","Ask a friend how they are, then ask again.","Reach out to someone you have let drift."]},
};
