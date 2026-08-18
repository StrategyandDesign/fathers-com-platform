import { redirect } from "next/navigation";

export default async function ManagerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.notice) query.set("notice", params.notice);
  const suffix = query.toString();
  redirect(suffix ? `/manager/trainings?${suffix}` : "/manager/trainings");
}
