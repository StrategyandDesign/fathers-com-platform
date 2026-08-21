import { ChevronDown } from "lucide-react";

import {
  checkinQuestionsFor,
  parseSkillPrompt,
} from "@/lib/father/session-questions";
import type { Session, Training } from "@/lib/father/types";
import type { Translate } from "@/lib/i18n/translate";
import { hostedVideoEmbed } from "@/lib/media/hosted-video";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function ReviewSessionList({
  sessions,
  training,
  t,
}: {
  sessions: Session[];
  training: Pick<Training, "slug">;
  t: Translate;
}) {
  return (
    <ol className="space-y-3">
      {sessions.map((session) => {
        const embed = hostedVideoEmbed(session.video_url);
        const questions = checkinQuestionsFor(session, training);

        return (
          <li key={session.id}>
            <details className="group overflow-hidden rounded-xl border border-border bg-card open:[&_svg]:rotate-180">
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5",
                  interactiveControlClassName,
                  "[&::-webkit-details-marker]:hidden"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t("manager.reviewDetail.sessionN", { n: session.session_number })}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-semibold">{session.title}</h3>
                  {session.keyline ? (
                    <p className="mt-1 text-sm text-muted-foreground">{session.keyline}</p>
                  ) : null}
                </div>
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-150"
                />
              </summary>
              <div className="space-y-4 border-t border-border">
                {embed ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      className="h-full w-full"
                      src={embed}
                      title={session.title}
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="px-4 text-sm text-muted-foreground sm:px-6">
                    {t("manager.reviewDetail.noFilm")}
                  </p>
                )}
                <div className="space-y-3 px-4 pb-5 sm:px-6">
                  <h4 className="text-sm font-medium">{t("manager.reviewDetail.checkin")}</h4>
                  {questions.map((question) => {
                    const parsed = parseSkillPrompt(question.label);
                    return (
                      <div key={question.key} className="space-y-2">
                        <p className="text-sm leading-relaxed">{parsed.stem}</p>
                        {parsed.choices ? (
                          <ol className="space-y-1.5">
                            {parsed.choices.map((choice) => (
                              <li
                                key={choice.value}
                                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">{choice.value}</span>
                                {") "}
                                {choice.label}
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
