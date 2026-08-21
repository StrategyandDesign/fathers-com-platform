"use client";

import { useT } from "@/components/i18n/locale-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { type Palette } from "@/lib/theme/palette";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function PaletteSwitcher({
  id,
  compact = false,
}: {
  id?: string;
  compact?: boolean;
}) {
  const t = useT();
  const { palette, setPalette } = useTheme();

  return (
    <div>
      <div
        id={id}
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1"
        role="group"
        aria-label={t("account.palette")}
      >
        {(["dark", "light"] as const).map((option) => (
          <PaletteChoice
            key={option}
            option={option}
            active={palette === option}
            label={option === "dark" ? t("account.paletteDark") : t("account.paletteLight")}
            onChoose={setPalette}
          />
        ))}
      </div>
      {compact ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("account.paletteHint")}
        </p>
      ) : null}
    </div>
  );
}

function PaletteChoice({
  option,
  active,
  label,
  onChoose,
}: {
  option: Palette;
  active: boolean;
  label: string;
  onChoose: (palette: Palette) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "min-h-10 rounded-md px-2 text-sm",
        interactiveControlClassName,
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onChoose(option)}
    >
      {label}
    </button>
  );
}
