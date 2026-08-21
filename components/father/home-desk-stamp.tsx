"use client";

import { useEffect } from "react";

import { clientHomeDeskCookie } from "@/lib/father/home-desk";

export function HomeDeskStamp({ loginAt }: { loginAt: string }) {
  useEffect(() => {
    document.cookie = clientHomeDeskCookie({
      loginAt,
      seenAt: new Date().toISOString(),
    });
  }, [loginAt]);

  return null;
}
