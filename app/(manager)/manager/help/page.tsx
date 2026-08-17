import { SupportHelpPage } from "@/components/support/help-page";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("manager");
  return <SupportHelpPage role="manager" error={flash.error} notice={flash.notice} />;
}
