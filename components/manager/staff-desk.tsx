import type { OrganizationStaffMember } from "@/lib/org-staff/types";
import type { Translate } from "@/lib/i18n/translate";

export function StaffDesk({
  staff,
  groups,
  t,
}: {
  staff: OrganizationStaffMember[];
  groups: Array<{ id: string; name: string }>;
  t: Translate;
}) {
  if (groups.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {t("manager.dashboard.staffEyebrow")}
      </p>
      <h2 className="font-heading mt-2 text-lg font-semibold">
        {t("manager.dashboard.staffTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("manager.dashboard.staffLead")}
      </p>
      <div className="mt-4 space-y-4">
        {groups.map((group) => {
          const people = staff.filter((row) => row.groupId === group.id);
          const leaders = people.filter((row) => row.staffRole === "manager");
          const reviewers = people.filter((row) => row.staffRole === "reviewer");
          return (
            <div key={group.id} className="rounded-lg border border-border px-4 py-3">
              {groups.length > 1 ? (
                <p className="text-sm font-medium">{group.name}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {leaders.length > 1
                  ? leaders.map((row) => row.name).join(", ")
                  : t("manager.dashboard.staffEmpty")}
              </p>
              {reviewers.length > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("manager.dashboard.staffReviewers", {
                    names: reviewers.map((row) => row.name).join(", "),
                  })}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
