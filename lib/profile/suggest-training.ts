export type CatalogTrainingRef = {
  id: string;
  slug: string;
  title: string;
};

const PREFERRED_SLUGS: Record<string, string[]> = {
  presence: ["coming-home-present", "coming-home", "present"],
  "come home present": ["coming-home-present", "coming-home", "present"],
  steadiness: ["steady-under-pressure", "steady"],
  "stay steady": ["steady-under-pressure", "steady"],
  repair: ["fundamentals", "fathering-fundamentals", "same-team"],
  "repair first": ["fundamentals", "fathering-fundamentals", "same-team"],
  return: ["coming-home-present", "coming-home", "fundamentals", "fathering-fundamentals"],
  "keep coming back": ["coming-home-present", "coming-home", "fundamentals", "fathering-fundamentals"],
};

const PREFERRED_TITLES: Record<string, string[]> = {
  presence: ["coming home present", "coming home"],
  "come home present": ["coming home present", "coming home"],
  steadiness: ["steady under pressure"],
  "stay steady": ["steady under pressure"],
  repair: ["fathering fundamentals", "same team"],
  "repair first": ["fathering fundamentals", "same team"],
  return: ["coming home present", "fathering fundamentals"],
  "keep coming back": ["coming home present", "fathering fundamentals"],
};

function matchesSlug(training: CatalogTrainingRef, needle: string) {
  const slug = training.slug.toLowerCase();
  return slug === needle || slug.includes(needle);
}

function matchesTitle(training: CatalogTrainingRef, needle: string) {
  return training.title.toLowerCase().includes(needle);
}

export function suggestKeystoneTraining(
  determination: string | null | undefined,
  catalog: readonly CatalogTrainingRef[]
): CatalogTrainingRef | null {
  if (catalog.length === 0) return null;

  const key = (determination ?? "").trim().toLowerCase();
  const slugs = PREFERRED_SLUGS[key] ?? [];
  const titles = PREFERRED_TITLES[key] ?? [];

  for (const slug of slugs) {
    const hit = catalog.find((row) => matchesSlug(row, slug));
    if (hit) return hit;
  }
  for (const title of titles) {
    const hit = catalog.find((row) => matchesTitle(row, title));
    if (hit) return hit;
  }

  return (
    catalog.find(
      (row) => matchesSlug(row, "fundamental") || matchesTitle(row, "fundamental")
    ) ??
    catalog[0] ??
    null
  );
}
