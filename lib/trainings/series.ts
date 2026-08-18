import type { Training } from "@/lib/father/types";

export function trainingCoverSlug(training: Pick<Training, "slug">) {
  return training.slug;
}
