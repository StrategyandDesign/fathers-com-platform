import { SupportHelpPage } from "@/components/support/help-page";
import { requireRole } from "@/lib/auth/session";

export default async function FatherHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("father");
  return <SupportHelpPage role="father" error={flash.error} notice={flash.notice} />;
}
