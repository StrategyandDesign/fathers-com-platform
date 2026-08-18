"use client";

import { useState, useTransition } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { submitTrainingRequest } from "@/lib/training-requests/actions";
import {
  AUDIENCE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
} from "@/lib/training-requests/types";
import { fieldClassName, textareaClassName } from "@/lib/ui";

type GroupOption = { id: string; name: string };

export function TrainingRequestForm({ groups }: { groups: GroupOption[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [topicError, setTopicError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        const topic = String(formData.get("topic") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim();
        const nextTopic = topic ? null : t("manager.request.topicError");
        const nextDescription = description ? null : t("manager.request.whyError");
        setTopicError(nextTopic);
        setDescriptionError(nextDescription);
        if (nextTopic || nextDescription) return;

        startTransition(() => {
          void submitTrainingRequest(formData);
        });
      }}
      className="space-y-5"
      noValidate
      aria-busy={pending}
    >
      {groups.length > 1 ? (
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">{t("common.organization")}</span>
          <select
            className={fieldClassName}
            name="group_id"
            disabled={pending}
            defaultValue={groups[0]?.id}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      ) : groups[0] ? (
        <input type="hidden" name="group_id" value={groups[0].id} />
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("manager.request.topic")}</span>
        <input
          className={fieldClassName}
          name="topic"
          maxLength={TOPIC_MAX_LENGTH}
          disabled={pending}
          placeholder={t("manager.request.topicPlaceholder")}
          autoComplete="off"
          aria-invalid={Boolean(topicError) || undefined}
          aria-describedby={topicError ? "topic-error" : undefined}
          onChange={() => {
            if (topicError) setTopicError(null);
          }}
        />
        {topicError ? (
          <span id="topic-error" className="block text-sm text-destructive">
            {topicError}
          </span>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("manager.request.why")}</span>
        <textarea
          className={textareaClassName}
          name="description"
          maxLength={DESCRIPTION_MAX_LENGTH}
          disabled={pending}
          rows={5}
          placeholder={t("manager.request.whyPlaceholder")}
          aria-invalid={Boolean(descriptionError) || undefined}
          aria-describedby={descriptionError ? "description-error" : undefined}
          onChange={() => {
            if (descriptionError) setDescriptionError(null);
          }}
        />
        {descriptionError ? (
          <span id="description-error" className="block text-sm text-destructive">
            {descriptionError}
          </span>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("manager.request.audience")}</span>
        <input
          className={fieldClassName}
          name="audience"
          maxLength={AUDIENCE_MAX_LENGTH}
          disabled={pending}
          placeholder={t("manager.request.audiencePlaceholder")}
          autoComplete="off"
        />
      </label>

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? t("manager.request.sending") : t("manager.request.send")}
      </Button>
    </form>
  );
}
