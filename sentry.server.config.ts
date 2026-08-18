import * as Sentry from "@sentry/nextjs";

import { sentryDsn, sentryEnabled } from "@/lib/observability/sentry-dsn";

Sentry.init({
  dsn: sentryDsn() || undefined,
  enabled: sentryEnabled(),
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
