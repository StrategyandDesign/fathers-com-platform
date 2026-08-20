import { BrandMark } from "@/components/brand/logo";
import type { CertificatePayload } from "@/lib/certificates/types";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export type CertificateFaceLabels = {
  ofCompletion: string;
  hasCompleted: string;
  completed: string;
  serial: string;
  issuedBy: string;
  organization: string;
};

export function certificateFaceLabels(t: Translate): CertificateFaceLabels {
  return {
    ofCompletion: t("manager.cert.ofCompletion"),
    hasCompleted: t("manager.cert.hasCompleted"),
    completed: t("manager.cert.completed"),
    serial: t("manager.cert.serial"),
    issuedBy: t("manager.cert.issuedBy"),
    organization: t("manager.cert.pdfOrg"),
  };
}

export function CertificateFace({
  fatherName,
  trainingName,
  completedOn,
  serialNumber,
  managerName,
  labels,
  size = "full",
  className,
}: CertificatePayload & {
  labels: CertificateFaceLabels;
  size?: "full" | "snapshot";
  className?: string;
}) {
  const snapshot = size === "snapshot";

  return (
    <article
      className={cn(
        "bg-white text-[#141210]",
        snapshot ? "aspect-[792/612] p-1.5" : "border-[6px] border-[#326638] px-4 py-6 sm:border-[10px] sm:px-10 sm:py-10",
        className
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col border border-[#326638]",
          snapshot ? "justify-center px-2.5 py-2" : "px-4 py-5 sm:px-8 sm:py-8"
        )}
      >
        <div className={cn("flex justify-center", snapshot ? "mb-1.5" : "mb-3 sm:mb-4")}>
          <BrandMark
            alt="Fathers.com"
            tone="forest"
            className={snapshot ? "h-5" : "h-9 sm:h-10"}
          />
        </div>
        <p
          className={cn(
            "text-center font-medium tracking-[0.14em] text-[#5c5648] uppercase",
            snapshot ? "text-[5px] tracking-[0.12em]" : "text-[11px] sm:text-xs sm:tracking-[0.22em]"
          )}
        >
          {labels.ofCompletion}
        </p>
        <p
          className={cn(
            "text-center text-[#5c5648] italic",
            snapshot ? "mt-0.5 text-[5px]" : "mt-1 text-[11px] sm:text-sm"
          )}
        >
          {labels.organization}
        </p>
        {fatherName ? (
          <>
            <h2
              className={cn(
                "text-center font-semibold tracking-tight",
                snapshot
                  ? "mt-1.5 line-clamp-1 font-serif text-[11px] leading-tight"
                  : "font-heading mt-5 text-2xl sm:mt-8 sm:text-4xl"
              )}
            >
              {fatherName}
            </h2>
            <p
              className={cn(
                "text-center text-[#5c5648] italic",
                snapshot ? "mt-0.5 text-[5px]" : "mt-3 text-sm sm:mt-4"
              )}
            >
              {labels.hasCompleted}
            </p>
          </>
        ) : null}
        <p
          className={cn(
            "text-center font-medium",
            snapshot
              ? cn("line-clamp-2 font-serif leading-tight", fatherName ? "mt-0.5 text-[7px]" : "mt-2 text-[9px]")
              : "mt-2 text-base sm:text-lg"
          )}
        >
          {trainingName}
        </p>
        <div
          className={cn(
            "mx-auto bg-[#326638]",
            snapshot ? "mt-1.5 h-px w-6" : "mt-5 h-px w-16 sm:mt-7"
          )}
        />
        <dl
          className={cn(
            "grid grid-cols-3",
            snapshot ? "mt-1.5 gap-1 text-[5px]" : "mt-auto mt-5 gap-3 text-sm sm:mt-7 sm:gap-5"
          )}
        >
          <Meta
            label={labels.completed}
            value={completedOn}
            align="start"
            snapshot={snapshot}
          />
          <Meta
            label={labels.serial}
            value={serialNumber}
            align="center"
            snapshot={snapshot}
            mono
          />
          <Meta
            label={labels.issuedBy}
            value={managerName}
            align="end"
            snapshot={snapshot}
          />
        </dl>
      </div>
    </article>
  );
}

function Meta({
  label,
  value,
  align,
  snapshot,
  mono,
}: {
  label: string;
  value: string;
  align: "start" | "center" | "end";
  snapshot: boolean;
  mono?: boolean;
}) {
  if (!value) return <div />;
  return (
    <div
      className={cn(
        "min-w-0",
        align === "center" && "text-center",
        align === "end" && "text-end"
      )}
    >
      <dt className={cn("tracking-[0.12em] text-[#5c5648] uppercase", !snapshot && "text-[11px]")}>
        {label}
      </dt>
      <dd
        className={cn(
          "truncate",
          snapshot ? "mt-px" : "mt-1",
          !snapshot && !mono && "font-medium",
          !snapshot && mono && "text-xs",
          mono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
