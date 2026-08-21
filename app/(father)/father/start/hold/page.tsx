import { redirect } from "next/navigation";

import { StartScreen } from "@/components/father/start-screen";
import { requireRole } from "@/lib/auth/session";
import { requireStartPage } from "@/lib/father/start-page";
import { getI18n } from "@/lib/i18n/server";
import { loadFatherParticipationMode } from "@/lib/participation-data";
import { participationCopyKey } from "@/lib/participation";

export default async function FatherStartHoldPage() {
  const { state } = await requireStartPage("hold");
  if (state.firstSessionHref) {
    redirect(state.firstSessionHref);
  }
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const mode = await loadFatherParticipationMode(user.id);

  return (
    <StartScreen
      title={t(participationCopyKey(mode, "father.start.holdTitle"))}
      body={t(participationCopyKey(mode, "father.start.holdBody"))}
    />
  );
}
