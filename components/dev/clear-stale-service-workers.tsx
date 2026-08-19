"use client";

import { useEffect } from "react";

/** Old localhost:3000 workers from other apps can RST Chrome before Next answers. */
export function ClearStaleServiceWorkers() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }, []);
  return null;
}
