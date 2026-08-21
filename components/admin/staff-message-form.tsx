"use client";

import { useMemo, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { sendStaffMessage } from "@/lib/staff-messages/actions";
import {
  STAFF_MESSAGE_MAX,
  type StaffMessageAudience,
  type StaffMessagePerson,
} from "@/lib/staff-messages/types";
import { checkboxOptionClassName, radioOptionClassName, textareaClassName } from "@/lib/ui";

const AUDIENCE_OPTIONS: Array<{
  value: StaffMessageAudience;
  label: "admin.messages.allLeaders" | "admin.messages.selectedLeaders" | "admin.messages.allReviewers" | "admin.messages.selectedReviewers" | "admin.messages.allStaff";
}> = [
  { value: "all_leaders", label: "admin.messages.allLeaders" },
  { value: "selected_leaders", label: "admin.messages.selectedLeaders" },
  { value: "all_reviewers", label: "admin.messages.allReviewers" },
  { value: "selected_reviewers", label: "admin.messages.selectedReviewers" },
  { value: "all_leaders_and_reviewers", label: "admin.messages.allStaff" },
];

export function StaffMessageForm({
  people,
}: {
  people: StaffMessagePerson[];
}) {
  const t = useT();
  const [audience, setAudience] = useState<StaffMessageAudience>("all_leaders");
  const picks = useMemo(() => {
    if (audience === "selected_leaders") {
      return people.filter((person) => person.role === "manager");
    }
    if (audience === "selected_reviewers") {
      return people.filter((person) => person.role === "reviewer");
    }
    return [];
  }, [audience, people]);

  return (
    <form action={sendStaffMessage} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("admin.messages.body")}</span>
        <textarea
          name="body"
          required
          maxLength={STAFF_MESSAGE_MAX}
          rows={4}
          className={textareaClassName}
          placeholder={t("admin.messages.bodyPlaceholder")}
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm text-muted-foreground">{t("admin.messages.audience")}</legend>
        {AUDIENCE_OPTIONS.map((option) => (
          <label key={option.value} className={radioOptionClassName}>
            <input
              type="radio"
              name="audience"
              value={option.value}
              checked={audience === option.value}
              onChange={() => setAudience(option.value)}
              className="size-4 accent-primary"
            />
            <span>{t(option.label)}</span>
          </label>
        ))}
      </fieldset>

      {picks.length > 0 ? (
        <fieldset className="space-y-2 rounded-lg border border-border px-3 py-2">
          <legend className="px-1 text-sm text-muted-foreground">
            {t("admin.messages.choosePeople")}
          </legend>
          {picks.map((person) => (
            <label key={person.id} className={checkboxOptionClassName}>
              <input
                type="checkbox"
                name="profile_id"
                value={person.id}
                className="size-4 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{person.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {[
                    person.role === "manager" ? t("role.leader") : t("role.reviewer"),
                    person.organization,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {audience.startsWith("selected_") && picks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.messages.noPeople")}</p>
      ) : null}

      <p className="text-sm text-muted-foreground">{t("admin.messages.fathersNever")}</p>
      <Button type="submit" className="w-full sm:w-auto">
        {t("admin.messages.send")}
      </Button>
    </form>
  );
}
