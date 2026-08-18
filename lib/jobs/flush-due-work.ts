import "server-only";

import { after } from "next/server";

import { flushDueReminders } from "@/lib/notifications/events";

export function scheduleDueReminderFlush() {
  after(() => {
    void flushDueReminders();
  });
}
