import { redirect } from "next/navigation";

import { requireStartPage } from "@/lib/father/start-page";

export default async function FatherStartSessionPage() {
  const { state } = await requireStartPage("session");
  if (!state.firstSessionHref) {
    redirect("/father/start/hold");
  }
  redirect(state.firstSessionHref);
}
