import {
  buildChoiceSumInstrument,
  type AssessmentInstrument,
} from "@/lib/assessments/instrument";

export const FAMILY_FORTRESS_ASSESSMENT_KEY = "family-fortress";
export const FAMILY_FORTRESS_SLUG = "family-fortress";
export const FAMILY_FORTRESS_TITLE = "The Family Fortress Keystone Assessment";
export const FAMILY_FORTRESS_QUESTION_COUNT = 30;

export const FAMILY_FORTRESS_COPY = {
  introduction:
    "This assessment measures how effectively you create and maintain real security for your household (financial, physical, emotional, and practical) under the pressures of the current environment.",
  purpose:
    "To reveal whether the structures you have built actually protect and stabilize the people who depend on you, or whether gaps leave the family exposed.",
  goal: "To move from short-term provision to durable fortress-building: resources that outlast setbacks, systems that reduce chaos, and a household that feels safe because it is ordered and prepared.",
  honestHint: "Answer honestly from current structures and behavior, not from the fortress you plan to build.",
};

export const FAMILY_FORTRESS_BANDS = [
  {
    min: 105,
    max: 120,
    label: "Keystone Fortress",
    description:
      "The structures are real. Your family experiences measurable security because you treat provision and protection as ongoing architecture, not a one-time achievement. Keep pressure-testing the weak points and transferring capability.",
  },
  {
    min: 85,
    max: 104,
    label: "Solid Walls",
    description:
      "Core elements are in place. Gaps in emergency readiness, consistency, or long-range transfer remain. Close the top two vulnerabilities this quarter.",
  },
  {
    min: 65,
    max: 84,
    label: "Rising Foundation",
    description:
      "Intent and some systems exist; reliability under stress is the issue. Install one financial buffer, one household system, and one protection practice, then protect them.",
  },
  {
    min: 30,
    max: 64,
    label: "Blueprint Stage",
    description:
      "Security is still mostly aspiration. Start with radical clarity on current numbers and risks, then build the smallest durable buffer and the simplest reliable system. Progress compounds once the first stones are set.",
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
    prompt: "Your household's emergency fund and basic insurance posture is:",
    a: "Intentionally built and reviewed",
    b: "Present but incomplete",
    c: "Minimal or informal",
    d: "Largely absent",
  },
  {
    prompt: "When income pressure rises, your first move is usually:",
    a: "Cut non-essentials, increase capacity, and protect the core",
    b: "Work more hours",
    c: "Use credit or delay decisions",
    d: "Hope conditions improve",
  },
  {
    prompt: "Long-term financial conversations with your partner and (age-appropriate) children happen:",
    a: "On a regular cadence with clear goals",
    b: "When something changes",
    c: "Rarely",
    d: "Almost never",
  },
  {
    prompt: "Physical security of the home (locks, awareness, basic preparedness) is:",
    a: "Actively managed and practiced",
    b: "Present but not reviewed",
    c: "Assumed",
    d: "Low priority",
  },
  {
    prompt: "You treat your own health and energy as:",
    a: "A non-negotiable asset that must be maintained for the family's sake",
    b: "Important when time allows",
    c: "Secondary to work and obligations",
    d: "Largely neglected",
  },
  {
    prompt: "Decision-making under stress in the home is characterized by:",
    a: "Calm ownership and clear direction",
    b: "Collaborative but sometimes slow",
    c: "Reactive or conflicted",
    d: "Avoidance",
  },
  {
    prompt: "Your children experience the home as:",
    a: "Ordered, predictable, and safe",
    b: "Mostly stable with occasional chaos",
    c: "Frequently stressed or unpredictable",
    d: "Largely managed by someone else",
  },
  {
    prompt: "Debt and lifestyle choices relative to income are:",
    a: "Deliberately conservative and reviewed",
    b: "Manageable",
    c: "Stretching",
    d: "Concerning",
  },
  {
    prompt: "When a genuine threat (financial, relational, or external) appears, you:",
    a: "Name it early, plan, and act",
    b: "Address it when forced",
    c: "Minimize it",
    d: "Freeze or deflect",
  },
  {
    prompt: "Provision for education, skills, and future opportunities is:",
    a: "Planned and partially funded or structured",
    b: "Aspirational",
    c: "Left to institutions",
    d: "Not yet considered",
  },
  {
    prompt: "Emotional climate of the household under your influence is:",
    a: "Steady and resilient",
    b: "Generally positive",
    c: "Volatile or tense",
    d: "Flat or withdrawn",
  },
  {
    prompt: "You have clear contingency thinking for job loss, illness, or major disruption:",
    a: "Yes, written or well-rehearsed",
    b: "Informal ideas",
    c: "Vague",
    d: "None",
  },
  {
    prompt: "How you model handling money and resources is:",
    a: "Transparent and instructional",
    b: "Private but responsible",
    c: "Inconsistent",
    d: "Problematic",
  },
  {
    prompt: "Protection from digital and cultural risks is handled by:",
    a: "Active boundaries, tools, and conversation",
    b: "Some limits",
    c: "Reactive measures",
    d: "Largely unaddressed",
  },
  {
    prompt: "Your work demands versus family presence balance is:",
    a: "Intentionally managed so neither collapses",
    b: "Work often wins",
    c: "Family often wins at the cost of provision",
    d: "Chronic imbalance",
  },
  {
    prompt: "When your partner is overwhelmed, you:",
    a: "Step in with practical leadership and presence",
    b: "Offer support when asked",
    c: "Stay focused on your lane",
    d: "Withdraw",
  },
  {
    prompt: "Household systems (bills, maintenance, logistics) run because:",
    a: "You own or clearly delegate and verify",
    b: "Shared effort",
    c: "Mostly one person carries it",
    d: "Things frequently slip",
  },
  {
    prompt: 'Your children\'s sense of "Dad has this" is:',
    a: "Strong and earned",
    b: "Present most of the time",
    c: "Inconsistent",
    d: "Weak",
  },
  {
    prompt: "Preparation for the years when children leave or major life stages shift is:",
    a: "Already in motion",
    b: "On the radar",
    c: "Distant",
    d: "Not considered",
  },
  {
    prompt: "You treat your word and follow-through as:",
    a: "Sacred to the stability of the home",
    b: "Important",
    c: "Flexible under pressure",
    d: "Frequently broken",
  },
  {
    prompt: "Risk tolerance in family decisions is:",
    a: "Calculated and communicated",
    b: "Moderate",
    c: "Impulsive or overly cautious",
    d: "Unexamined",
  },
  {
    prompt: "How you handle personal setbacks so they do not destabilize the family:",
    a: "Process privately or with trusted counsel, then lead",
    b: "Share appropriately",
    c: "Leak stress into the home",
    d: "Collapse or disappear",
  },
  {
    prompt: "Legacy assets (skills, networks, values, modest capital) you are transferring:",
    a: "Intentionally",
    b: "Informally",
    c: "Minimally",
    d: "Not yet",
  },
  {
    prompt: "The family's ability to weather a six-month disruption without panic is:",
    a: "High",
    b: "Moderate",
    c: "Low",
    d: "Unknown",
  },
  {
    prompt: 'You review and strengthen the "fortress" (finances, systems, relationships):',
    a: "On a set schedule",
    b: "When problems appear",
    c: "Rarely",
    d: "Almost never",
  },
  {
    prompt: "Physical presence and protection (being home, available, aware) is:",
    a: "Prioritized and protected",
    b: "Balanced against work",
    c: "Frequently sacrificed",
    d: "Secondary",
  },
  {
    prompt: "Teaching children to contribute to the household's strength looks like:",
    a: "Real responsibilities with real consequences",
    b: "Age-appropriate chores",
    c: "Minimal expectations",
    d: "Shielding them",
  },
  {
    prompt: 'Your internal standard for "enough security" is:',
    a: "Clear and rising with stages of life",
    b: "Roughly defined",
    c: "Moving target",
    d: "Undefined",
  },
  {
    prompt: "When external culture or systems pressure the family, you:",
    a: "Filter, decide, and hold the line",
    b: "Discuss and adapt",
    c: "Mostly comply",
    d: "Feel overwhelmed",
  },
  {
    prompt: "Overall posture toward the household's future is:",
    a: "Builder of durable strength",
    b: "Steady maintainer",
    c: "Hopeful provider",
    d: "Day-to-day survivor",
  },
];

export const familyFortressInstrument: AssessmentInstrument = buildChoiceSumInstrument({
  dimensionId: "fortress",
  dimensionLabel: "Fortress",
  items: QUESTIONS.map((question, index) => ({
    id: `fortress-${index + 1}`,
    prompt: question.prompt,
    choices: [
      { key: "A", label: question.a },
      { key: "B", label: question.b },
      { key: "C", label: question.c },
      { key: "D", label: question.d },
    ],
  })),
  bands: FAMILY_FORTRESS_BANDS.map((band) => ({ ...band })),
});

export const FAMILY_FORTRESS_DESCRIPTION =
  "A 30-question look at the security you have actually built for your household. Answer from current structures, not intentions.";
