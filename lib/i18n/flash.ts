import type { Translate } from "@/lib/i18n/translate";

function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - time) / 86_400_000);
}

const EXACT: Record<string, string> = {
  "This account has been deactivated.": "flash.deactivated",
  "Too many attempts. Wait a few minutes and try again.": "flash.tooMany",
  "Confirm your email first, then sign in.": "flash.confirmEmail",
  "Email or password doesn’t match. Try again, or create an account if you don’t have one.":
    "flash.badCredentials",
  "Ask your manager for an invite code, then try again.": "flash.inviteRequired",
  "That invite code didn’t work. Check it with your manager and try again.": "flash.inviteFailed",
  "An account with that email already exists. Sign in instead.": "flash.accountExists",
  "Use a password with at least 6 characters.": "flash.weakPassword",
  "Enter a valid email address.": "flash.invalidEmail",
  "Couldn’t create the account. Check the invite code and try again.": "flash.signupFailed",
  "Check your email to confirm your account, then sign in with your email and password.":
    "flash.confirmThenSignIn",
  "Preferences saved.": "flash.prefsSaved",
  "Language saved.": "flash.localeSaved",
  "Couldn’t save the language. Try again.": "flash.localeFailed",
  "Photo saved.": "manager.photos.photoSaved",
  "Reset to the platform default.": "manager.photos.photoReset",
  "Reset to the landscape placeholder.": "manager.photos.photoResetPlaceholder",
  "Couldn’t use that photo. Try another.": "manager.photos.photoFailed",
  "That group is not in the cohort.": "reviewer.groupNotInCohort",
  "That training is not in the catalog.": "reviewer.trainingNotInCatalog",
  "Your progress didn’t save. Try again.": "flash.progressSaveFailed",
  "Choose an answer to continue.": "flash.chooseAnswer",
  "Your check-in didn’t save. Try again.": "flash.checkinSaveFailed",
  "Choose the teaching point to continue.": "flash.chooseTeaching",
  "Your action didn’t save. Try again.": "flash.actionSaveFailed",
  "Your Profile progress is saved. You can continue anytime.": "flash.profileProgressSaved",
  "That assessment couldn’t load. Try again from Home.": "flash.assessmentLoadFailed",
  "That assessment is not assigned to you.": "flash.assessmentNotAssigned",
  "This assessment has no questions yet. Check back after your manager adds some.":
    "flash.assessmentNoQuestions",
  "That question was not found.": "flash.questionNotFound",
  "Your answer didn’t save. Try again.": "flash.answerSaveFailed",
  "Answer every question to finish.": "flash.answerEveryQuestion",
  "Your answers saved, but the assessment didn’t finish. Try Submit again.":
    "flash.assessmentFinishFailed",
  "Assessment complete.": "flash.assessmentComplete",
  "Answer this question to continue.": "flash.answerThisQuestion",
  "Keep your answer under 2,000 characters.": "flash.answerTooLong",
  "Choose one of the listed options.": "flash.chooseListedOption",
  "Add a title.": "flash.addTitle",
  "Keep the title under 200 characters.": "flash.titleTooLong",
  "Keep the description under 2,000 characters.": "flash.descriptionTooLong",
  "The assessment didn’t save. Try again.": "flash.assessmentSaveFailed",
  "The questions didn’t save. Try again.": "flash.questionsSaveFailed",
  "Choose an assessment to update.": "flash.chooseAssessmentUpdate",
  "That assessment was not found.": "flash.assessmentNotFound",
  "Choose an assessment to assign.": "flash.chooseAssessmentAssign",
  "Select at least one participant.": "flash.selectOneParticipant",
  "You can only assign fathers in your group.": "flash.assignFathersInGroup",
  "Those participants are already assigned.": "flash.alreadyAssigned",
  "The assignment didn’t save. Try again.": "flash.assignmentSaveFailed",
  "Assessment assigned.": "flash.assessmentAssigned",
  "Add at least one question.": "flash.addOneQuestion",
  "Questions could not be read. Try again.": "flash.questionsUnreadable",
  "Keep the assessment to 40 questions or fewer.": "flash.tooManyQuestions",
  "Each question needs a prompt.": "flash.questionNeedsPrompt",
  "Keep each question under 1,000 characters.": "flash.questionTooLong",
  "Choose Short text or Multiple choice for each question.": "flash.chooseQuestionType",
  "Multiple choice questions need at least two options.": "flash.needTwoOptions",
  "Keep multiple choice to 12 options or fewer.": "flash.tooManyOptions",
  "Keep each option under 200 characters.": "flash.optionTooLong",
  "The note didn’t save. Try again.": "flash.noteSaveFailed",
  "The note didn’t clear. Try again.": "flash.noteClearFailed",
  "Choose a participant first.": "flash.chooseParticipant",
  "That participant is not in your group.": "flash.participantNotInGroup",
  "Too many note saves just now. Try again in a minute.": "flash.noteTooMany",
  "Choose a participant to nudge.": "flash.chooseNudgeParticipant",
  "Choose a reminder to send.": "flash.chooseReminder",
  "Too many reminders just now. Try again in a few minutes.": "flash.tooManyReminders",
  "Couldn’t check recent reminders. Try again.": "flash.reminderCheckFailed",
  "The reminder didn’t save. Try again.": "flash.reminderSaveFailed",
  "The reminder didn’t send. Try again in a few minutes.": "flash.reminderSendFailed",
  "He turned off session reminders. The note was not emailed.": "flash.remindersOffNudge",
  "Select participants and a training first.": "flash.selectParticipantsTraining",
  "That training is not published.": "flash.trainingNotPublished",
  "Accept this training before assigning it.": "flash.acceptBeforeAssign",
  "That session is not in the selected training.": "flash.sessionNotInTraining",
  "A session can only be chosen when marking complete.": "flash.sessionOnlyWhenComplete",
  "Choose a bulk action.": "flash.chooseBulkAction",
  "Choose a training.": "flash.chooseTraining",
};

const BULK_REASON: Record<string, string> = {
  "Not in your group.": "manager.bulk.notInGroup",
  "Not accepted for this organization yet.": "manager.bulk.reasonNotAccepted",
  "That training is not published.": "manager.bulk.reasonNotPublished",
  "Already assigned.": "manager.bulk.reasonAlreadyAssigned",
  "That training has no sessions yet.": "manager.bulk.reasonNoSessions",
  "That session is not in the selected training.": "manager.bulk.reasonSessionMismatch",
  "That training is already complete.": "manager.bulk.reasonAlreadyComplete",
  "Training is not fully complete.": "manager.bulk.reasonNotComplete",
  "A certificate is already on file.": "manager.bulk.reasonCertOnFile",
};

const THEME_LABEL: Record<string, string> = {
  Involvement: "father.profile.themeInvolvement",
  Consistency: "father.profile.themeConsistency",
  Awareness: "father.profile.themeAwareness",
  Nurturance: "father.profile.themeNurturance",
  "Come home present": "father.profile.themePresence",
  "Stay steady": "father.profile.themeSteadiness",
  "Repair first": "father.profile.themeRepair",
  "Keep coming back": "father.profile.themeReturn",
};

const NUDGE_STATUS: Record<string, string> = {
  sent: "manager.nudge.sent",
  skipped_pref: "manager.nudge.skipped",
  failed: "manager.nudge.failed",
};

const NUDGE_TEMPLATE: Record<string, { label: string; preview: string }> = {
  continue: { label: "manager.nudge.continue", preview: "manager.nudge.continuePreview" },
  encouragement: {
    label: "manager.nudge.encouragement",
    preview: "manager.nudge.encouragementPreview",
  },
  welcome_back: {
    label: "manager.nudge.welcomeBack",
    preview: "manager.nudge.welcomeBackPreview",
  },
};

export function translateProgressLabel(label: string, t: Translate) {
  if (label === "None assigned") return t("manager.participants.noneAssigned");
  if (label.endsWith(" complete")) {
    return t("manager.participants.trainingComplete", {
      title: label.slice(0, -" complete".length),
    });
  }
  return label;
}

export function translateFlash(message: string | undefined, t: Translate) {
  if (!message) return undefined;
  if (
    message.startsWith("flash.") ||
    message.startsWith("auth.") ||
    message.startsWith("account.") ||
    message.startsWith("manager.") ||
    message.startsWith("father.") ||
    message.startsWith("reviewer.")
  ) {
    return t(message);
  }
  const key = EXACT[message];
  if (key) return t(key);

  const assignedMany = message.match(/^Assessment assigned to (\d+) participants\.$/);
  if (assignedMany) {
    return t("flash.assessmentAssignedMany", { n: assignedMany[1] });
  }
  const reminderTomorrow = message.match(/^A reminder already went out\. You can send another tomorrow\.$/);
  if (reminderTomorrow) return t("manager.participants.nudgeTomorrow");
  const reminderDays = message.match(
    /^A reminder already went out\. You can send another in (\d+) days\.$/
  );
  if (reminderDays) {
    return t("manager.participants.nudgeInDays", { days: reminderDays[1] });
  }
  const reminderSent = message.match(/^Reminder sent to (.+)\.$/);
  if (reminderSent) return t("flash.reminderSent", { name: reminderSent[1] });
  const noteLength = message.match(/^Keep the note under (\d+) characters\.$/);
  if (noteLength) return t("flash.noteTooLong", { n: noteLength[1] });

  return message;
}

export function translateAttention(reason: string, t: Translate) {
  if (reason === "Has not started the Father Profile") return t("manager.attention.noProfile");
  if (reason === "Father Profile is in progress") return t("manager.attention.profileProgress");
  if (reason === "No training assigned") return t("manager.attention.noTraining");
  if (reason.startsWith("Session in progress: ")) {
    return t("manager.attention.sessionInProgress", {
      title: reason.slice("Session in progress: ".length),
    });
  }
  if (reason.startsWith("Ready for certificate: ")) {
    return t("manager.attention.readyCert", {
      title: reason.slice("Ready for certificate: ".length),
    });
  }
  return reason;
}

export function translateQuietLabel(lastActivity: string | null | undefined, t: Translate) {
  const days = daysSince(lastActivity);
  if (!Number.isFinite(days)) return t("manager.nudge.quietNone");
  if (days === 0) return t("manager.nudge.quietToday");
  if (days === 1) return t("manager.nudge.quietOne");
  return t("manager.nudge.quietDays", { days });
}

export function translateBulkReason(reason: string | undefined, t: Translate) {
  if (!reason) return "";
  const key = BULK_REASON[reason];
  return key ? t(key) : reason;
}

export function translateThemeLabel(label: string | null | undefined, t: Translate) {
  if (!label) return t("common.emDash");
  const key = THEME_LABEL[label];
  return key ? t(key) : label;
}

export function translateNudgeStatus(status: string, t: Translate) {
  const key = NUDGE_STATUS[status];
  return key ? t(key) : status;
}

export function translateNudgeTemplate(key: string, t: Translate) {
  const mapped = NUDGE_TEMPLATE[key];
  if (!mapped) return { label: key, preview: "" };
  return { label: t(mapped.label), preview: t(mapped.preview) };
}

export function translateAssignmentStatus(
  status: "not_started" | "in_progress" | "completed",
  t: Translate
) {
  if (status === "completed") return t("father.assessments.completed");
  if (status === "in_progress") return t("father.assessments.inProgress");
  return t("father.assessments.notStarted");
}

export function translateProfileScale(value: number, t: Translate) {
  if (value === 1) return t("father.profile.scale1");
  if (value === 2) return t("father.profile.scale2");
  if (value === 3) return t("father.profile.scale3");
  if (value === 4) return t("father.profile.scale4");
  return t("father.profile.scale5");
}
