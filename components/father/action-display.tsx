import { ActionSkillCard } from "@/components/father/action-skill-card";

export function ActionDisplay({
  eyebrow,
  skill,
  children,
  footer,
}: {
  eyebrow?: string | null;
  skill: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="space-y-10">
      <ActionSkillCard eyebrow={eyebrow} skill={skill} />
      {children ? <div className="space-y-8">{children}</div> : null}
      {footer ? <div className="text-center">{footer}</div> : null}
    </section>
  );
}
