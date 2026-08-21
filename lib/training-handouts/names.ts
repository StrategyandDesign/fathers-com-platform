export function isPdfBytes(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function sanitizeHandoutName(name: string) {
  const base = name.split(/[/\\]/).pop()?.trim() || "handout.pdf";
  const cleaned = base.replace(/[^\w.\- ()]/g, "").replace(/\s+/g, " ").trim();
  const stem = cleaned.replace(/\.pdf$/i, "") || "handout";
  return `${stem.slice(0, 76)}.pdf`;
}

export function trainingHandoutPath(trainingId: string, handoutId: string) {
  return `${trainingId}/${handoutId}.pdf`;
}

export function trainingHandoutHref(trainingId: string, handoutId: string) {
  return `/api/trainings/${trainingId}/handouts/${handoutId}`;
}
