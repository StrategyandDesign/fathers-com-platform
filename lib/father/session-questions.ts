import type { Session, Training } from "@/lib/father/types";

export const CHECKIN_ANSWER_KEYS = ["q1", "q2", "q3"] as const;

export type CheckinAnswerKey = (typeof CHECKIN_ANSWER_KEYS)[number];

export type CheckinQuestion = {
  key: CheckinAnswerKey;
  label: string;
};

type SessionSkillPack = {
  checkin: [string, string, string];
  action: string;
};

type SessionLookup = Pick<Session, "session_number" | "title">;
type TrainingLookup = Pick<Training, "slug"> | null | undefined;

const ACTION_NOTE_HINT =
  "Optional: note the correct teaching point in your own words (do not include personal details).";

export const ACTION_NOTE_LABEL = ACTION_NOTE_HINT;
export const ACTION_NOTE_PLACEHOLDER =
  "Teaching point only — no personal details.";
export const ACTION_ANSWER_KEY = "action_answer";

export type SkillChoice = {
  value: string;
  label: string;
};

export type ParsedSkillPrompt = {
  stem: string;
  choices: SkillChoice[] | null;
};

export function parseSkillPrompt(text: string): ParsedSkillPrompt {
  const marker = /(?:^|\s)([A-D])\)\s+/g;
  const hits: Array<{ letter: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = marker.exec(text))) {
    const leadingSpace = match[0].startsWith(" ") ? 1 : 0;
    hits.push({ letter: match[1], index: match.index + leadingSpace });
  }
  if (hits.length < 2) {
    return { stem: text, choices: null };
  }

  const stem = text.slice(0, hits[0].index).trim();
  const choices = hits.map((hit, index) => {
    const start = hit.index + hit.letter.length + 2;
    const end = hits[index + 1]?.index ?? text.length;
    return {
      value: hit.letter,
      label: text.slice(start, end).trim(),
    };
  });

  return {
    stem: stem || "Choose the correct teaching point.",
    choices,
  };
}

export function choiceIsSelected(saved: string | undefined, choice: SkillChoice) {
  if (!saved) return false;
  const value = saved.trim();
  return (
    value === choice.value ||
    value.startsWith(`${choice.value})`) ||
    value === choice.label
  );
}

function pack(
  q1: string,
  q2: string,
  q3: string,
  action: string
): SessionSkillPack {
  return { checkin: [q1, q2, q3], action };
}

/** Fathering Fundamentals — keyed by session_number 1–9. */
const FUNDAMENTALS_BY_NUMBER: Record<number, SessionSkillPack> = {
  1: pack(
    "In this training, what is the required sequence of each session? A) Action, then Film, then Check-in  B) Film, then Check-in, then Action  C) Check-in only, with no film",
    "In this curriculum, what is a “secret”?",
    "Name the seven skill areas taught after this overview, in any order.",
    "Which of these correctly describes Check-in in this training? A) A place to record private feelings  B) A skill check on what the film taught  C) A weekly assignment about a father’s own children"
  ),
  2: pack(
    "According to this session, what is commitment? A) A feeling that appears when a child is easy to like  B) A decision to be present physically, emotionally, and spiritually  C) Providing money so presence is optional",
    "Name the three dimensions of presence taught in this session.",
    "What is the difference between commitment and convenience as taught in this session?",
    "Which of these is an example of communicating commitment as taught in this session? A) Being in the room while remaining unavailable  B) Keeping presence in all three dimensions, including when it is inconvenient  C) Replacing regular presence with a single large gesture"
  ),
  3: pack(
    "What is the difference between observation and assumption when learning a child, as taught in this session?",
    "Name two things a father studies as a skill in this session (for example, interests or temperament).",
    "Which question is a skillful way to learn a child, according to this session? A) A question that tests whether the child matches the father’s preferences  B) A question that gathers the child’s interests or temperament from the child’s own world  C) A question that assumes the answer before the child speaks",
    "Which of these is an example of knowing a child as taught in this session? A) Assuming interests from the father’s own hobbies  B) Observing temperament and asking questions that gather facts about the child’s world  C) Waiting until adolescence to begin learning the child"
  ),
  4: pack(
    "According to this session, how is consistency different from intensity?",
    "Why does this session treat a routine as a reliability skill?",
    "Which of these is a reliability signal as taught in this session? A) Unpredictable high-intensity appearances  B) A kept, repeated pattern a child can count on  C) Frequent last-minute cancellations with no named replacement time",
    "Which of these is an example of showing up consistently as taught in this session? A) A rare, intense visit with no predictable pattern  B) A kept routine that signals reliability over time  C) Changing the plan without naming a new time"
  ),
  5: pack(
    "According to this session, how is protection different from provision?",
    "Name one form of safety this session treats as a protection skill.",
    "Which of these does this session include as provision, in addition to material support? A) Time and attention  B) Gifts only  C) Distance so the child learns independence",
    "Which of these is an example of protecting and providing as taught in this session? A) Treating provision as money alone and ignoring safety  B) Practicing safety and the provision of time/attention as distinct, complementary skills  C) Equating protection with control and provision with gifts only"
  ),
  6: pack(
    "What is the difference between specific praise and vague praise as taught in this session?",
    "According to this session, what does encouragement add that praise alone does not?",
    "Which statement is specific praise as taught in this session? A) “Good job.”  B) “I noticed you finished the task you started.”  C) “You are the best at everything.”",
    "Which of these is an example of affirming and encouraging as taught in this session? A) Vague praise with no named behavior  B) Naming a specific action and encouraging the next competent step  C) Praising only outcomes and ignoring effort or character"
  ),
  7: pack(
    "According to this session, how is discipline different from punishment?",
    "Why does this session treat staying calm as part of the discipline skill?",
    "Which sequence matches calm correction as taught in this session? A) React in anger, impose pain, withdraw  B) Pause until calm, name the behavior, state the standard, restore the relationship  C) Ignore the behavior so conflict never occurs",
    "Which of these is an example of disciplining with love as taught in this session? A) Punishing to vent anger  B) Correcting the behavior while calm, naming the standard, and restoring the relationship  C) Ignoring the behavior to avoid conflict"
  ),
  8: pack(
    "According to this session, what does modeled behavior teach that lectures alone do not?",
    "How does this session define integrity?",
    "Which of these is integrity as taught in this session? A) Teaching a value while regularly violating it  B) Consistency of word and action  C) Asking a child to keep a standard the father does not practice",
    "Which of these is an example of modeling integrity and faith as taught in this session? A) Stating a conviction while practicing the opposite  B) Living the conviction so the modeled pattern is the lesson  C) Delegating character formation to words only"
  ),
  9: pack(
    "List the seven skills taught in this course, in order.",
    "State the key distinction taught in any two of those skills (for example, commitment vs convenience).",
    "Which pairing is correct? A) Consistency = reliability over time; knowing a child = observation rather than assumption  B) Commitment = convenience; discipline = punishment  C) Affirmation = vague praise; provision = gifts only",
    "Which statement correctly synthesizes this course? A) The seven secrets are private feelings to journal  B) The seven secrets are distinct, teachable fathering skills that work together  C) Only one secret is needed if the others are skipped"
  ),
};

const FUNDAMENTALS_BY_SLUG: Record<string, number> = {
  "training-overview": 1,
  introduction: 1,
  "first-secret-commitment": 2,
  commitment: 2,
  "second-secret-knowing-your-child": 3,
  "knowing-your-child": 3,
  "third-secret-showing-up-consistently": 4,
  "showing-up-consistently": 4,
  "fourth-secret-protecting-and-providing": 5,
  "fourth-secret-protecting-and-providing-security": 5,
  "protecting-and-providing": 5,
  "protecting-and-providing-security": 5,
  "fifth-secret-affirming-and-encouraging": 6,
  "affirming-and-encouraging": 6,
  "sixth-secret-disciplining-with-love": 7,
  "disciplining-with-love": 7,
  "seventh-secret-modeling-integrity-and-faith": 8,
  "modeling-integrity-and-faith": 8,
  "bonus-eighth-secret": 9,
  "bonus-secret": 9,
  "bonus-secret-honoring-the-father-who-is-guiding-you": 9,
};

const FALLBACK = pack(
  "Name the primary skill this session teaches.",
  "State one concrete behavior this session identifies as effective.",
  "What distinction does this session draw between the skill and a common substitute?",
  "Which behavior from this session is an example of the skill taught? Name the correct teaching point in the optional note (do not include personal details)."
);

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function numberFromTitle(title: string): number | null {
  const slug = slugifyTitle(title);
  if (FUNDAMENTALS_BY_SLUG[slug]) {
    return FUNDAMENTALS_BY_SLUG[slug];
  }

  const aliases: Array<[RegExp, number]> = [
    [/training\s+overview|introduction/i, 1],
    [/first\s+secret|secret:\s*commitment/i, 2],
    [/second\s+secret|knowing\s+your\s+child/i, 3],
    [/third\s+secret|showing\s+up\s+consistently/i, 4],
    [/fourth\s+secret|protecting\s+and\s+providing/i, 5],
    [/fifth\s+secret|affirming\s+and\s+encouraging/i, 6],
    [/sixth\s+secret|disciplining\s+with\s+love/i, 7],
    [/seventh\s+secret|modeling\s+integrity/i, 8],
    [/bonus|eighth\s+secret/i, 9],
  ];

  for (const [pattern, number] of aliases) {
    if (pattern.test(title)) {
      return number;
    }
  }

  return null;
}

function resolveFundamentalsNumber(
  session: SessionLookup,
  training?: TrainingLookup
): number | null {
  if (training?.slug === "fundamentals") {
    if (session.session_number >= 1 && session.session_number <= 9) {
      return session.session_number;
    }
  }

  const fromTitle = numberFromTitle(session.title);
  if (fromTitle) {
    return fromTitle;
  }

  return null;
}

function skillPack(
  session: SessionLookup,
  training?: TrainingLookup
): SessionSkillPack {
  const number = resolveFundamentalsNumber(session, training);
  if (number && FUNDAMENTALS_BY_NUMBER[number]) {
    return FUNDAMENTALS_BY_NUMBER[number];
  }
  return FALLBACK;
}

export function checkinQuestionsFor(
  session: SessionLookup,
  training?: TrainingLookup
): CheckinQuestion[] {
  const [q1, q2, q3] = skillPack(session, training).checkin;
  return [
    { key: "q1", label: q1 },
    { key: "q2", label: q2 },
    { key: "q3", label: q3 },
  ];
}

export function sessionAction(
  session: SessionLookup,
  training?: TrainingLookup
) {
  return skillPack(session, training).action;
}
