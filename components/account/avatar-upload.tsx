"use client";

import { useTransition } from "react";

import { uploadAvatar } from "@/lib/account/actions";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";

export function AvatarUpload({
  name,
  email,
  avatarUrl,
}: {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          void uploadAvatar(formData);
        });
      }}
      className="flex min-w-0 items-center gap-4 sm:gap-5"
      aria-busy={pending}
    >
      <label className="relative shrink-0 cursor-pointer rounded-full outline-none transition-opacity duration-150 ease-out hover:opacity-80 focus-within:ring-3 focus-within:ring-ring/50 active:opacity-90">
        <UserAvatar
          name={name || email}
          src={avatarUrl}
          className="size-16 text-xl font-semibold sm:size-20 sm:text-2xl"
        />
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            if (event.currentTarget.files?.length) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </label>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-heading truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {name || email?.split("@")[0] || "Account"}
        </p>
        <p className="truncate text-sm text-muted-foreground">{email}</p>
        <Button type="submit" variant="outline" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Saving…" : "Upload photo"}
        </Button>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. 2 MB max.</p>
      </div>
    </form>
  );
}
