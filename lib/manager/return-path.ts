import { redirect } from "next/navigation";

export type ManagerAssignReturn = "dashboard" | "participants" | "trainings" | "detail";

export function managerAssignDestination(formData: FormData, fatherId?: string) {
  const value = String(formData.get("return_to") ?? "").trim();
  const id = fatherId || String(formData.get("father_id") ?? "").trim();
  if (value === "dashboard") return { path: "/manager", hash: "#status" };
  if (value === "participants") return { path: "/manager/participants", hash: "#status" };
  if (value === "trainings") return { path: "/manager/trainings", hash: "#cohort" };
  if (id) return { path: `/manager/participants/${id}`, hash: "" };
  return { path: "/manager/participants", hash: "#status" };
}

export function redirectManagerAssign(
  kind: "error" | "notice",
  message: string,
  formData: FormData,
  fatherId?: string
): never {
  const { path, hash } = managerAssignDestination(formData, fatherId);
  redirect(`${path}?${kind}=${encodeURIComponent(message)}${hash}`);
}
