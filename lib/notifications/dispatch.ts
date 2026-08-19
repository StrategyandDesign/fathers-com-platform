import "server-only";

import { getAppUrl, isEmailConfigured, renderTransactionalEmail, sendEmail } from "@/lib/email/send";
import { type Session, type SessionProgress, type Training } from "@/lib/father/types";
import { filmRuntimeMinutes } from "@/lib/trainings/runtime";
import { pickChannel } from "@/lib/notifications/channel";
import { notificationCopy, safePayload } from "@/lib/notifications/copy";
import { normalizeDeepLink, sessionFilmHref } from "@/lib/notifications/links";
import { weeklySessionTarget } from "@/lib/notifications/next-session";
import { parseNotificationPrefsRow } from "@/lib/notifications/prefs";
import { sendWebPush, type PushSubscriptionRecord } from "@/lib/notifications/push";
import { isLocale } from "@/lib/i18n/config";
import {
  FREQUENCY_WINDOW_DAYS,
  isInQuietHours,
  isWeeklyDue,
  nextQuietEnd,
  pickWithinCeiling,
  weeklyDedupeKey,
  weeklySlotKey,
} from "@/lib/notifications/schedule";
import {
  prefEnabled,
  type NotificationChannel,
  type NotificationPrefsRow,
  type NotificationType,
  type ReminderCandidate,
} from "@/lib/notifications/types";
import { parseParticipationMode, type ParticipationMode } from "@/lib/participation";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

type OutboxRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  dedupe_key: string;
  href: string;
  payload: unknown;
  available_at: string;
};

type DeliveryRow = {
  user_id: string;
  dedupe_key: string;
  status: string;
  created_at: string;
};

type DispatchCandidate = ReminderCandidate & { outboxId?: string };

const HANDLED_STATUSES = new Set(["sent", "skipped_pref", "skipped_channel", "failed"]);

function outboxIdOf(candidate: DispatchCandidate) {
  return typeof candidate.outboxId === "string" ? candidate.outboxId : null;
}

function asTraining(row: Training) {
  return row;
}

export async function dispatchDueReminders(now = new Date()) {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false as const, reason: "missing_service_role" };
  }

  const [prefsRes, reminderRes, assignmentRes, trainingsRes, sessionsRes, progressRes, outboxRes, deliveryRes, pushRes, profileRes, commitmentRes] =
    await Promise.all([
      admin.from("notification_preferences").select("*"),
      admin.from("reminder_preferences").select("father_id, weekday, remind_at"),
      admin.from("training_assignments").select("father_id, training_id, assigned_at"),
      admin.from("trainings").select("*"),
      admin.from("sessions").select("*"),
      admin.from("session_progress").select("*"),
      admin
        .from("notification_outbox")
        .select("id, user_id, type, dedupe_key, href, payload, available_at")
        .is("processed_at", null)
        .is("canceled_at", null)
        .lte("available_at", now.toISOString()),
      admin
        .from("notification_deliveries")
        .select("user_id, dedupe_key, status, created_at")
        .gte(
          "created_at",
          new Date(now.getTime() - FREQUENCY_WINDOW_DAYS * 86_400_000).toISOString()
        ),
      admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth"),
      admin.from("profiles").select("id, locale").eq("role", "father"),
      admin.from("action_commitments").select("user_id, session_id, completed_at, closed_at"),
    ]);

  for (const result of [prefsRes, reminderRes, assignmentRes, trainingsRes, sessionsRes, progressRes, outboxRes, deliveryRes, pushRes, profileRes, commitmentRes]) {
    if (result.error) throw result.error;
  }

  const reminders = new Map(
    ((reminderRes.data ?? []) as Array<{ father_id: string; weekday: number; remind_at: string }>).map(
      (row) => [row.father_id, row]
    )
  );
  const localeByUser = new Map(
    ((profileRes.data ?? []) as Array<{ id: string; locale: string | null }>).map((row) => [row.id, row.locale])
  );
  const prefsByUser = new Map<string, NotificationPrefsRow>();
  for (const row of prefsRes.data ?? []) {
    const parsed = parseNotificationPrefsRow(row, reminders.get((row as { user_id: string }).user_id) ?? null);
    const locale = localeByUser.get(parsed.userId);
    if (isLocale(locale)) parsed.locale = locale;
    if (parsed.userId) prefsByUser.set(parsed.userId, parsed);
  }
  for (const [fatherId, reminder] of reminders) {
    if (!prefsByUser.has(fatherId)) {
      const parsed = parseNotificationPrefsRow(
        { user_id: fatherId },
        { weekday: reminder.weekday, remindAt: reminder.remind_at }
      );
      const locale = localeByUser.get(fatherId);
      if (isLocale(locale)) parsed.locale = locale;
      prefsByUser.set(fatherId, parsed);
    }
  }

  const trainings = ((trainingsRes.data ?? []) as Training[]).map(asTraining);
  const sessions = (sessionsRes.data ?? []) as Session[];
  const progress = (progressRes.data ?? []) as SessionProgress[];
  const assignments = (assignmentRes.data ?? []) as Array<{
    father_id: string;
    training_id: string;
    assigned_at: string | null;
  }>;
  const trainingById = new Map(trainings.map((training) => [training.id, training]));
  const progressByFather = groupBy(progress, (row) => row.father_id);
  const assignmentsByFather = groupBy(assignments, (row) => row.father_id);
  const deliveries = (deliveryRes.data ?? []) as DeliveryRow[];
  const handledKeys = new Set(
    deliveries.filter((row) => HANDLED_STATUSES.has(row.status)).map((row) => row.dedupe_key)
  );
  const sentCounts = new Map<string, number>();
  for (const row of deliveries) {
    if (row.status !== "sent") continue;
    sentCounts.set(row.user_id, (sentCounts.get(row.user_id) ?? 0) + 1);
  }
  const pushByUser = groupBy(
    (pushRes.data ?? []) as Array<PushSubscriptionRecord & { user_id: string }>,
    (row) => row.user_id
  );

  const fatherIds = [
    ...new Set([
      ...assignments.map((row) => row.father_id),
      ...((outboxRes.data ?? []) as OutboxRow[]).map((row) => row.user_id),
    ]),
  ];
  const participationByFather = await loadParticipationByFather(admin, fatherIds);

  const weekly = buildWeeklyCandidates({
    now,
    prefsByUser,
    assignmentsByFather,
    trainings,
    trainingById,
    sessions,
    progressByFather,
    handledKeys,
  });

  const openActionKeys = new Set(
    ((commitmentRes.data ?? []) as Array<{
      user_id: string;
      session_id: string;
      completed_at: string | null;
      closed_at: string | null;
    }>)
      .filter((row) => !row.completed_at && !row.closed_at)
      .map((row) => `action:${row.user_id}:${row.session_id}`)
  );

  const outbox = ((outboxRes.data ?? []) as OutboxRow[])
    .filter((row) => !handledKeys.has(row.dedupe_key))
    .filter((row) => row.type !== "action" || openActionKeys.has(row.dedupe_key))
    .map((row) => ({
      userId: row.user_id,
      type: row.type,
      dedupeKey: row.dedupe_key,
      href: normalizeDeepLink(row.href),
      payload: safePayload(row.payload),
      availableAt: row.available_at,
      outboxId: row.id,
    }));

  const byUser = groupBy([...weekly, ...outbox], (row) => row.userId);
  const appUrl = getAppUrl();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, candidates] of byUser) {
    const prefs = prefsByUser.get(userId) ?? parseNotificationPrefsRow({ user_id: userId });
    const allowed: Array<(typeof candidates)[number] & { href: string }> = [];
    for (const candidate of candidates) {
      if (!prefEnabled(prefs, candidate.type)) {
        await writeDelivery(admin, {
          userId,
          type: candidate.type,
          channel: "email",
          status: "skipped_pref",
          dedupeKey: candidate.dedupeKey,
          href: candidate.href,
        });
        await markOutbox(admin, outboxIdOf(candidate), true);
        skipped += 1;
        continue;
      }
      if (isInQuietHours(now, prefs.timezone, prefs.quietHoursStart, prefs.quietHoursEnd)) {
        const outboxId = outboxIdOf(candidate);
        if (outboxId) {
          const next = nextQuietEnd(now, prefs.timezone, prefs.quietHoursEnd);
          await admin
            .from("notification_outbox")
            .update({ available_at: next.toISOString() })
            .eq("id", outboxId);
        }
        skipped += 1;
        continue;
      }
      allowed.push(candidate);
    }

    const chosen = pickWithinCeiling(allowed, sentCounts.get(userId) ?? 0);
    skipped += allowed.length - chosen.length;

    const email = await loadEmail(admin, userId);
    const subscriptions = pushByUser.get(userId) ?? [];

    for (const candidate of chosen) {
      const copy = notificationCopy(
        candidate.type,
        {
          ...candidate.payload,
          participationMode:
            candidate.payload.participationMode ?? participationByFather.get(userId) ?? "unset",
        },
        prefs.locale
      );
      const href = normalizeDeepLink(candidate.href);
      const result = await deliverOne({
        prefs,
        email,
        subscriptions,
        title: copy.title,
        body: copy.body,
        href,
        appUrl,
        locale: prefs.locale,
      });

      await writeDelivery(admin, {
        userId,
        type: candidate.type,
        channel: result.channel ?? "email",
        status: result.status,
        dedupeKey: candidate.dedupeKey,
        href,
        title: copy.title,
        body: copy.body,
      });

      if (result.goneEndpoints?.length) {
        await admin.from("push_subscriptions").delete().in("endpoint", result.goneEndpoints);
      }

      const terminal = result.status === "sent" || result.status === "failed" || result.status === "skipped_channel";
      await markOutbox(admin, outboxIdOf(candidate), terminal);
      if (result.status === "sent") {
        sent += 1;
        sentCounts.set(userId, (sentCounts.get(userId) ?? 0) + 1);
      } else if (result.status === "failed") {
        failed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return { ok: true as const, sent, skipped, failed };
}

function buildWeeklyCandidates(input: {
  now: Date;
  prefsByUser: Map<string, NotificationPrefsRow>;
  assignmentsByFather: Map<string, Array<{ father_id: string; training_id: string; assigned_at: string | null }>>;
  trainings: Training[];
  trainingById: Map<string, Training>;
  sessions: Session[];
  progressByFather: Map<string, SessionProgress[]>;
  handledKeys: Set<string>;
}): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = [];
  for (const [userId, prefs] of input.prefsByUser) {
    if (!prefs.sessionReminders || prefs.reminderDay == null || !prefs.reminderTime) continue;
    if (!isWeeklyDue({ at: input.now, timeZone: prefs.timezone, weekday: prefs.reminderDay, remindAt: prefs.reminderTime })) {
      continue;
    }
    const assigned = (input.assignmentsByFather.get(userId) ?? [])
      .map((row) => {
        const training = input.trainingById.get(row.training_id);
        if (!training) return null;
        return { training, assignedAt: Date.parse(row.assigned_at ?? "") || 0 };
      })
      .filter((row): row is { training: Training; assignedAt: number } => Boolean(row));
    const target = weeklySessionTarget({
      assigned,
      allTrainings: input.trainings,
      sessions: input.sessions,
      progress: input.progressByFather.get(userId) ?? [],
    });
    if (!target) continue;
    const slotKey = weeklySlotKey({
      at: input.now,
      timeZone: prefs.timezone,
      weekday: prefs.reminderDay,
      remindAt: prefs.reminderTime,
    });
    if (!slotKey) continue;
    const dedupeKey = weeklyDedupeKey(userId, target.session.id, slotKey);
    if (input.handledKeys.has(dedupeKey)) continue;
    candidates.push({
      userId,
      type: "weekly_session",
      dedupeKey,
      href: sessionFilmHref(target.session.id),
      payload: {
        trainingTitle: target.training.title,
        minutes: filmRuntimeMinutes(target.session.duration_seconds),
        sessionId: target.session.id,
        trainingId: target.training.id,
      },
      availableAt: input.now.toISOString(),
    });
  }
  return candidates;
}

async function deliverOne(input: {
  prefs: NotificationPrefsRow;
  email: string | null;
  subscriptions: PushSubscriptionRecord[];
  title: string;
  body: string;
  href: string;
  appUrl: string;
  locale: NotificationPrefsRow["locale"];
}): Promise<{
  status: "sent" | "failed" | "skipped_channel";
  channel: NotificationChannel | null;
  goneEndpoints?: string[];
}> {
  const channel = pickChannel({
    prefs: input.prefs,
    hasPushSubscription: input.subscriptions.length > 0,
  });
  if (!channel) return { status: "skipped_channel", channel: null };
  const url = `${input.appUrl}${input.href}`;

  if (channel === "push") {
    const gone: string[] = [];
    for (const subscription of input.subscriptions) {
      const result = await sendWebPush(subscription, {
        title: input.title,
        body: input.body,
        url,
      });
      if (result.sent) return { status: "sent", channel: "push" };
      if (result.reason === "gone") gone.push(subscription.endpoint);
    }
    if (input.prefs.emailEnabled && input.email && isEmailConfigured()) {
      const emailed = await sendNotificationEmail(
        input.email,
        input.title,
        input.body,
        url,
        input.locale
      );
      if (emailed) return { status: "sent", channel: "email", goneEndpoints: gone };
    }
    if (!input.prefs.emailEnabled || !input.email || !isEmailConfigured()) {
      return { status: "skipped_channel", channel: "push", goneEndpoints: gone };
    }
    return { status: "failed", channel: "push", goneEndpoints: gone };
  }

  if (!input.email) return { status: "failed", channel: "email" };
  if (!isEmailConfigured()) return { status: "skipped_channel", channel: "email" };
  const emailed = await sendNotificationEmail(
    input.email,
    input.title,
    input.body,
    url,
    input.locale
  );
  return { status: emailed ? "sent" : "failed", channel: "email" };
}

async function sendNotificationEmail(
  to: string,
  title: string,
  body: string,
  href: string,
  locale: NotificationPrefsRow["locale"]
) {
  const rendered = renderTransactionalEmail({
    title,
    body,
    ctaLabel: locale === "he" ? "פתיחה" : "Open",
    ctaHref: href,
    locale,
  });
  const result = await sendEmail({
    to,
    subject: title,
    html: rendered.html,
    text: rendered.text,
  });
  return result.sent;
}

async function writeDelivery(
  admin: AdminClient,
  row: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    status: string;
    dedupeKey: string;
    href: string;
    title?: string;
    body?: string;
  }
) {
  const { error } = await admin.from("notification_deliveries").insert({
    user_id: row.userId,
    type: row.type,
    channel: row.channel,
    status: row.status,
    dedupe_key: row.dedupeKey,
    href: row.href,
    title: row.title ?? null,
    body: row.body ?? null,
  });
  if (error) console.error("[notifications] delivery log failed", error.message);
}

async function markOutbox(admin: AdminClient, outboxId: string | null | undefined, processed: boolean) {
  if (!outboxId || !processed) return;
  const { error } = await admin
    .from("notification_outbox")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", outboxId);
  if (error) console.error("[notifications] outbox update failed", error.message);
}

async function loadEmail(admin: AdminClient, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function loadParticipationByFather(admin: AdminClient, fatherIds: string[]) {
  const modes = new Map<string, ParticipationMode>();
  const ids = [...new Set(fatherIds.filter(Boolean))];
  if (ids.length === 0) return modes;
  const { data, error } = await admin
    .from("group_members")
    .select("father_id, groups(participation_mode)")
    .in("father_id", ids);
  if (error) {
    if (!/participation_mode/i.test(error.message)) {
      console.error("[notifications] participation mode lookup failed", error.message);
    }
    return modes;
  }
  for (const row of (data ?? []) as Array<{
    father_id: string;
    groups: { participation_mode?: string | null } | { participation_mode?: string | null }[] | null;
  }>) {
    const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
    modes.set(row.father_id, parseParticipationMode(group?.participation_mode));
  }
  return modes;
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}
