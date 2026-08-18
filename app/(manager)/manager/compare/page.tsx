import { redirect } from "next/navigation";

export default async function ManagerCompareRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    window?: string;
    left?: string;
    right?: string;
  }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams({ tab: "compare" });
  if (params.mode) next.set("mode", params.mode);
  if (params.window) next.set("window", params.window);
  if (params.left) next.set("left", params.left);
  if (params.right) next.set("right", params.right);
  redirect(`/manager/impact?${next.toString()}`);
}
