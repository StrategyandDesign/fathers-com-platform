import { createClient } from "@/lib/supabase/server";
import {
  emptyAdminGathering,
  parseAdminGathering,
  type AdminGathering,
} from "@/lib/admin/gathering-model";

export {
  GATHERING_MIN_COHORT,
  emptyAdminGathering,
  gatheringHomePreview,
  parseAdminGathering,
  sharingInventory,
  type AdminGathering,
  type GatheringHomePreview,
  type GatheringRoleSlice,
  type GatheringTrainingRow,
  type GatheringTrendPoint,
} from "@/lib/admin/gathering-model";

export async function loadAdminGathering(): Promise<AdminGathering> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_anonymous_gathering");
    if (error || !data || typeof data !== "object") {
      return emptyAdminGathering(true);
    }

    return parseAdminGathering(data as Record<string, unknown>);
  } catch {
    return emptyAdminGathering(true);
  }
}
