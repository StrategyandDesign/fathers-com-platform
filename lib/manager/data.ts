import { isSessionComplete, type Session, type SessionProgress, type Training } from "@/lib/father/types";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, signStorageUrls } from "@/lib/storage";
import {
  displayName,
  latestTimestamp,
  profileName,
  type AttentionItem,
  type Certificate,
  type Group,
  type GroupMember,
  type ManagedProfile,
  type ParticipantRow,
  type ProfileDraftRow,
  type ProfileResult,
  type TrainingAssignment,
  type TrainingProgress,
} from "@/lib/manager/types";

function asProgress(row: SessionProgress): SessionProgress {
  const answers = row.checkin_answers;
  return {
    ...row,
    checkin_answers:
      answers && typeof answers === "object" && !Array.isArray(answers)
        ? (answers as Record<string, string>)
        : {},
  };
}

function emptyIn<T>(
  ids: string[],
  load: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  if (ids.length === 0) {
    return Promise.resolve({ data: [] as T[], error: null });
  }
  return load();
}

export async function loadManagerGroups(managerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("manager_id", managerId)
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as Group[];
}

export async function loadManagerWorkspace(managerId: string) {
  const supabase = await createClient();
  const groups = await loadManagerGroups(managerId);
  const groupIds = groups.map((group) => group.id);

  const membersRes = await emptyIn<GroupMember>(groupIds, () =>
    supabase.from("group_members").select("*").in("group_id", groupIds)
  );
  if (membersRes.error) throw membersRes.error;
  const members = (membersRes.data ?? []) as GroupMember[];
  const fatherIds = [...new Set(members.map((member) => member.father_id))];

  const [profilesRes, resultsRes, draftsRes, progressRes, assignmentsRes, certificatesRes, trainingsRes, sessionsRes] =
    await Promise.all([
      emptyIn<ManagedProfile>(fatherIds, () =>
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", fatherIds)
      ),
      emptyIn<ProfileResult>(fatherIds, () =>
        supabase
          .from("father_profiles")
          .select("father_id, taken_at, primary_edge, primary_determination")
          .in("father_id", fatherIds)
          .order("taken_at", { ascending: false })
      ),
      emptyIn<ProfileDraftRow>(fatherIds, () =>
        supabase
          .from("father_profile_drafts")
          .select("father_id, answers, current_index, updated_at")
          .in("father_id", fatherIds)
      ),
      emptyIn<SessionProgress>(fatherIds, () =>
        supabase.from("session_progress").select("*").in("father_id", fatherIds)
      ),
      emptyIn<TrainingAssignment>(fatherIds, () =>
        supabase.from("training_assignments").select("*").in("father_id", fatherIds)
      ),
      emptyIn<Certificate>(fatherIds, () =>
        supabase.from("certificates").select("*").in("father_id", fatherIds)
      ),
      supabase.from("trainings").select("*").order("order_index"),
      supabase.from("sessions").select("*").order("order_index"),
    ]);

  for (const result of [profilesRes, resultsRes, draftsRes, progressRes, assignmentsRes, certificatesRes, trainingsRes, sessionsRes]) {
    if (result.error) throw result.error;
  }

  const trainings = (trainingsRes.data ?? []) as Training[];
  const sessions = (sessionsRes.data ?? []) as Session[];
  const profileRows = (profilesRes.data ?? []) as ManagedProfile[];
  const profiles = new Map(profileRows.map((profile) => [profile.id, profile]));
  const avatarUrls = await signStorageUrls(
    supabase,
    AVATARS_BUCKET,
    profileRows.map((profile) => profile.avatar_url)
  );
  const latestProfile = new Map<string, ProfileResult>();
  for (const row of (resultsRes.data ?? []) as ProfileResult[]) {
    if (!latestProfile.has(row.father_id)) {
      latestProfile.set(row.father_id, row);
    }
  }
  const drafts = new Set(((draftsRes.data ?? []) as ProfileDraftRow[]).map((row) => row.father_id));
  const progress = ((progressRes.data ?? []) as SessionProgress[]).map(asProgress);
  const assignments = (assignmentsRes.data ?? []) as TrainingAssignment[];
  const certificates = (certificatesRes.data ?? []) as Certificate[];
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  const progressByFather = new Map<string, SessionProgress[]>();
  for (const row of progress) {
    const list = progressByFather.get(row.father_id) ?? [];
    list.push(row);
    progressByFather.set(row.father_id, list);
  }

  function trainingProgressFor(fatherId: string): TrainingProgress[] {
    const fatherProgress = new Map(
      (progressByFather.get(fatherId) ?? []).map((row) => [row.session_id, row])
    );
    const assignedIds = new Set(
      assignments.filter((row) => row.father_id === fatherId).map((row) => row.training_id)
    );

    return trainings.map((training) => {
      const trainingSessions = sessions
        .filter((session) => session.training_id === training.id)
        .sort((a, b) => a.order_index - b.order_index);
      const completed = trainingSessions.filter((session) =>
        isSessionComplete(fatherProgress.get(session.id) ?? null)
      ).length;
      const currentSession = trainingSessions.find(
        (session) => !isSessionComplete(fatherProgress.get(session.id) ?? null)
      );

      return {
        training,
        sessions: trainingSessions,
        completed,
        total: trainingSessions.length,
        assigned: assignedIds.has(training.id),
        certificate:
          certificates.find(
            (row) => row.father_id === fatherId && row.training_id === training.id
          ) ?? null,
        current: currentSession
          ? {
              session: currentSession,
              progress: fatherProgress.get(currentSession.id) ?? null,
            }
          : null,
      };
    });
  }

  function profileStatus(fatherId: string): ParticipantRow["profileStatus"] {
    if (latestProfile.has(fatherId)) return "completed";
    if (drafts.has(fatherId)) return "in_progress";
    return "not_started";
  }

  function progressLabel(fatherId: string) {
    const cards = trainingProgressFor(fatherId);
    const active =
      cards.find((card) => card.assigned && card.completed < card.total) ??
      cards.find((card) => card.completed > 0 && card.completed < card.total) ??
      cards.find((card) => card.assigned) ??
      cards[0];

    if (!active) return "None assigned";
    if (active.completed === active.total && active.total > 0) {
      return `${active.training.title} complete`;
    }
    return `${active.training.title} · ${active.completed}/${active.total}`;
  }

  const participants: ParticipantRow[] = members.map((member) => {
    const fatherId = member.father_id;
    const fatherProgress = progressByFather.get(fatherId) ?? [];
    const fatherAssignments = assignments.filter((row) => row.father_id === fatherId);
    const fatherCertificates = certificates.filter((row) => row.father_id === fatherId);
    const profile = latestProfile.get(fatherId) ?? null;
    const managed = profiles.get(fatherId) ?? null;

    return {
      fatherId,
      name: displayName(managed, fatherId),
      avatarUrl: managed?.avatar_url ? avatarUrls.get(managed.avatar_url) ?? null : null,
      groupName: groupsById.get(member.group_id)?.name ?? "Group",
      joinedAt: member.joined_at,
      profileStatus: profileStatus(fatherId),
      profile,
      progressLabel: progressLabel(fatherId),
      lastActivity: latestTimestamp([
        member.joined_at,
        profile?.taken_at,
        ...fatherProgress.map((row) => row.completed_at),
        ...fatherAssignments.map((row) => row.assigned_at),
        ...fatherCertificates.map((row) => row.issued_at),
      ]),
    };
  });

  participants.sort((a, b) => a.name.localeCompare(b.name));

  const sessionsCompleted = progress.filter((row) => isSessionComplete(row)).length;
  const trainingsCompleted = fatherIds.reduce((count, fatherId) => {
    return (
      count +
      trainingProgressFor(fatherId).filter((card) => card.total > 0 && card.completed === card.total)
        .length
    );
  }, 0);

  const needsAttention: AttentionItem[] = [];
  for (const participant of participants) {
    const cards = trainingProgressFor(participant.fatherId);
    if (participant.profileStatus === "not_started") {
      needsAttention.push({
        fatherId: participant.fatherId,
        name: participant.name,
        reason: "Has not started the Father Profile",
      });
    } else if (participant.profileStatus === "in_progress") {
      needsAttention.push({
        fatherId: participant.fatherId,
        name: participant.name,
        reason: "Father Profile is in progress",
      });
    }

    if (!cards.some((card) => card.assigned)) {
      needsAttention.push({
        fatherId: participant.fatherId,
        name: participant.name,
        reason: "No training assigned",
      });
    }

    const current = cards.find((card) => card.current && card.current.progress)?.current;
    if (current?.progress && !isSessionComplete(current.progress)) {
      needsAttention.push({
        fatherId: participant.fatherId,
        name: participant.name,
        reason: `Session in progress: ${current.session.title}`,
      });
    }

    for (const card of cards) {
      if (card.total > 0 && card.completed === card.total && !card.certificate) {
        needsAttention.push({
          fatherId: participant.fatherId,
          name: participant.name,
          reason: `Ready for certificate: ${card.training.title}`,
        });
      }
    }
  }

  return {
    groups,
    trainings,
    sessions,
    participants,
    trainingProgressFor,
    summary: {
      activeParticipants: fatherIds.length,
      profilesCompleted: latestProfile.size,
      sessionsCompleted,
      trainingsCompleted,
      pendingActions: needsAttention.length,
    },
    needsAttention: needsAttention.slice(0, 8),
  };
}

export async function loadManagedParticipant(managerId: string, fatherId: string) {
  const workspace = await loadManagerWorkspace(managerId);
  const participant = workspace.participants.find((row) => row.fatherId === fatherId);
  if (!participant) return null;

  return {
    participant,
    trainings: workspace.trainings,
    progress: workspace.trainingProgressFor(fatherId),
    groups: workspace.groups,
  };
}

export async function loadCertificatePreview(
  managerId: string,
  fatherId: string,
  trainingId: string
) {
  const detail = await loadManagedParticipant(managerId, fatherId);
  if (!detail) return null;

  const card = detail.progress.find((row) => row.training.id === trainingId);
  if (!card) return null;

  const supabase = await createClient();
  const { data: manager, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", managerId)
    .maybeSingle();

  if (error) throw error;

  return {
    participant: detail.participant,
    training: card.training,
    certificate: card.certificate,
    managerName: profileName(manager, "Manager"),
  };
}
