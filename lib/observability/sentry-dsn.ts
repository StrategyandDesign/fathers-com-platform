export function sentryDsn() {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";
}

export function sentryEnabled() {
  return Boolean(sentryDsn());
}
