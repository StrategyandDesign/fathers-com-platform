// The Keystone Manhood Profile, KMP-0.1-draft.
// Status: DRAFT ITEM BANK. Not validated. Not normed. Not deployed.
// Deployment is gated on Dr. Ken Canfield's psychometric review and a norming study.
// Architecture mirrors the Keystone Father Profile exactly: 128 items, 26 scales,
// three sections, identical response scales, identical per-scale item counts,
// identical scoring machinery. Equal length, equal weighting, equal scoring by design.
// Research basis (documented in POSITIONING.md): positive-masculinity framework
// (Kiselica and Englar-Carlson), conscientiousness and self-control outcome research,
// generativity research, prosociality measurement, adult-development relationship findings.
// The four headline dimensions parallel Involvement, Consistency, Awareness, Nurturance:
// Presence, Discipline, Respect, Service.
window.KEYSTONE_MANHOOD = {
  "slug": "keystone-manhood-profile",
  "title": "The Keystone Manhood Profile",
  "version": "KMP-0.1-draft",
  "validated": false,
  "provisional": true,
  "norms_n": 0,
  "norms_note": "No norms exist. Scored deployment requires psychometric sign-off and a norming study. Until then results may be reported as raw baselines only, clearly labeled.",
  "description": "The manhood inventory in development. 128 items, 26 scales, mirroring the Keystone Father Profile architecture. Draft under review.",
  "sections": [
    {
      "key": "dimensions",
      "title": "Manhood Dimensions",
      "instruction": "Decide how accurate each statement is concerning your life as a man.",
      "scale": { "kind": "likert5", "labels": ["Mostly False", "Somewhat False", "Uncertain", "Somewhat True", "Mostly True"] },
      "scales": [
        { "key": "presence", "label": "Presence", "mean": null, "sd": null, "rel": null, "items": [
          "I am engaged in the lives of the people closest to me.",
          "I often have real conversations with the people who count on me.",
          "I schedule time for the people who matter to me.",
          "I show up when I say I will show up.",
          "I take an active role in my family or my closest circle.",
          "The people close to me and I often do things together."
        ]},
        { "key": "discipline", "label": "Discipline", "mean": null, "sd": null, "rel": null, "items": [
          "People know what to expect from me.",
          "I keep the commitments I make.",
          "I hold myself to standards even when no one is watching.",
          "I set limits on my own behavior and keep them.",
          "I correct my own course when I am drifting.",
          "I live the way I tell others to live."
        ]},
        { "key": "respect", "label": "Respect", "mean": null, "sd": null, "rel": null, "items": [
          "I treat women with respect in every setting.",
          "I speak about people the same way whether or not they are in the room.",
          "I listen to opinions I disagree with without belittling the person.",
          "I honor the people in authority over me even when I disagree.",
          "I keep my word to people who could never make me keep it.",
          "I treat people who can do nothing for me with dignity."
        ]},
        { "key": "service", "label": "Service", "mean": null, "sd": null, "rel": null, "items": [
          "I look for ways to be useful to the people around me.",
          "I help without being asked.",
          "I put the needs of my family or community ahead of my comfort.",
          "I use what I am good at to serve someone else.",
          "I check on people who are struggling.",
          "I carry weight so that someone weaker does not have to."
        ]},
        { "key": "drift", "label": "Drift", "mean": null, "sd": null, "rel": null, "reverse": true, "items": [
          "I rarely make time for the people who need me.",
          "I have difficulty getting motivated to handle my responsibilities.",
          "The people close to me and I seldom spend real time together.",
          "It is hard for me to get going on the things that matter.",
          "I tend to delay doing the things I know I should do.",
          "I rarely follow through on what I start.",
          "I avoid taking action when action is needed."
        ]},
        { "key": "listening", "label": "Active Listening", "mean": null, "sd": null, "rel": null, "items": [
          "I pay attention when people speak to me.",
          "I carefully listen when someone expresses a concern to me.",
          "I listen to the people close to me when they talk to me.",
          "I show people that I care when they share a problem with me."
        ]},
        { "key": "work", "label": "Work", "mean": null, "sd": null, "rel": null, "items": [
          "I do work that I can be proud of.",
          "I earn my own way or I am working a plan to get there.",
          "My work gives me a sense of accomplishment.",
          "I take on work that challenges me.",
          "My work gives me opportunity to grow as a person."
        ]},
        { "key": "steadiness", "label": "Steadiness", "mean": null, "sd": null, "rel": null, "items": [
          "I keep my poise during stressful times.",
          "I remain calm in a difficult conversation.",
          "I can easily lose my temper during a conflict.",
          "People who know me would say I am even-tempered.",
          "I often get upset or angry with the people around me."
        ]},
        { "key": "direction", "label": "Direction", "mean": null, "sd": null, "rel": null, "items": [
          "I have established goals for my life.",
          "I have built habits and routines that hold my life steady.",
          "I have a long-term plan for the kind of man I am becoming.",
          "I stay connected to the people who have known me longest.",
          "I seek the advice of older men I respect.",
          "I know what I am building my life toward."
        ]},
        { "key": "growth", "label": "Growth", "mean": null, "sd": null, "rel": null, "items": [
          "I have read a book, listened to a podcast, or attended a class in the past year to help me grow as a man.",
          "I am in good physical health and exercise regularly.",
          "I am making real progress as a man.",
          "I regularly cultivate the moral and/or spiritual aspects of my life.",
          "The people in my life enjoy being around me."
        ]}
      ]
    },
    {
      "key": "practices",
      "title": "Manhood Practices",
      "instruction": "Decide how successful you are in each of the following practices of your life as a man.",
      "scale": { "kind": "likert5", "labels": ["Very Poor", "Poor", "Fair", "Good", "Very Good"] },
      "scales": [
        { "key": "modeling", "label": "Modeling", "mean": null, "sd": null, "rel": null, "items": [
          "Demonstrating emotional maturity to the people around me.",
          "Being a mature example to younger men and boys.",
          "Being a good example to the people who watch my life.",
          "Living in a way I would want others to copy."
        ]},
        { "key": "restraint", "label": "Restraint", "mean": null, "sd": null, "rel": null, "items": [
          "Responding calmly when someone says hurtful things to me.",
          "Allowing people to disagree with me.",
          "Being patient with people when they make mistakes.",
          "Not losing my temper when I am provoked.",
          "Responding calmly when someone does something I do not agree with."
        ]},
        { "key": "knowing_people", "label": "Knowing My People", "mean": null, "sd": null, "rel": null, "items": [
          "Knowing the strengths and personalities of the people closest to me.",
          "Knowing the plans and dreams of the people closest to me.",
          "Knowing who my people spend their time with.",
          "Knowing the issues the people close to me are dealing with.",
          "Knowing who and what the people close to me look up to.",
          "Knowing what the people close to me need from me right now."
        ]},
        { "key": "provision", "label": "Provision", "mean": null, "sd": null, "rel": null, "items": [
          "Providing for my own needs without leaning on others.",
          "Keeping a consistent income or working a real plan toward one.",
          "Handling my money so that my obligations are met.",
          "Making certain the basic needs of the people who depend on me are met."
        ]},
        { "key": "skill_building", "label": "Skill Building", "mean": null, "sd": null, "rel": null, "items": [
          "Having a specific plan for my own growth.",
          "Developing my strengths and abilities on purpose.",
          "Learning new skills that make me more useful.",
          "Taking an active role in my own education or training.",
          "Teaching a skill to someone else.",
          "Finishing the training or study I start."
        ]},
        { "key": "counsel", "label": "Counsel", "mean": null, "sd": null, "rel": null, "items": [
          "Talking honestly with someone I trust about how my life is going.",
          "Bringing my real problems to someone instead of hiding them.",
          "Discussing my goals with someone who will hold me to them.",
          "Admitting my frustrations to someone instead of letting them build."
        ]},
        { "key": "crisis", "label": "Crisis", "mean": null, "sd": null, "rel": null, "items": [
          "Handling a crisis in a mature manner.",
          "Knowing what to do when things fall apart.",
          "Being able to deal with a crisis in a positive manner.",
          "Being level-headed during a crisis.",
          "Helping others stay steady during a crisis.",
          "Not blaming others when things go wrong."
        ]},
        { "key": "encouragement", "label": "Encouragement", "mean": null, "sd": null, "rel": null, "items": [
          "Telling people when they have done something well.",
          "Sincerely thanking people who help me.",
          "Telling someone they matter to me.",
          "Pointing out qualities in people that I respect.",
          "Building real relationships instead of keeping everyone at a distance.",
          "Telling someone I am proud of them."
        ]},
        { "key": "conviction", "label": "Conviction", "mean": null, "sd": null, "rel": null, "items": [
          "Telling the truth even when it costs me.",
          "Living by convictions rather than convenience.",
          "Stressing the importance of honesty in how I deal with people.",
          "Taking part in a community that holds me to something higher.",
          "Having honest conversations about right and wrong."
        ]},
        { "key": "time_for_others", "label": "Time for Others", "mean": null, "sd": null, "rel": null, "items": [
          "Spending time regularly with the people who count on me.",
          "Sacrificing some of my own activities for the people who need me.",
          "Giving individual attention to the people close to me.",
          "Setting aside special time for someone other than myself."
        ]},
        { "key": "accountability", "label": "Accountability", "mean": null, "sd": null, "rel": null, "items": [
          "Receiving correction without making excuses.",
          "Taking responsibility when I am wrong.",
          "Keeping the boundaries and expectations I have agreed to.",
          "Letting someone speak into my life with authority."
        ]},
        { "key": "close_relationships", "label": "Close Relationships", "mean": null, "sd": null, "rel": null, "items": [
          "Having a positive and honest relationship with the people closest to me.",
          "Working at my closest relationships instead of coasting.",
          "Spending unhurried time with the people I love.",
          "Repairing a relationship when I have damaged it."
        ]}
      ]
    },
    {
      "key": "satisfaction",
      "title": "Manhood Satisfaction",
      "instruction": "Decide how satisfied you are for each area stated below.",
      "scale": { "kind": "likert7", "labels": ["Extremely Dissatisfied", "Very Dissatisfied", "Somewhat Dissatisfied", "Mixed", "Somewhat Satisfied", "Very Satisfied", "Extremely Satisfied"] },
      "scales": [
        { "key": "childhood_satisfaction", "label": "Childhood Satisfaction", "mean": null, "sd": null, "rel": null, "items": [
          "How satisfied were you with your childhood?",
          "How satisfied were you with your relationship to your father while growing up?",
          "How satisfied were you with your relationship to your mother while growing up?",
          "How satisfied are you with the guidance you received while growing up?"
        ]},
        { "key": "manhood_satisfaction", "label": "Manhood Satisfaction", "mean": null, "sd": null, "rel": null, "items": [
          "How satisfied are you with yourself as a man?",
          "How satisfied are you with the direction your life is heading?",
          "How satisfied are you with the man you are becoming?"
        ]},
        { "key": "contribution_satisfaction", "label": "Contribution Satisfaction", "mean": null, "sd": null, "rel": null, "items": [
          "How satisfied are you with the confidence you have to lead when it is your turn to lead?",
          "How satisfied are you with the support you receive from the people around you?",
          "How satisfied are you with how useful you are to others?",
          "How satisfied are you with the respect you receive from the people who know you best?"
        ]},
        { "key": "relationship_satisfaction", "label": "Relationship Satisfaction", "mean": null, "sd": null, "rel": null, "items": [
          "How satisfied are you with your communication with the people closest to you?",
          "How satisfied are you with your ability to talk about what matters?",
          "How satisfied are you with how much the people close to you talk to you?"
        ]}
      ]
    }
  ]
};
