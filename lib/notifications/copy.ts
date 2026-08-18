import type {
  NotificationCopy,
  NotificationLocale,
  NotificationPayload,
  NotificationType,
} from "@/lib/notifications/types";

const FORBIDDEN =
  /\b(rehab|recovery|treatment|therapy|service|deployment|unit|facility|behind|falling off)\b/i;
const PERSONAL = /\b(i|i'm|i’ve|i'd|me|my|mine|we|our)\b/i;

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[—–!]/g, "");
}

function catalogText(value: unknown, fallback: string) {
  const text = clean(typeof value === "string" ? value : "");
  if (!text || FORBIDDEN.test(text)) return fallback;
  return text;
}

export function actionSummaryFromCatalog(input: {
  keyline?: string | null;
  title?: string | null;
}) {
  return catalogText(input.keyline, catalogText(input.title, "this week's practice"));
}

export function leaderLabel(name: string | null | undefined) {
  const text = clean(name ?? "");
  return text && !FORBIDDEN.test(text) ? text : "your leader";
}

function encouragementLeader(name: string | null | undefined, locale: NotificationLocale) {
  const text = clean(name ?? "");
  if (text && !FORBIDDEN.test(text)) return text;
  return locale === "he" ? "המנהיג" : "your leader";
}

function encouragementCopy(payload: NotificationPayload, locale: NotificationLocale): NotificationCopy {
  const leader = encouragementLeader(payload.leaderName, locale);
  const training = catalogText(payload.trainingTitle, locale === "he" ? "ההכשרה" : "Your training");
  const minutes =
    typeof payload.minutes === "number" && Number.isFinite(payload.minutes) && payload.minutes > 0
      ? Math.ceil(payload.minutes)
      : null;
  const completed =
    typeof payload.completedCount === "number" && Number.isFinite(payload.completedCount)
      ? Math.max(0, Math.floor(payload.completedCount))
      : 0;
  const total =
    typeof payload.sessionCount === "number" && Number.isFinite(payload.sessionCount)
      ? Math.max(1, Math.floor(payload.sessionCount))
      : 1;
  const tier = payload.nudgeTier;

  if (locale === "he") {
    const title = `הערה מאת ${leader}`;
    if (tier === "A") {
      return {
        title,
        body: minutes
          ? `המפגש הראשון פתוח כשתהיה מוכן. הוא ${minutes} דקות.`
          : "המפגש הראשון פתוח כשתהיה מוכן.",
      };
    }
    if (tier === "B") {
      return {
        title,
        body: `אתה ב-${completed} מתוך ${total} ב־${training}. אפשר לחזור אליו כשיתאים.`,
      };
    }
    return {
      title,
      body: "עבר זמן. ההכשרה עדיין כאן כשתרצה.",
    };
  }

  const title = `A note from ${leader}`;
  if (tier === "A") {
    return {
      title,
      body: minutes
        ? `Your first session is open when you are ready. It is ${minutes} minutes.`
        : "Your first session is open when you are ready.",
    };
  }
  if (tier === "B") {
    return {
      title,
      body: `You are ${completed} of ${total} through ${training}. Pick it back up when you can.`,
    };
  }
  return {
    title,
    body: "It has been a while. Your training is still here whenever you want it.",
  };
}

export function notificationCopy(
  type: NotificationType,
  payload: NotificationPayload,
  locale: NotificationLocale = "en"
): NotificationCopy {
  const training = catalogText(payload.trainingTitle, locale === "he" ? "ההכשרה" : "Your training");
  const minutes =
    typeof payload.minutes === "number" && Number.isFinite(payload.minutes) && payload.minutes > 0
      ? Math.ceil(payload.minutes)
      : null;
  const sessions =
    typeof payload.sessionCount === "number" && Number.isFinite(payload.sessionCount)
      ? Math.max(1, Math.floor(payload.sessionCount))
      : null;
  const leader = leaderLabel(payload.leaderName);
  const summary = catalogText(payload.actionSummary, locale === "he" ? "התרגול" : "this week's practice");

  if (locale === "he") {
    if (type === "weekly_session") {
      return {
        title: "המפגש הבא מוכן",
        body: minutes
          ? `${training}. ${minutes} דק׳. זו התזכורת השבועית שלך.`
          : `${training}. זו התזכורת השבועית שלך.`,
      };
    }
    if (type === "action") {
      return {
        title: "דבר אחד לנסות",
        body: `אמרת שתעשה ${summary}. עדיין בתוקף?`,
      };
    }
    if (type === "new_assignment") {
      return {
        title: `הכשרה חדשה מאת ${leader}`,
        body: sessions ? `${training}. ${sessions} מפגשים.` : `${training}.`,
      };
    }
    if (type === "certificate") {
      return {
        title: `סיימת את ${training}`,
        body: "התעודה מוכנה.",
      };
    }
    if (type === "leader_encouragement" && payload.cohortNote) {
      return {
        title: `הערה מאת ${encouragementLeader(payload.leaderName, locale)}`,
        body: "היא בדף הבית. אפשר לסגור אותה.",
      };
    }
    if (type === "leader_encouragement" && payload.nudgeTier) {
      return encouragementCopy(payload, locale);
    }
    return {
      title: "הערה מהמנהיג",
      body: "יש מפגש שמחכה כשיהיו לך כמה דקות.",
    };
  }

  if (type === "weekly_session") {
    return {
      title: "Your next session is ready",
      body: minutes
        ? `${training}. ${minutes} min. This is your weekly reminder.`
        : `${training}. This is your weekly reminder.`,
    };
  }
  if (type === "action") {
    return {
      title: "One thing to try",
      body: `You said you would ${summary}. Still on for it?`,
    };
  }
  if (type === "new_assignment") {
    return {
      title: `New training from ${leader}`,
      body: sessions === 1 ? `${training}. 1 session.` : `${training}. ${sessions ?? 1} sessions.`,
    };
  }
  if (type === "certificate") {
    return {
      title: `You finished ${training}`,
      body: "Your certificate is ready.",
    };
  }
  if (type === "leader_encouragement" && payload.cohortNote) {
    return {
      title: `A note from ${encouragementLeader(payload.leaderName, locale)}`,
      body: "It is on Home. You can dismiss it.",
    };
  }
  if (type === "leader_encouragement" && payload.nudgeTier) {
    return encouragementCopy(payload, locale);
  }
  return {
    title: "A note from your leader",
    body: "There is a session waiting when you have a few minutes.",
  };
}

export function safePayload(raw: unknown): NotificationPayload {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const payload: NotificationPayload = {};
  if (typeof source.trainingTitle === "string") {
    payload.trainingTitle = clean(source.trainingTitle).slice(0, 200);
  }
  if (typeof source.actionSummary === "string") {
    const summary = catalogText(source.actionSummary, "this week's practice");
    payload.actionSummary = PERSONAL.test(summary) ? "this week's practice" : summary.slice(0, 120);
  }
  if (typeof source.leaderName === "string") {
    payload.leaderName = leaderLabel(source.leaderName).slice(0, 80);
  }
  if (typeof source.minutes === "number" && Number.isFinite(source.minutes)) {
    payload.minutes = Math.max(1, Math.ceil(source.minutes));
  }
  if (typeof source.sessionCount === "number" && Number.isFinite(source.sessionCount)) {
    payload.sessionCount = Math.max(1, Math.floor(source.sessionCount));
  }
  if (typeof source.completedCount === "number" && Number.isFinite(source.completedCount)) {
    payload.completedCount = Math.max(0, Math.floor(source.completedCount));
  }
  if (source.nudgeTier === "A" || source.nudgeTier === "B" || source.nudgeTier === "C") {
    payload.nudgeTier = source.nudgeTier;
  }
  if (source.cohortNote === true) {
    payload.cohortNote = true;
  }
  for (const key of ["sessionId", "trainingId", "certificateId"] as const) {
    if (typeof source[key] === "string" && source[key].trim()) {
      payload[key] = source[key].trim();
    }
  }
  return payload;
}
