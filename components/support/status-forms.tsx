import { Button } from "@/components/ui/button";
import { updateSupportStatus } from "@/lib/support/actions";
import type { SupportStatus } from "@/lib/support/types";

export function SupportStatusForms({
  reportId,
  status,
}: {
  reportId: string;
  status: SupportStatus;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {status !== "looking" ? (
        <form action={updateSupportStatus}>
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="status" value="looking" />
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Looking into it
          </Button>
        </form>
      ) : null}
      {status !== "resolved" ? (
        <form action={updateSupportStatus}>
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="status" value="resolved" />
          <Button type="submit" className="w-full sm:w-auto">
            Mark as resolved
          </Button>
        </form>
      ) : (
        <form action={updateSupportStatus}>
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="status" value="new" />
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Reopen
          </Button>
        </form>
      )}
    </div>
  );
}
