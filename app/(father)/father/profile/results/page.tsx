import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { loadLatestProfile } from "@/lib/father/profile";

export default async function FatherProfileResultsPage() {
  const { user } = await requireRole("father");
  const profile = await loadLatestProfile(user.id);

  if (!profile) {
    redirect("/father/profile");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/father" className="hover:underline">
            Home
          </Link>
          <span className="px-1.5">/</span>
          <Link href="/father/profile" className="hover:underline">
            Father Profile
          </Link>
          <span className="px-1.5">/</span>
          Results
        </p>
        <h1 className="font-heading mt-2 text-2xl font-medium">Your results</h1>
        <p className="text-sm text-muted-foreground">
          Completed{" "}
          {new Date(profile.taken_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Primary Edge</CardDescription>
            <CardTitle>{profile.primary_edge ?? "Not set"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The strength this Profile is pointing to first.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Primary Determination</CardDescription>
            <CardTitle>{profile.primary_determination ?? "Not set"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The work to keep in front of you this season.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardFooter>
          <Link href="/father" className={buttonVariants()}>
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
