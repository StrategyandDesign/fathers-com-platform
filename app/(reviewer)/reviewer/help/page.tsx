import { SupportHelpPage } from "@/components/support/help-page";
import { requireRole } from "@/lib/auth/session";

export default async function ReviewerHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("reviewer");
  return <SupportHelpPage role="reviewer" error={flash.error} notice={flash.notice} />;
}
