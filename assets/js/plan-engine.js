/* ============================================================
   Plan Engine: turns a Keystone result into a personalized 90-day plan.
   Reads keystone_results, finds the growth-focus scale, and builds a
   12-week plan whose actions target that specific dimension, with
   supporting work on the two next-lowest scales.

   Design: every one of the 26 scales has a "track": a name, a plain
   description of what growth looks like, and 12 weeks of concrete
   actions grouped into three 4-week phases (Establish, Deepen, Sustain).
   Requires: FC (supabase-client), window.KEYSTONE
   ============================================================ */
window.PLAN_ENGINE = window.PLAN_ENGINE || {};
(function(){

  // For each scale: a track of 12 weekly action pairs, phased.
  // Phase 1 (wks 1-4) Establish, Phase 2 (wks 5-8) Deepen, Phase 3 (wks 9-12) Sustain.
  // Each week = [primary action, secondary action]. Written as concrete, doable, no jargon.
  var TRACKS = {
    involvement: {
      focus: "Being in the room, in the moments, on purpose.",
      weeks: [
        ["Put three fixed times with each kid on the calendar this week.","Do one everyday task alongside your child instead of for them."],
        ["Keep all three times. No reschedule.","Teach your child one small skill you know."],
        ["Ask each kid what they'd want to do with you.","Show up to one thing that matters to them."],
        ["Hold the schedule through one hard day.","Take an active role in one school or activity thing."],
        ["Add a fourth standing time.","Do a project together that takes more than one sitting."],
        ["Let your child pick the activity twice this week.","Be fully present, phone away, for one full hour."],
        ["Start a small tradition only you two share.","Ask about their day before you talk about yours."],
        ["Notice which kid got less of you, and rebalance.","Coach or help with one thing they're learning."],
        ["Make the standing times automatic, not negotiated.","Invite their friend along to something."],
        ["Ask your child to teach YOU something.","Show up early to one thing, unhurried."],
        ["Review the ninety days with your kid in the room.","Plan one bigger thing together for next season."],
        ["Lock the rhythm in for the next quarter.","Tell your child what you noticed change in you."]
      ]
    },
    consistency: {
      focus: "Being someone your kids can predict and count on.",
      weeks: [
        ["Set one standing time per kid and keep it.","Tell your kids when they'll see you next. Every time."],
        ["Eat breakfast with your kids twice this week.","Put the next three kid dates where they can see them."],
        ["Keep the standing time. No reschedule.","Call or message at the exact time you said you would."],
        ["Ask each kid what they want your standing time to be.","Hold the schedule through one hard day."],
        ["Follow through on every small promise this week.","Name one rule and enforce it the same way each time."],
        ["Do what you said even when it's inconvenient.","Keep your reaction steady across the whole week."],
        ["Let your kids catch you keeping your word.","Set a limit and hold it without a fight."],
        ["Repair fast the one time you slip.","Make bedtime or a routine the same three nights."],
        ["Make your follow-through boringly reliable.","Ask your kids if you've been predictable lately."],
        ["Keep the standard through a stressful week.","Hand off none of your standing times."],
        ["Review what your kids can now count on.","Name what you'll keep consistent next quarter."],
        ["Lock in the routines that worked.","Tell your kids what they can always expect from you."]
      ]
    },
    awareness: {
      focus: "Knowing who your child actually is, not who you assume.",
      weeks: [
        ["Learn the names of their three closest friends.","Ask one question about their world daily. No fixing."],
        ["Sit through one thing they love without your phone.","Ask what was hard this week. Just listen."],
        ["Learn one thing they're worried about.","Notice one mood change and name it gently."],
        ["Ask their teacher or coach one question.","Repeat back what you heard them say this week."],
        ["Learn what they're proud of right now.","Ask about something they care about, then follow up."],
        ["Find out one dream they have.","Catch a feeling before they say it out loud."],
        ["Learn what's hard for them at school.","Ask a question you don't know the answer to."],
        ["Notice what's changed in them lately.","Sit with them in a hard feeling without solving it."],
        ["Learn their opinion on something that matters to them.","Ask how they're really doing, and wait."],
        ["Know their gifts well enough to name them.","Notice growth and tell them you see it."],
        ["Review what you've learned about who they are.","Ask what they wish you understood."],
        ["Keep asking after the plan ends.","Tell them one true thing you now see in them."]
      ]
    },
    nurturance: {
      focus: "Making sure your child feels loved, not just provided for.",
      weeks: [
        ["Tell each kid one specific thing you're proud of.","Show affection in the way each kid receives it."],
        ["Praise effort, not just results, three times.","Point out one quality you like in them."],
        ["Tell your child they matter to you, out loud.","Have one close, unhurried moment this week."],
        ["Notice something small they did well.","End one hard day with warmth, not a lecture."],
        ["Tell them you love them without an occasion.","Build one memory just for the two of you."],
        ["Catch them being good and say so.","Give a hug or blessing they didn't earn."],
        ["Tell a story about when they were small.","Sit close during something ordinary."],
        ["Let them overhear you brag about them.","Repair one moment where you were harsh."],
        ["Make encouragement your default this week.","Say the thing you assume they already know."],
        ["Tell each kid what you respect about them.","Show up warm even when you're tired."],
        ["Review how loved each kid feels right now.","Ask what makes them feel closest to you."],
        ["Keep the warmth after the plan ends.","Tell them what being their dad means to you."]
      ]
    },
    commitment: {
      focus: "Choosing to show up, especially when you don't feel like it.",
      weeks: [
        ["Do one fathering task you've been avoiding.","Show up to one thing even though you're tired."],
        ["Start the hard thing before you feel ready.","Play one game with your kids this week."],
        ["Keep going on one thing you'd normally quit.","Work on something together, start to finish."],
        ["Do the thing you know you should, on time.","Push through one low-motivation day."],
        ["Take initiative before being asked.","Spend real time with each kid this week."],
        ["Choose your kids over your comfort once.","Follow through when it'd be easy not to."],
        ["Do the unglamorous fathering work.","Show up fully when part of you wants out."],
        ["Beat procrastination on one family thing.","Be the one who makes it happen this week."],
        ["Make showing up your default, not your effort.","Do it tired, do it anyway."],
        ["Take on one thing you've delegated away.","Lead one thing your family needed you to."],
        ["Review what you pushed through these weeks.","Name the one thing you'll keep doing."],
        ["Lock in the habit of showing up.","Tell your kids what they can count on from you."]
      ]
    },
    active_listening: {
      focus: "Really hearing your kids, not just waiting to respond.",
      weeks: [
        ["Listen to one thing fully before responding.","Put the phone down when they start talking."],
        ["Ask a follow-up instead of giving advice.","Let them finish without interrupting, all week."],
        ["Repeat back what they said before you reply.","Show you care when they bring a problem."],
        ["Listen to a hard thing without fixing it.","Give full attention for one conversation daily."],
        ["Ask 'tell me more' at least three times.","Catch what they didn't say out loud."],
        ["Let a silence sit instead of filling it.","Hear the feeling under the words."],
        ["Listen when it's inconvenient.","Ask what they need before offering a solution."],
        ["Notice when you're half-listening, and stop.","Give one kid your undivided attention."],
        ["Make listening your first move, not talking.","Reflect back a feeling you heard."],
        ["Listen to something you disagree with, fully.","Ask a question you don't know the answer to."],
        ["Review whether they feel heard by you.","Ask if they feel like you listen."],
        ["Keep listening first after the plan ends.","Tell them you're working on hearing them better."]
      ]
    },
    emotional_regulation: {
      focus: "Staying steady, so your kids don't manage your moods.",
      weeks: [
        ["Name your own feeling before you react, once.","Take a breath before responding when tension rises."],
        ["Stay calm through one difficult conversation.","Walk away and return instead of blowing up."],
        ["Keep your poise during one stressful moment.","Notice your anger early, before it lands on them."],
        ["Respond even-tempered when you'd normally snap.","Repair fast the one time you lose it."],
        ["Model calm in one heated moment.","Let your kids see you handle stress well."],
        ["Catch your frustration before it shows.","Stay level through a hard family day."],
        ["Keep steady when they push your buttons.","Choose your response instead of reacting."],
        ["Be the calm one in one conflict.","Show them what regulated looks like."],
        ["Make steadiness your default this week.","Handle one provocation without heat."],
        ["Stay poised through a genuinely hard week.","Own it out loud the one time you don't."],
        ["Review how steady you've been with them.","Ask if they'd call you even-tempered."],
        ["Keep the steadiness after the plan ends.","Tell them you're working on staying calm."]
      ]
    },
    legacy_planning: {
      focus: "Fathering with the long view, not just the day in front of you.",
      weeks: [
        ["Write down one goal for your family.","Start one small tradition this week."],
        ["Name a long-term hope for each kid.","Connect with a relative your kids should know."],
        ["Make one plan that stretches past this year.","Ask an older man you respect for advice."],
        ["Learn each kid's dreams and write them down.","Do one thing that builds family memory."],
        ["Draft what you want to be true in ten years.","Tell a story from your own growing up."],
        ["Build a tradition your kids can count on.","Seek wisdom from someone further down the road."],
        ["Plan one thing that outlasts this season.","Connect your kids to their history."],
        ["Name the values you want to pass down.","Start something your kids will inherit."],
        ["Make the long view a weekly habit.","Invest in one relationship that shapes them."],
        ["Set goals with your kids in the room.","Establish one lasting family rhythm."],
        ["Review the legacy you're building.","Name what you want them to remember."],
        ["Lock in the traditions that stuck.","Tell your kids the story of your family."]
      ]
    },
    modeling: {
      focus: "Being the man you want your kids to become.",
      weeks: [
        ["Show emotional maturity in one hard moment.","Be the example in one thing you say this week."],
        ["Model the behavior you want to see, on purpose.","Own one mistake in front of your kids."],
        ["Be a good example in one area you've slipped.","Let them see you do the right hard thing."],
        ["Demonstrate the value you most want them to have.","Match your actions to your words this week."],
        ["Show them how a man handles being wrong.","Model respect in how you treat their mother."],
        ["Be the calm, steady example in one conflict.","Let them catch you keeping your word."],
        ["Show what integrity looks like up close.","Model how to treat people who can't help you."],
        ["Demonstrate maturity when it costs you.","Let them see you grow, not just arrive."],
        ["Make your example match your expectations.","Show them how a man apologizes."],
        ["Be the role model in one specific way.","Let them see how you handle pressure."],
        ["Review what your example is teaching.","Ask yourself what they're learning by watching."],
        ["Keep modeling it after the plan ends.","Tell them the man you're trying to be."]
      ]
    },
    freedom_expression: {
      focus: "Letting your kids be themselves around you, safely.",
      weeks: [
        ["Let your child disagree with you once, calmly.","Respond without heat when they push back."],
        ["Be patient through one mistake.","Let them tell you something hard without reacting."],
        ["Allow a strong feeling without shutting it down.","Stay calm when they say something hurtful."],
        ["Let them make one choice you'd make differently.","Respond calmly to something you don't like."],
        ["Make it safe to bring you bad news.","Let them be fully themselves for one afternoon."],
        ["Welcome a disagreement instead of ending it.","Be patient when they're figuring it out."],
        ["Let them express anger without punishment.","Hear a hard truth about yourself, calmly."],
        ["Make room for who they actually are.","Respond to a mistake with patience, not heat."],
        ["Let them push back and stay steady.","Show them their feelings don't scare you."],
        ["Make your reaction safe to predict.","Let them be different from you, out loud."],
        ["Review whether they can be real with you.","Ask if they feel safe telling you things."],
        ["Keep it safe after the plan ends.","Tell them they can always be honest with you."]
      ]
    },
    knowing_my_child: {
      focus: "Knowing your child's world well enough to guide it.",
      weeks: [
        ["Learn your child's current favorite thing.","Ask about their friends by name this week."],
        ["Find out what they're good at right now.","Learn one dream they're carrying."],
        ["Know what's hard for them these days.","Ask about their heroes and why."],
        ["Learn what they can do for their age.","Notice what's changed in them lately."],
        ["Find out their opinion on something real.","Ask what they wish you knew about them."],
        ["Learn who they look up to and why.","Know one thing they're anxious about."],
        ["Find out what they're proud of.","Ask about their world before yours."],
        ["Learn their strengths well enough to name them.","Notice a shift and ask about it."],
        ["Make knowing them a weekly habit.","Ask a question that surprises them."],
        ["Know their friends' names and stories.","Learn what makes them light up."],
        ["Review how well you know their world.","Ask what you still get wrong about them."],
        ["Keep learning them after the plan ends.","Tell them one true thing you've come to see."]
      ]
    },
    financial_provision: {
      focus: "Providing steadily, so your family feels secure.",
      weeks: [
        ["Make sure this week's basic needs are covered.","Review where the money actually goes."],
        ["Set one small financial goal for the family.","Have one honest conversation about provision."],
        ["Build one buffer, however small.","Make one steady, boring financial choice."],
        ["Cover a need before it becomes urgent.","Plan one month ahead this week."],
        ["Make provision predictable, not last-minute.","Protect the family's stability in one decision."],
        ["Set aside something, even a little.","Handle one financial thing you've avoided."],
        ["Make the basics reliable.","Plan for one thing coming down the road."],
        ["Reduce one financial stress on the family.","Keep provision steady through a hard week."],
        ["Make steady income the goal, not a windfall.","Cover the essentials without drama."],
        ["Build toward one longer-term security.","Protect what the family depends on."],
        ["Review what security you've built.","Name the next financial step for the family."],
        ["Lock in the steady habits.","Tell your family what you're building toward."]
      ]
    },
    education_involvement: {
      focus: "Being an active part of how your child grows and learns.",
      weeks: [
        ["Take an active role in one school thing.","Help with one thing they're learning."],
        ["Learn what they're studying right now.","Make a plan to support one strength."],
        ["Help them understand one hard subject.","Teach them one skill outside school."],
        ["Show up for one educational moment.","Ask their teacher one real question."],
        ["Support one talent they're developing.","Sit with them through homework once."],
        ["Learn where they're struggling in school.","Encourage one area of growth."],
        ["Take initiative on their learning.","Help them build one skill this week."],
        ["Be present for their educational world.","Notice and support one strength."],
        ["Make your involvement in learning a habit.","Ask what they want to get better at."],
        ["Invest in one long-term skill.","Support their growth without pressure."],
        ["Review how involved you've been in learning.","Ask what they need from you educationally."],
        ["Keep showing up for it after the plan.","Tell them you're proud of how they're growing."]
      ]
    },
    parental_discussion: {
      focus: "Partnering with your child's mother on raising them well.",
      weeks: [
        ["Discuss one thing about your child together.","Talk through one problem your child is facing."],
        ["Set one goal for your child together.","Share one frustration honestly and kindly."],
        ["Get on the same page about one rule.","Discuss how your child is really doing."],
        ["Make one parenting decision as a team.","Talk about what your child needs right now."],
        ["Have one unhurried conversation about the kids.","Align on one thing you've disagreed about."],
        ["Bring up one worry before it grows.","Plan one thing for your child together."],
        ["Discuss a strength you both see.","Talk through a hard parenting moment."],
        ["Partner on one challenge your child has.","Check in on how you're each doing as parents."],
        ["Make regular parenting talks a habit.","Align before the next hard decision."],
        ["Discuss the long view for your child together.","Support each other in one parenting struggle."],
        ["Review how well you've partnered.","Name one thing to keep discussing."],
        ["Keep the partnership after the plan ends.","Thank them for parenting alongside you."]
      ]
    },
    family_crises: {
      focus: "Being the steady, level head when things go wrong.",
      weeks: [
        ["Handle one small crisis calmly.","Stay level-headed in one stressful moment."],
        ["Plan how you'd respond to a hard situation.","Deal with one problem without blaming."],
        ["Be the calm one when something goes wrong.","Teach your child how to handle a setback."],
        ["Respond to a crisis with maturity.","Keep your head in one difficult moment."],
        ["Lead the family through one hard thing.","Show them crisis doesn't have to mean chaos."],
        ["Stay positive through one setback.","Handle a problem without making it worse."],
        ["Be the steady presence in a hard week.","Teach one lesson about handling trouble."],
        ["Deal with conflict maturely.","Model calm under real pressure."],
        ["Make level-headed your default in crisis.","Guide the family through one challenge."],
        ["Stay steady through a genuinely hard thing.","Show them how to recover from a setback."],
        ["Review how you've handled the hard moments.","Name how you want to show up in a crisis."],
        ["Keep the steadiness after the plan ends.","Tell your kids they can lean on you when it's hard."]
      ]
    },
    showing_affection: {
      focus: "Making your love visible and physical, not just assumed.",
      weeks: [
        ["Hug or bless your child every day this week.","Tell your child you love them, out loud."],
        ["Thank your child sincerely for something.","Say 'good job' when they finish something."],
        ["Show affection the way each kid receives it.","Have one warm, close moment daily."],
        ["Tell your child you're proud, specifically.","End one day with affection, not correction."],
        ["Make physical warmth a daily habit.","Tell them what you love about them."],
        ["Catch a good moment and mark it warmly.","Give affection they didn't have to earn."],
        ["Be openly warm even when you're busy.","Tell each kid one thing you love in them."],
        ["Repair one cold moment with warmth.","Sit close during something ordinary."],
        ["Make warmth your default this week.","Say the affectionate thing you usually think."],
        ["Show each kid they're delighted in.","Be warm when you're tired."],
        ["Review how much warmth each kid feels.","Ask what makes them feel loved by you."],
        ["Keep the affection after the plan ends.","Tell them you love them, and why."]
      ]
    },
    spiritual_moral: {
      focus: "Passing down what you believe and how to live it.",
      weeks: [
        ["Have one spiritual or moral conversation.","Stress honesty in one real moment."],
        ["Pray with or bless your child this week.","Read or share something meaningful together."],
        ["Talk about one value you hold, and why.","Participate in one meaningful practice together."],
        ["Model the character you want them to have.","Discuss right and wrong in one real situation."],
        ["Share one belief that guides you.","Live one value out loud this week."],
        ["Have a conversation about what matters most.","Show them faith or values in action."],
        ["Teach one lesson about integrity.","Practice one thing you believe, together."],
        ["Talk through a moral question they're facing.","Model the standard you want them to hold."],
        ["Make these conversations a habit.","Let them see what you live for."],
        ["Pass down one thing that grounds you.","Discuss the kind of person to become."],
        ["Review what you're passing down.","Name the values you most want them to carry."],
        ["Keep the conversations after the plan.","Tell them what you hope they'll believe."]
      ]
    },
    time_commitment: {
      focus: "Giving your kids the one thing you can't get back: time.",
      weeks: [
        ["Spend real time with each kid this week.","Sacrifice one thing to be with your child."],
        ["Give each kid individual attention.","Schedule special time and keep it."],
        ["Protect kid time from getting cut.","Be fully present for one full hour."],
        ["Give time to the kid who got less.","Say yes to one thing you'd normally skip."],
        ["Make time a priority, not a leftover.","Spend one unhurried afternoon together."],
        ["Choose your kids over one distraction.","Give attention without multitasking."],
        ["Protect the time you set aside.","Be present, not just around."],
        ["Rebalance time toward whoever needs it.","Give one kid your full evening."],
        ["Make quality time automatic this week.","Guard one block of time fiercely."],
        ["Sacrifice something to be more present.","Give each kid a moment that's just theirs."],
        ["Review how your time actually got spent.","Ask if they got enough of you."],
        ["Keep protecting the time after the plan.","Tell them time with them matters most."]
      ]
    },
    giving_guidance: {
      focus: "Guiding and correcting with steadiness, not just reacting.",
      weeks: [
        ["Correct one thing calmly and clearly.","Set one boundary and hold it."],
        ["Take responsibility for guiding one behavior.","Give clear expectations, then follow through."],
        ["Guide without losing your temper.","Set a limit that helps them, not just you."],
        ["Correct in a way that teaches, not shames.","Be consistent about one expectation."],
        ["Give guidance before it becomes a problem.","Hold a boundary through pushback."],
        ["Discipline calmly and fairly.","Set the standard and keep it steady."],
        ["Guide toward something, not just away.","Correct one thing without heat."],
        ["Take the lead on one behavior that needs it.","Give instruction that builds them up."],
        ["Make your guidance predictable and fair.","Hold the line kindly but firmly."],
        ["Correct with the long game in mind.","Set expectations that stretch them well."],
        ["Review how you've guided them.","Ask if your correction feels fair to them."],
        ["Keep guiding steadily after the plan.","Tell them why you hold the standards you do."]
      ]
    },
    marital_relationship: {
      focus: "Strengthening your marriage, which your kids are watching.",
      weeks: [
        ["Do one thing that strengthens your marriage.","Model healthy interaction with your wife."],
        ["Spend time with your wife away from the kids.","Show your kids what respect looks like."],
        ["Invest in the relationship, not just the household.","Handle one disagreement well, in front of them."],
        ["Prioritize your marriage in one real way.","Let your kids see warmth between you two."],
        ["Have one real conversation with your wife.","Model partnership this week."],
        ["Do one thing she'd appreciate, unprompted.","Show the kids a healthy marriage up close."],
        ["Protect time for your marriage.","Let them see you resolve, not just argue."],
        ["Strengthen one weak spot in the relationship.","Model how a man treats his wife."],
        ["Make your marriage a visible priority.","Show affection your kids can see."],
        ["Invest in the long health of your marriage.","Let them learn marriage by watching yours."],
        ["Review how your marriage is doing.","Ask your wife how you're doing as a partner."],
        ["Keep investing after the plan ends.","Show your kids what lasting love looks like."]
      ]
    },
    job_satisfaction: {
      focus: "Bringing a steadier, more present self home from work.",
      weeks: [
        ["Leave one work stress at the door this week.","Be fully home when you're home, once."],
        ["Notice how work mood affects the family.","Protect one evening from work entirely."],
        ["Find one thing to value in your work.","Transition from work to home on purpose."],
        ["Don't let a hard workday land on the kids.","Be present at dinner, work off."],
        ["Bring your better self home this week.","Guard family time from work creep."],
        ["Handle work stress before it comes home.","Give the family your presence, not your leftovers."],
        ["Keep work in its lane this week.","Be home in mind, not just body."],
        ["Reduce one way work steals from home.","Show up for the family fully once."],
        ["Make the work-to-home shift a habit.","Protect the family from your worst work days."],
        ["Bring steadiness home despite work.","Keep one boundary between job and family."],
        ["Review how work is affecting your fathering.","Name one boundary to keep with work."],
        ["Keep the boundary after the plan ends.","Tell your family they get your best, not your rest."]
      ]
    },
    flourishing: {
      focus: "Taking care of yourself so you can father well.",
      weeks: [
        ["Do one thing this week to grow as a father.","Take one real step for your own health."],
        ["Read, listen, or learn one fathering thing.","Move your body regularly this week."],
        ["Invest in becoming a better man.","Tend one part of your own well-being."],
        ["Cultivate one thing that keeps you steady.","Do something that fills you back up."],
        ["Grow in one area on purpose.","Take care of the body your kids depend on."],
        ["Feed your own growth this week.","Do one thing for your own soul."],
        ["Keep learning how to father well.","Protect your own health, not just theirs."],
        ["Work on becoming, not just doing.","Refill so you have something to give."],
        ["Make your own growth a habit.","Stay healthy for the long haul."],
        ["Invest in the man you're becoming.","Tend yourself so you can tend them."],
        ["Review how you've grown these weeks.","Name one way you'll keep growing."],
        ["Keep growing after the plan ends.","Model what it looks like to keep becoming."]
      ]
    },
    // Satisfaction scales: these are outcome measures. If one is the gap, we route to a
    // reflective/foundational track rather than behavioral drills.
    childhood_satisfaction: {
      focus: "Understanding your own upbringing so it doesn't run you.",
      weeks: [
        ["Name one thing you didn't get that you want to give.","Notice one way you father like you were fathered."],
        ["Write down one good thing your dad gave you.","Catch one reaction that comes from your childhood."],
        ["Name one thing you're choosing to do differently.","Forgive one thing, for your own sake."],
        ["Decide one pattern stops with you.","Give your kid one thing you longed for."],
        ["Talk to someone about your growing up.","Notice where your past shapes your parenting."],
        ["Keep one good tradition from your childhood.","Break one pattern you don't want to pass on."],
        ["Name what you needed and didn't get.","Give that thing to your child this week."],
        ["Make peace with one part of your story.","Let your history teach, not control."],
        ["Choose the father you want to be, on purpose.","Notice growth in how you respond."],
        ["Honor what was good, release what wasn't.","Give your kids the childhood you're proud of."],
        ["Review the patterns you've changed.","Name what stops with you."],
        ["Keep choosing your own way forward.","Tell your kids the kind of dad you're choosing to be."]
      ]
    },
    fathering_satisfaction: {
      focus: "Growing into a father you feel good about being.",
      weeks: [
        ["Do one thing today you'll be proud of tonight.","Notice one thing you're already doing well."],
        ["Take one step toward the dad you want to be.","Name one small win as a father this week."],
        ["Close one gap between who you are and want to be.","Let one good moment count."],
        ["Father on purpose in one moment this week.","Notice growth, not just gaps."],
        ["Do one thing that makes you proud to be their dad.","Build one memory worth keeping."],
        ["Show up the way you want to be remembered.","Catch yourself getting it right."],
        ["Take one action the future you would thank you for.","Name what's working."],
        ["Father from intention, not autopilot.","Let one win build your confidence."],
        ["Make one choice your kids will remember well.","Notice how far you've come."],
        ["Be the dad you'd want for your kids.","Own one thing you're doing right."],
        ["Review what you're proud of these weeks.","Name the father you're becoming."],
        ["Keep becoming him after the plan ends.","Tell yourself the truth about your growth."]
      ]
    },
    leadership_satisfaction: {
      focus: "Growing in confidence as the leader of your family.",
      weeks: [
        ["Make one clear decision for the family.","Lead one thing instead of waiting."],
        ["Take the lead on one thing this week.","Ask your wife how you can lead better."],
        ["Set one direction and hold it.","Lead with confidence in one moment."],
        ["Make a call your family needed you to make.","Own your role as a leader this week."],
        ["Lead the family through one decision.","Step up where you'd normally step back."],
        ["Guide the family with confidence.","Take responsibility for one thing."],
        ["Lead one hard conversation.","Show up as the steady leader once."],
        ["Make leadership your posture this week.","Ask for feedback on how you lead."],
        ["Lead from confidence, not control.","Own one leadership moment fully."],
        ["Set direction with your family's input.","Lead in a way they can follow."],
        ["Review how you've led these weeks.","Name where you want to lead better."],
        ["Keep leading after the plan ends.","Tell your family the direction you're leading them."]
      ]
    },
    satisfaction_child_rel: {
      focus: "Deepening the actual relationship with your child.",
      weeks: [
        ["Have one real conversation with each kid.","Make it easy for them to talk to you."],
        ["Ask a question that opens them up.","Listen so they want to keep talking."],
        ["Connect over one thing they care about.","Close one distance between you."],
        ["Be someone they want to talk to.","Have one moment of real connection."],
        ["Build the relationship, not just the routine.","Ask how they're really doing."],
        ["Make space for them to open up.","Deepen one conversation past the surface."],
        ["Connect before you correct this week.","Be a safe person to talk to."],
        ["Repair one distance in the relationship.","Have one honest, warm exchange."],
        ["Make connection your priority.","Ask what would bring you closer."],
        ["Strengthen the bond with each kid.","Let them know the door is always open."],
        ["Review how close you are with each kid.","Ask if they feel close to you."],
        ["Keep building it after the plan ends.","Tell them you always want to hear from them."]
      ]
    }
  };

  // A readable label for each scale (pulled from the instrument at runtime).
  function labelFor(scaleKey){
    var found = null;
    if(window.KEYSTONE){
      window.KEYSTONE.sections.forEach(function(sec){
        sec.scales.forEach(function(sc){ if(sc.key===scaleKey) found = sc.label; });
      });
    }
    return found || scaleKey;
  }

  // Given a Keystone result row, build the personalized plan.
  // Returns { focusScale, focusLabel, focusText, weeks:[{week, phase, phaseLabel, primaryLabel, actions:[...]}], supporting:[...] }
  PLAN_ENGINE.build = function(result){
    var gap = result.gap_scale || 'consistency';
    var track = TRACKS[gap] || TRACKS.consistency;
    var phaseLabels = ['Establish', 'Deepen', 'Sustain'];

    // supporting scales: the two next-lowest, for context on the plan page
    var supporting = [];
    if(result.scale_scores){
      var arr = Object.keys(result.scale_scores).map(function(k){
        return {key:k, pct: result.scale_scores[k].pct, label: result.scale_scores[k].label};
      }).filter(function(s){ return s.key !== gap; })
        .sort(function(a,b){ return a.pct - b.pct; });
      supporting = arr.slice(0,2);
    }

    var weeks = track.weeks.map(function(pair, i){
      var week = i+1;
      var phase = Math.floor(i/4); // 0,1,2
      return {
        week: week,
        phase: phase,
        phaseLabel: phaseLabels[phase],
        actions: pair
      };
    });

    return {
      focusScale: gap,
      focusLabel: labelFor(gap),
      focusText: track.focus,
      overall: result.overall_pct,
      sectionScores: result.section_scores,
      scaleScores: result.scale_scores,
      strengthScale: result.strength_scale,
      strengthLabel: labelFor(result.strength_scale),
      supporting: supporting,
      weeks: weeks,
      phaseNames: [
        track.weeks[0] ? phaseLabels[0] : '',
        phaseLabels[1], phaseLabels[2]
      ]
    };
  };

  // Which week is the man on, given when he completed the assessment?
  PLAN_ENGINE.currentWeek = function(completedAt){
    var start = new Date(completedAt).getTime();
    var days = Math.floor((Date.now() - start) / 86400000);
    return Math.min(12, Math.max(1, Math.floor(days/7) + 1));
  };

  PLAN_ENGINE.allScales = function(){ return Object.keys(TRACKS); };
})();
