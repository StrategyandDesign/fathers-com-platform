import type { Translate } from "@/lib/i18n/translate";

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
};

export function translateFlash(message: string | undefined, t: Translate) {
  if (!message) return undefined;
  if (message.startsWith("flash.") || message.startsWith("auth.") || message.startsWith("account.")) {
    return t(message);
  }
  const key = EXACT[message];
  return key ? t(key) : message;
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
