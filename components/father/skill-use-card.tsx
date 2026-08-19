import { reportSkillUse } from "@/lib/father/actions";
import type { SkillUse } from "@/lib/father/skill-use";
import type { Translate } from "@/lib/i18n/translate";
import { Button } from "@/components/ui/button";

export function SkillUseCard({
  sessionId,
  skill,
  reported,
  returnTo,
  showLater,
  t,
}: {
  sessionId: string;
  skill: string;
  reported: SkillUse | null;
  returnTo: "home" | "done";
  showLater: boolean;
  t: Translate;
}) {
  if (reported === "used") {
    return (
      <p className="text-sm text-muted-foreground">{t("father.session.skillUseMarked")}</p>
    );
  }

  if (reported === "later") return null;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("father.session.skillUseTitle")}</p>
        {skill ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{skill}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <form action={reportSkillUse}>
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="skill_use" value="used" />
          <input type="hidden" name="return_to" value={returnTo} />
          <Button type="submit" className="w-full sm:w-auto">
            {t("father.session.skillUseUsed")}
          </Button>
        </form>
        {showLater ? (
          <form action={reportSkillUse}>
            <input type="hidden" name="session_id" value={sessionId} />
            <input type="hidden" name="skill_use" value="later" />
            <input type="hidden" name="return_to" value={returnTo} />
            <Button type="submit" variant="ghost" className="w-full sm:w-auto">
              {t("father.session.skillUseLater")}
            </Button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
