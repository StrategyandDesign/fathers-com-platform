import type { Translate } from "@/lib/i18n/translate";
import { participationCopyKey, type ParticipationMode } from "@/lib/participation";

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
  "Ask your leader for an invite code, then try again.": "flash.inviteRequired",
  "That invite code didn’t work. Check it with your manager and try again.": "flash.inviteFailed",
  "That invite code didn’t work. Check it with your leader and try again.": "flash.inviteFailed",
  "An account with that email already exists. Sign in instead.": "flash.accountExists",
  "Use a password with at least 6 characters.": "flash.weakPassword",
  "Enter a valid email address.": "flash.invalidEmail",
  "Couldn’t create the account. Check the invite code and try again.": "flash.signupFailed",
  "Check your email to confirm your account, then sign in with your email and password.":
    "flash.confirmThenSignIn",
  "Preferences saved.": "flash.prefsSaved",
  "That preference didn’t save. Try again.": "flash.shareFailed",
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
  "Your Profile progress is saved. You can continue from the Profile tab.":
    "flash.profileProgressSaved",
  "Your Assessment progress is saved. You can continue from Assessments.":
    "flash.profileProgressSaved",
  "Your Profile didn’t save. Try again.": "flash.profileSaveFailed",
  "Your Assessment didn’t save. Try again.": "flash.profileSaveFailed",
  "Answer every question before you submit.": "flash.answerEveryQuestion",
  "That assessment couldn’t load. Try again from Home.": "flash.assessmentLoadFailed",
  "That assessment is not assigned to you.": "flash.assessmentNotAssigned",
  "This assessment has no questions yet. Check back after your manager adds some.":
    "flash.assessmentNoQuestions",
  "This assessment has no questions yet. Check back after your leader adds some.":
    "flash.assessmentNoQuestions",
  "Use a YouTube video link. Playlists and other sites will not play.":
    "flash.youtubeUrlInvalid",
  "Use a YouTube or Vimeo video link. Playlists and other sites will not play.":
    "flash.hostedVideoUrlInvalid",
  "That question was not found.": "flash.questionNotFound",
  "Your answer didn’t save. Try again.": "flash.answerSaveFailed",
  "Answer every question to finish.": "flash.answerEveryQuestion",
  "Your answers saved, but the assessment didn’t finish. Try Submit again.":
    "flash.assessmentFinishFailed",
  "Assessment complete.": "flash.assessmentComplete",
  "Answer this question to continue.": "flash.answerThisQuestion",
  "Keep your answer under 2,000 characters.": "flash.answerTooLong",
  "Choose one of the listed options.": "flash.chooseListedOption",
  "That step didn’t save. Try again.": "flash.startStepFailed",
  "Pick a day and a time.": "flash.startReminderPick",
  "That reminder didn’t save. Try again.": "flash.startReminderFailed",
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
  "Choose a participant to send a note.": "flash.chooseNudgeParticipant",
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
  "Too many bulk actions just now. Try again in a few minutes.": "manager.bulk.tooMany",
  "1 participant needs a closer look.": "manager.bulk.closerLook",
  "The group didn’t save. Try again.": "flash.groupSaveFailed",
  "Group created. Share the invite code with fathers.": "flash.groupCreated",
  "Choose a group.": "manager.dashboard.noteChooseGroup",
  "That group is not yours.": "manager.dashboard.noteNotYours",
  "The setting didn’t save. Try again.": "flash.participationSaveFailed",
  "Participation setting saved.": "flash.participationSaved",
  "Choose a training to assign.": "flash.chooseTrainingAssign",
  "That training is already assigned.": "flash.trainingAlreadyAssigned",
  "Training assigned.": "flash.trainingAssigned",
  "Assigned to 1 father.": "flash.assignedToOneFather",
  "Everyone who can receive this already has it.": "flash.alreadyHasTraining",
  "Choose a training to mark complete.": "flash.chooseTrainingComplete",
  "Training marked complete.": "flash.trainingMarkedComplete",
  "Choose a training for the certificate.": "flash.chooseTrainingCertificate",
  "Couldn’t verify this participant. Try again.": "flash.verifyParticipantFailed",
  "A certificate is already on file for this training.": "flash.certAlreadyOnFileTraining",
  "Assessment created.": "flash.assessmentCreated",
  "Assessment updated.": "flash.assessmentUpdated",
  "Private note saved.": "flash.noteSaved",
  "Private note cleared.": "flash.noteCleared",
  "Write a note before you save.": "flash.noteEmpty",
  "Preferences didn’t save. Try again.": "flash.prefsSaveFailed",
  "Sign in again to save preferences.": "flash.signInAgainPrefs",
  "Add a second group to compare groups. Time periods still work.": "flash.compareNeedSecondGroup",
  "Choose two different groups.": "flash.compareDifferentGroups",
  "Photo updated.": "account.photoUpdated",
  "Photo removed.": "account.photoRemoved",
  "Choose a photo to upload.": "account.photoChoose",
  "Photo must be 2 MB or smaller.": "account.photoTooBig2",
  "Use a JPEG, PNG, WebP, or GIF.": "account.photoTypeGif",
  "The photo didn’t save. Try a JPEG, PNG, WebP, or GIF under 2 MB.": "account.photoSaveHint2",
  "The photo didn’t save. Try again.": "account.photoSaveFailed",
  "The photo didn’t remove. Try again.": "account.photoRemoveFailed",
  "Too many photo uploads. Wait a few minutes and try again.": "account.photoUploadsTooMany",
  "Too many photo changes. Wait a few minutes and try again.": "account.photoChangesTooMany",
  "Choose an organization.": "manager.photos.chooseOrg",
  "Couldn’t load that organization. Try again.": "manager.photos.loadFailed",
  "That organization isn’t yours.": "manager.photos.notYours",
  "That photo slot isn’t available.": "manager.photos.slotUnavailable",
  "Photo must be 5 MB or smaller.": "manager.photos.tooBig5",
  "Use a JPEG, PNG, or WebP.": "manager.photos.type",
  "The photo didn’t save. Try a JPEG, PNG, or WebP under 5 MB.": "manager.photos.saveHint5",
  "Couldn’t reset that photo. Try again.": "manager.photos.resetFailed",
  "That file doesn’t look like a photo. Use a JPEG, PNG, or WebP.": "manager.photos.notAPhoto",
  "Use a clearer photo. That one is too small.": "manager.photos.tooSmall",
  "Choose a training to review.": "manager.reviews.chooseTraining",
  "Too many review actions just now. Try again in a minute.": "manager.reviews.tooMany",
  "Couldn’t verify this organization. Try again.": "manager.reviews.verifyOrgFailed",
  "That training is not in your organization.": "manager.reviews.notInOrg",
  "Couldn’t load that review. Try again.": "manager.reviews.loadFailed",
  "That training is not waiting on your review.": "manager.reviews.notWaiting",
  "Couldn’t check this training. Try again.": "manager.reviews.checkFailed",
  "This training is no longer released. A Super-admin must release it again.":
    "manager.reviews.noLongerReleased",
  "The decision didn’t save. Try again.": "manager.reviews.decisionFailed",
  "Training is available to assign again.": "manager.reviews.availableAgain",
  "Training is available to assign. Fathers are not enrolled until you assign it.":
    "manager.reviews.availableAssign",
  "Training is hidden from new assignment for your organization.": "manager.reviews.hiddenFromNew",
  "Training is hidden from your organization.": "manager.reviews.hiddenFromOrg",
  "Too many requests just now. Try again in a few minutes.": "manager.request.tooMany",
  "Add a topic or suggested title.": "manager.request.topicError",
  "Say why this training is needed.": "manager.request.whyError",
  "Keep the description under 2000 characters.": "manager.request.descriptionTooLong",
  "Unable to send request. Please try again.": "manager.request.sendFailed",
  "Thanks — your request has been received": "manager.request.received",
  "Thanks. Your request has been received": "manager.request.received",
  "Request received.": "manager.request.received",
  "Start date must be a valid date.": "manager.reports.startDateInvalid",
  "End date must be a valid date.": "manager.reports.endDateInvalid",
  "Completion status must be not started, in progress, or completed.":
    "manager.reports.statusInvalid",
  "The start date must be on or before the end date.": "manager.reports.dateOrder",
  "Too many reports just now. Try again in a few minutes.": "help.tooMany",
  "Choose a category.": "help.chooseCategory",
  "Write a message before sending.": "help.writeMessage",
  "Screenshot must be 2 MB or smaller.": "help.screenshotTooBig",
  "Unable to send right now. Please try again.": "help.sendFailed",
  "Thanks — we’ve received your report": "help.received",
  "Thanks. We’ve received your report": "help.received",
  "Report received.": "help.received",
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
  "Couldn’t load that training.": "manager.bulk.reasonLoadTraining",
  "Couldn’t verify this participant.": "manager.bulk.reasonVerify",
  "That participant is not in your group.": "flash.participantNotInGroup",
  "Couldn’t check this training’s review.": "manager.bulk.reasonCheckReview",
  "This training is not available for your organization yet.": "manager.bulk.reasonNotAvailableOrg",
  "This training is not available to assign.": "manager.bulk.reasonNotAvailableAssign",
  "The assignment didn’t save.": "flash.assignmentSaveFailed",
  "Couldn’t load sessions for that training.": "manager.bulk.reasonLoadSessions",
  "Couldn’t load current progress.": "manager.bulk.reasonLoadProgress",
  "That session is already complete.": "manager.bulk.reasonSessionComplete",
  "Progress didn’t save.": "manager.bulk.reasonProgressSave",
  "Couldn’t check for an existing certificate.": "manager.bulk.reasonCheckCert",
  "Couldn’t load progress.": "manager.bulk.reasonLoadProgress",
  "Couldn’t load this certificate.": "manager.bulk.reasonLoadCert",
  "The PDF didn’t generate.": "manager.bulk.reasonPdfGenerate",
  "The certificate PDF didn’t save.": "manager.bulk.reasonPdfSave",
  "The certificate didn’t save.": "manager.bulk.reasonCertSave",
  "Unknown participant": "manager.bulk.unknown",
  "Skipped.": "manager.bulk.skippedFallback",
  "Failed.": "manager.bulk.failedFallback",
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

const THEME_MEANING: Record<string, string> = {
  Involvement: "father.profile.meaningInvolvement",
  Consistency: "father.profile.meaningConsistency",
  Awareness: "father.profile.meaningAwareness",
  Nurturance: "father.profile.meaningNurturance",
  "Come home present": "father.profile.meaningPresence",
  "Stay steady": "father.profile.meaningSteadiness",
  "Repair first": "father.profile.meaningRepair",
  "Keep coming back": "father.profile.meaningReturn",
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
    message.startsWith("reviewer.") ||
    message.startsWith("help.")
  ) {
    return t(message);
  }
  const key = EXACT[message];
  if (key) return t(key);

  const assignedMany = message.match(/^Assessment assigned to (\d+) participants\.$/);
  if (assignedMany) {
    return t("flash.assessmentAssignedMany", { n: assignedMany[1] });
  }
  const assignedFathers = message.match(/^Assigned to (\d+) fathers\.$/);
  if (assignedFathers) {
    return t("flash.assignedToManyFathers", { n: assignedFathers[1] });
  }
  const reminderTomorrow = message.match(/^A reminder already went out\. You can send another tomorrow\.$/);
  if (reminderTomorrow) return t("manager.participants.nudgeTomorrow");
  const reminderDays = message.match(
    /^A reminder already went out\. You can send another in (\d+) days\.$/
  );
  if (reminderDays) {
    return t("manager.participants.nudgeInDays", { days: reminderDays[1] });
  }
  const reminderUnrecorded = message.match(
    /^Reminder sent to (.+)\. We couldn’t record it(?: —|\.) wait a few days before sending another\.$/i
  );
  if (reminderUnrecorded) {
    return t("flash.reminderSentUnrecorded", { name: reminderUnrecorded[1] });
  }
  const reminderSent = message.match(/^Reminder sent to (.+)\.$/);
  if (reminderSent) return t("flash.reminderSent", { name: reminderSent[1] });
  const noteLength = message.match(/^Keep the note under (\d+) characters\.$/);
  if (noteLength) return t("flash.noteTooLong", { n: noteLength[1] });
  const typeConfirm = message.match(/^Type (.+) to confirm\.$/);
  if (typeConfirm) return t("manager.bulk.typeConfirm", { word: typeConfirm[1] });
  const closerLook = message.match(/^(\d+) participants need a closer look\.$/);
  if (closerLook) return t("manager.bulk.closerLookMany", { n: closerLook[1] });
  const certificateIssued = message.match(/^Certificate issued: (.+)$/);
  if (certificateIssued) return t("flash.certificateIssued", { serial: certificateIssued[1] });
  const validDate = message.match(/^(.+) must be a valid date\.$/);
  if (validDate) return t("manager.reports.dateInvalid", { label: validDate[1] });
  const acceptAfterDecline = message.match(
    /^Type (.+) to accept this training after declining it\.$/
  );
  if (acceptAfterDecline) {
    return t("manager.reviews.typeAcceptAfterDecline", { word: acceptAfterDecline[1] });
  }
  const topicLength = message.match(/^Keep the topic under (\d+) characters\.$/);
  if (topicLength) return t("manager.request.topicTooLong", { n: topicLength[1] });
  const messageLength = message.match(/^Keep the message under (\d+) characters\.$/);
  if (messageLength) return t("help.messageTooLong", { n: messageLength[1] });

  const tryAgain = message.match(/^(.+) Try again\.$/);
  if (tryAgain) {
    const reason = tryAgain[1];
    const reasonKey = EXACT[reason] ?? BULK_REASON[reason];
    if (reasonKey) return t("flash.tryAgain", { reason: t(reasonKey) });
  }

  const bulk = BULK_REASON[message];
  if (bulk) return t(bulk);

  return message;
}

export function translateAttention(reason: string, t: Translate) {
  if (reason === "Has not started the Father Profile") return t("manager.attention.noProfile");
  if (reason === "Has not started the Keystone Assessment") return t("manager.attention.noProfile");
  if (reason === "Father Profile is in progress") return t("manager.attention.profileProgress");
  if (reason === "Keystone Assessment is in progress") return t("manager.attention.profileProgress");
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

export function translateThemeMeaning(label: string | null | undefined, t: Translate) {
  if (!label) return "";
  const key = THEME_MEANING[label];
  return key ? t(key) : "";
}

export function translateNudgeStatus(status: string, t: Translate) {
  const key = NUDGE_STATUS[status];
  return key ? t(key) : status;
}

export function translateNudgeTemplate(
  key: string,
  t: Translate,
  mode: ParticipationMode = "unset"
) {
  const mapped = NUDGE_TEMPLATE[key];
  if (!mapped) return { label: key, preview: "" };
  return {
    label: t(mapped.label),
    preview: t(participationCopyKey(mode, mapped.preview)),
  };
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
