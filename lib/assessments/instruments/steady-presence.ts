import {
  buildChoiceSumInstrument,
  type AssessmentInstrument,
} from "@/lib/assessments/instrument";

export const STEADY_PRESENCE_ASSESSMENT_KEY = "steady-presence";
export const STEADY_PRESENCE_SLUG = "steady-presence";
export const STEADY_PRESENCE_TITLE = "The Steady Presence Keystone Assessment";
export const STEADY_PRESENCE_QUESTION_COUNT = 30;

export const STEADY_PRESENCE_COPY = {
  introduction:
    "This assessment examines the quality and reliability of your daily presence: how you show up, regulate yourself, know your children, and create the calm strength that lets a family breathe.",
  purpose:
    "To surface whether your presence is actually felt as steady and available, or whether distraction, stress leakage, and inconsistency erode the very connection you intend to build.",
  goal: "To become the reliable center of gravity: emotionally regulated, deeply informed about each child, present in the moments that matter, and capable of holding the household steady when external pressure rises.",
  honestHint: "Answer honestly from how you actually show up now, not from the presence you intend to offer.",
};

export const STEADY_PRESENCE_BANDS = [
  {
    min: 105,
    max: 120,
    label: "Keystone Presence",
    description:
      "Your children experience a reliable center of gravity. Keep protecting the rhythms and the recovery practices that make this possible; the compounding effect over years is enormous.",
  },
  {
    min: 85,
    max: 104,
    label: "Reliable Anchor",
    description:
      "Strong baseline with room to deepen knowledge of each child and tighten recovery under stress. Small, consistent upgrades in attention quality will move you into the top range.",
  },
  {
    min: 65,
    max: 84,
    label: "Emerging Steadiness",
    description:
      "Desire is clear; execution under load is the gap. Choose two non-negotiable presence practices (device boundaries + one weekly one-on-one) and defend them for 90 days.",
  },
  {
    min: 30,
    max: 64,
    label: "Blueprint Stage",
    description:
      "Presence is still intermittent. Begin with radical honesty about current distraction and stress leakage, then install the smallest reliable daily block of undivided attention. Steadiness is built one protected hour at a time.",
  },
] as const;

const QUESTIONS: Array<{
  prompt: string;
  a: string;
  b: string;
  c: string;
  d: string;
}> = [
  {
    prompt: "On a typical weekday evening, your attention is primarily:",
    a: "Fully with the family for defined blocks, devices secondary",
    b: "Split but mostly present",
    c: "Frequently interrupted",
    d: "Mentally still at work or elsewhere",
  },
  {
    prompt: "You know the current emotional climate and key relationships of each child because:",
    a: "You ask, listen, and track over time",
    b: "You notice when something is off",
    c: "You rely mostly on reports from others",
    d: "You are often surprised",
  },
  {
    prompt: "When stress hits you, the household experiences:",
    a: "Contained strength and later recovery",
    b: "Mild tension that passes",
    c: "Noticeable leakage",
    d: "Withdrawal or volatility",
  },
  {
    prompt: "Quality one-on-one time with each child happens:",
    a: "On a protected rhythm",
    b: "When schedules allow",
    c: "Rarely in a focused way",
    d: "Almost never",
  },
  {
    prompt: "Your children initiate hard conversations with you because:",
    a: "They have learned you can hold them without overreacting",
    b: "Sometimes",
    c: "Rarely",
    d: "Almost never",
  },
  {
    prompt: "Device use during family meals or key interactions is:",
    a: "Strictly limited or banned",
    b: "Mostly controlled",
    c: "Frequent",
    d: "Normalized",
  },
  {
    prompt: "How accurately can you describe each child's current fears, hopes, and pressures?",
    a: "Quite accurately",
    b: "In general terms",
    c: "Partially",
    d: "Poorly",
  },
  {
    prompt: "Your emotional recovery after a hard day is:",
    a: "Intentional and relatively quick",
    b: "Takes time but happens",
    c: "Often incomplete",
    d: "Frequently carried into the next day",
  },
  {
    prompt: "When your child is dysregulated, your default is:",
    a: "Calm presence first, then guidance",
    b: "Problem-solving",
    c: "Matching the intensity",
    d: "Distance",
  },
  {
    prompt: "Work or external demands regularly cost the family:",
    a: "Protected boundaries keep the cost low",
    b: "Manageable cost",
    c: "Frequent cost",
    d: "Chronic cost",
  },
  {
    prompt: "You apologize and repair when you have been short or absent:",
    a: "Quickly and specifically",
    b: "When it is obvious",
    c: "Rarely",
    d: "Almost never",
  },
  {
    prompt: 'The overall "feel" your presence creates at home is:',
    a: "Settled strength",
    b: "Generally positive",
    c: "Unpredictable",
    d: "Distant or heavy",
  },
  {
    prompt: "You track and protect sleep, exercise, and basic recovery because:",
    a: "They directly determine the quality of your presence",
    b: "You try",
    c: "They are secondary",
    d: "Neglected",
  },
  {
    prompt: "Knowing the details of your children's daily world (friends, school dynamics, interests) is:",
    a: "A priority you invest in",
    b: "Partial",
    c: "Surface-level",
    d: "Low",
  },
  {
    prompt: "When you are physically home, you are mentally:",
    a: "Mostly available",
    b: "Often still processing work",
    c: "Frequently elsewhere",
    d: "Rarely fully present",
  },
  {
    prompt: "Your children would say you are someone they can count on emotionally because:",
    a: "Consistent evidence over years",
    b: "Mostly true",
    c: "Inconsistent",
    d: "Not yet",
  },
  {
    prompt: "Conflict between you and your partner is handled so that children:",
    a: "See respectful resolution or protected privacy",
    b: "Sometimes overhear tension",
    c: "Frequently feel the tension",
    d: "Live in chronic undercurrent",
  },
  {
    prompt: "You create rhythms (meals, evenings, weekends) that signal reliability:",
    a: "Yes, protected and consistent",
    b: "Mostly",
    c: "Frequently broken",
    d: "Chaotic",
  },
  {
    prompt: "Self-awareness of your own triggers and patterns is:",
    a: "High and actively managed",
    b: "Moderate",
    c: "Limited",
    d: "Low",
  },
  {
    prompt: "When a child needs you at an inconvenient time, your internal response is:",
    a: "Availability first, then logistics",
    b: "Negotiation",
    c: "Frustration",
    d: "Resentment",
  },
  {
    prompt: "Modeling emotional regulation looks like:",
    a: "Visible practice and occasional explicit teaching",
    b: "Trying to stay calm",
    c: "Inconsistent",
    d: "Rarely demonstrated",
  },
  {
    prompt: "Your knowledge of each child's developmental stage and current needs is:",
    a: "Actively updated",
    b: "General",
    c: "Outdated",
    d: "Minimal",
  },
  {
    prompt: "Time with children is protected from:",
    a: "Unnecessary interruptions and multitasking",
    b: "Most major interruptions",
    c: "Frequently invaded",
    d: "Rarely protected",
  },
  {
    prompt: "After a period of high work demand, you intentionally:",
    a: "Rebuild connection and presence",
    b: "Return to normal",
    c: "Stay in high-gear mode",
    d: "Collapse",
  },
  {
    prompt: "Children experience your love as:",
    a: "Both warm and boundaried",
    b: "Warm",
    c: "Boundaried but cooler",
    d: "Unclear",
  },
  {
    prompt: "You have trusted outlets (people, practices) so that the family is not your only pressure valve:",
    a: "Yes",
    b: "Partially",
    c: "Minimal",
    d: "No",
  },
  {
    prompt: "Presence during ordinary moments (car rides, chores, downtime) is:",
    a: "Often used for real connection",
    b: "Sometimes",
    c: "Rarely",
    d: "Filled with distraction",
  },
  {
    prompt: "Your long-term goal for the father-child relationship is:",
    a: "Mutual respect and voluntary closeness in adulthood",
    b: "Continued provision and occasional contact",
    c: "Undefined",
    d: "Not considered",
  },
  {
    prompt: "When you notice yourself becoming distant or irritable, you:",
    a: "Course-correct quickly",
    b: "Notice later",
    c: "Rarely notice in the moment",
    d: "Rarely notice at all",
  },
  {
    prompt: "Overall, the presence you offer is best described as:",
    a: "Steady, informed, and durable",
    b: "Well-intentioned and mostly reliable",
    c: "Inconsistent under load",
    d: "Frequently compromised",
  },
];

export const steadyPresenceInstrument: AssessmentInstrument = buildChoiceSumInstrument({
  dimensionId: "presence",
  dimensionLabel: "Presence",
  items: QUESTIONS.map((question, index) => ({
    id: `presence-${index + 1}`,
    prompt: question.prompt,
    choices: [
      { key: "A", label: question.a },
      { key: "B", label: question.b },
      { key: "C", label: question.c },
      { key: "D", label: question.d },
    ],
  })),
  bands: STEADY_PRESENCE_BANDS.map((band) => ({ ...band })),
});

export const STEADY_PRESENCE_DESCRIPTION =
  "A 30-question look at how reliably you show up. Answer from the presence your children actually meet, not the one you intend.";
