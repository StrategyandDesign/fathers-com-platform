import {
  buildChoiceSumInstrument,
  type AssessmentInstrument,
} from "@/lib/assessments/instrument";

export const LEGACY_ARCHITECT_ASSESSMENT_KEY = "legacy-architect";
export const LEGACY_ARCHITECT_SLUG = "legacy-architect";
export const LEGACY_ARCHITECT_TITLE = "The Legacy Architect Keystone Assessment";
export const LEGACY_ARCHITECT_QUESTION_COUNT = 30;

export const LEGACY_ARCHITECT_COPY = {
  introduction:
    "The Legacy Architect Keystone Assessment is a 30-question look at how you are actually fathering right now. Not the man you intend to be. The man your children are meeting this week.",
  purpose:
    "To give you a clear picture of the architecture you are handing the next generation: the standards you hold, the skills you transfer, the hard conversations you lead, and the emotional connection that makes your children seek you later, not only need you now.",
  goal: "To name where you stand today so you can make the next high-leverage move with precision. This is a designation, not a verdict.",
  honestHint: "Answer honestly from current behavior, not from the father you plan to become.",
};

export const LEGACY_ARCHITECT_BANDS = [
  {
    min: 105,
    max: 120,
    label: "Keystone Architect",
    description:
      "You are deliberately constructing the next generation. Your children are receiving clear standards, real skills, and the message that they are capable. Continue refining the transfer of knowledge and keep the emotional connection strong so they seek you later, not just need you now.",
  },
  {
    min: 85,
    max: 104,
    label: "Cornerstone Builder",
    description:
      "Strong foundation with clear gaps. You already do many of the high-leverage actions. Focus on consistency of enforcement, deliberate skill transfer, and more frequent hard conversations. Small upgrades here compound for decades.",
  },
  {
    min: 65,
    max: 84,
    label: "Foundation Layer",
    description:
      "Intent is present; systems and consistency are not yet reliable. Prioritize three non-negotiables (one boundary, one skill, one value conversation) and track them weekly. The shift from reactive to intentional is the highest-return move.",
  },
  {
    min: 30,
    max: 64,
    label: "Blueprint Stage",
    description:
      "The architecture is still mostly on paper. Begin with radical honesty about current patterns, then install one clear standard and one weekly teaching rhythm. Every father starts somewhere; the men who finish strong treat the gap as information, not indictment.",
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
    prompt: "When your child fails at something important, your first response is usually:",
    a: "Sit with them, examine what went wrong, and extract the lesson together",
    b: "Offer encouragement and then move on",
    c: "Soften the blow and change the subject",
    d: "Express frustration or step away",
  },
  {
    prompt:
      "How often do you deliberately teach a practical life skill (budgeting, basic repairs, time management, negotiation) that has nothing to do with school?",
    a: "Regularly and systematically",
    b: "When the opportunity naturally arises",
    c: "Rarely, assuming school or life will handle it",
    d: "Almost never",
  },
  {
    prompt: "When setting a boundary, you:",
    a: "State it clearly, enforce it consistently, and explain the why afterward",
    b: "State it and mostly follow through",
    c: "State it but often negotiate or let it slide",
    d: "Avoid firm boundaries to keep peace",
  },
  {
    prompt: "Your children know your non-negotiable standards for honesty, work ethic, and respect because:",
    a: "You have stated them explicitly and live them visibly",
    b: "They sense them from how you act",
    c: "They mostly hear them from their mother or others",
    d: "The standards are more flexible than fixed",
  },
  {
    prompt: "How do you prepare your children for the reality that you will not always be there?",
    a: "Intentionally transfer knowledge, contacts, and decision frameworks",
    b: "Talk about it occasionally in general terms",
    c: "Prefer not to discuss it yet",
    d: "Avoid the topic",
  },
  {
    prompt: "When conflict arises between siblings or peers, you typically:",
    a: "Coach them through resolution while holding them accountable",
    b: "Mediate and decide the outcome",
    c: "Separate them and move on",
    d: "Let it burn out on its own",
  },
  {
    prompt: "Your approach to screen time and digital life is:",
    a: "Clear rules, device-free zones, and active discussion of content and effects",
    b: "Some limits that are enforced most of the time",
    c: "Limits that are frequently negotiated away",
    d: "Largely left to the child or partner",
  },
  {
    prompt: "How often do you share a real failure or hard lesson from your own life (not just success stories)?",
    a: "Regularly, with the specific lesson attached",
    b: "Occasionally",
    c: "Rarely",
    d: "Almost never. Prefer to keep the image strong.",
  },
  {
    prompt: "When your child wants something expensive or status-driven, you:",
    a: "Use it as a teaching moment on value, delayed gratification, and trade-offs",
    b: "Say yes or no based on budget",
    c: "Often give in to avoid conflict",
    d: "Default to yes if possible",
  },
  {
    prompt: "You actively develop your children’s ability to:",
    a: "Handle discomfort, speak clearly, and solve problems without immediate rescue",
    b: "Be polite and cooperative",
    c: "Stay happy and conflict-free",
    d: "Fit in and avoid standing out",
  },
  {
    prompt: "Family decisions that affect the children are handled by:",
    a: "You leading after genuine input, then owning the call",
    b: "Joint discussion that often ends in compromise",
    c: "Mostly following the more assertive voice",
    d: "Avoiding hard calls",
  },
  {
    prompt: "How deliberately do you expose your children to work, responsibility, and the cost of things?",
    a: "Systematically. Chores with real consequences, money conversations, and real tasks.",
    b: "Some chores and occasional talks",
    c: "Minimal real responsibility",
    d: "Prefer to shield them from pressure",
  },
  {
    prompt: "When your child is treated unfairly or faces real adversity, your stance is:",
    a: "Acknowledge the reality, coach response, and refuse to play victim with them",
    b: "Comfort and then help fix it",
    c: "Primarily protect and remove the obstacle",
    d: "Downplay or distract",
  },
  {
    prompt: "Your children can accurately describe what you stand for because:",
    a: "You have stated core principles and they see the consistency",
    b: "They can mostly infer",
    c: "It is still forming",
    d: "It shifts with mood or situation",
  },
  {
    prompt: "How do you handle your own anger or frustration in front of them?",
    a: "You model controlled strength and later process it if needed",
    b: "You try to hide it",
    c: "It sometimes leaks out",
    d: "It frequently sets the tone",
  },
  {
    prompt: "Preparing them for adult relationships and commitment looks like:",
    a: "Clear conversations about character, loyalty, and choosing well",
    b: "Occasional advice when asked",
    c: "Leaving it mostly to experience or the other parent",
    d: "Avoiding the topic",
  },
  {
    prompt: "When they achieve something, you emphasize:",
    a: "The process, effort, and character displayed",
    b: "The result and your pride",
    c: "External praise and rewards",
    d: "Moving quickly to the next goal",
  },
  {
    prompt: "Your long-term vision for them includes:",
    a: "Specific capabilities, character traits, and independence milestones",
    b: "General hopes for happiness and success",
    c: "Mostly academic or career outcomes",
    d: "Not clearly defined",
  },
  {
    prompt: "How often do you require them to finish hard or boring tasks without rescue?",
    a: "Routinely",
    b: "Sometimes",
    c: "Rarely",
    d: "Almost never",
  },
  {
    prompt: "Teaching respect for legitimate authority is:",
    a: "Explicit and modeled",
    b: "Expected but not deeply discussed",
    c: "Inconsistent",
    d: "Low priority",
  },
  {
    prompt: "You review and adjust your fathering approach:",
    a: "Periodically with honest self-assessment",
    b: "When something goes wrong",
    c: "Rarely",
    d: "Not systematically",
  },
  {
    prompt: "When they ask “why” about a rule or value, you:",
    a: "Give a real, age-appropriate reason and hold the line",
    b: "Give a short answer",
    c: "Default to “because I said so”",
    d: "Often reverse the rule",
  },
  {
    prompt: "Building physical and mental toughness looks like:",
    a: "Progressive challenges, outdoor time, delayed gratification, and recovery",
    b: "Some sports or activity",
    c: "Mostly comfort and entertainment",
    d: "Avoiding anything that feels hard",
  },
  {
    prompt: "Your children know they are deeply loved and that love has standards because:",
    a: "Both are demonstrated consistently",
    b: "Love is clear; standards are softer",
    c: "Standards are clear; warmth is inconsistent",
    d: "Neither is reliably clear",
  },
  {
    prompt: "Preparing them financially includes:",
    a: "Teaching earning, saving, giving, and the difference between assets and liabilities",
    b: "Allowance and basic talks",
    c: "Providing without much teaching",
    d: "Avoiding money conversations",
  },
  {
    prompt: "When culture or peers push a destructive idea, you:",
    a: "Name it, explain the cost, and equip them to stand",
    b: "Express disagreement",
    c: "Hope it passes",
    d: "Stay quiet to avoid conflict",
  },
  {
    prompt: "Your modeling of integrity under pressure is:",
    a: "Visible and discussed",
    b: "Present but unspoken",
    c: "Inconsistent",
    d: "Rarely tested in front of them",
  },
  {
    prompt: "How often do you create structured opportunities for them to lead or take real responsibility?",
    a: "Regularly",
    b: "Occasionally",
    c: "Rarely",
    d: "Almost never",
  },
  {
    prompt: "The legacy you are actively building is:",
    a: "Defined in character, capability, and family culture",
    b: "Mostly financial or educational",
    c: "Still vague",
    d: "Not a conscious focus",
  },
  {
    prompt: "Looking at the next five years, your primary fathering posture is:",
    a: "Architect. Deliberate construction of independent strength.",
    b: "Supportive presence",
    c: "Provider and problem-solver",
    d: "Mostly reactive",
  },
];

export const legacyArchitectInstrument: AssessmentInstrument = buildChoiceSumInstrument({
  dimensionId: "legacy",
  dimensionLabel: "Legacy",
  items: QUESTIONS.map((question, index) => ({
    id: `legacy-${index + 1}`,
    prompt: question.prompt,
    choices: [
      { key: "A", label: question.a },
      { key: "B", label: question.b },
      { key: "C", label: question.c },
      { key: "D", label: question.d },
    ],
  })),
  bands: LEGACY_ARCHITECT_BANDS.map((band) => ({ ...band })),
});

export const LEGACY_ARCHITECT_DESCRIPTION =
  "A 30-question look at the architecture you are handing the next generation. Answer from current behavior, not intentions.";
