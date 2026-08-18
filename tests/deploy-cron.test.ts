import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("vercel cron schedules", () => {
  it("stays on the Hobby once-a-day limit", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };
    const crons = config.crons ?? [];
    assert.ok(crons.length <= 2);
    assert.ok(crons.every((cron) => /^\d+ \d+ \* \* \*$/.test(cron.schedule)));
    assert.ok(crons.some((cron) => cron.path === "/api/cron/reminders"));
    assert.ok(crons.some((cron) => cron.path === "/api/cron/streaks"));
  });
});
