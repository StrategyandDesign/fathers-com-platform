import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { backfillFatherStreaks } from "../lib/father/streak-admin";

const SAMPLE_FATHERS = [
  "f831b751-79b3-4f3f-bbfe-68f4f7864043",
  "30b2de9a-a601-4c5b-9b3b-49971ebbb693",
  "afb84b2d-6d9c-40df-a580-90c7a63e77a2",
];

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Use the environment as-is.
  }
}

async function main() {
  loadEnvLocal();
  const results = await backfillFatherStreaks();
  const byId = new Map(results.map((row) => [row.userId, row]));

  console.log(`Backfilled ${results.length} fathers.`);
  console.log("");
  console.log("Hand calculation vs stored cache (three sample fathers)");
  console.log("week = Monday-start local week. Two completions in one week count as 1.");
  console.log("");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

  for (const userId of SAMPLE_FATHERS) {
    const row = byId.get(userId);
    if (!row) {
      console.log(`${userId}: not in father list`);
      continue;
    }
    let email = "";
    if (admin) {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data.user?.email ?? "";
    }
    const match = row.handWeeks === row.storedWeeks ? "MATCH" : "MISMATCH";
    console.log(`${email || userId}`);
    console.log(`  counted weeks: ${row.countedWeeks.join(", ") || "(none)"}`);
    console.log(`  hand current:  ${row.handWeeks}`);
    console.log(`  stored current:${row.storedWeeks}`);
    console.log(`  longest:       ${row.longestWeeks}`);
    console.log(`  freezes:       ${row.freezesRemaining}`);
    console.log(`  ${match}`);
    console.log("");
  }

  const mismatches = SAMPLE_FATHERS.filter((id) => {
    const row = byId.get(id);
    return row && row.handWeeks !== row.storedWeeks;
  });
  if (mismatches.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
