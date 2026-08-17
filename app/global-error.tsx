"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0a0a0a",
          color: "#ffffff",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <style>{`a{outline:none;transition:opacity 150ms ease-out}a:hover{opacity:.8}a:focus-visible{box-shadow:0 0 0 3px rgba(50,102,56,.5)}`}</style>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 24, textAlign: "center" }}>
          <p
            style={{
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontSize: 11,
              color: "#a1a1aa",
            }}
          >
            Fathers.com
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, fontSize: 14 }}>
            Refresh the page. If it happens again, sign out and sign back in.
          </p>
          <p style={{ marginTop: 24 }}>
            <a href="/" style={{ color: "#ffffff", textDecoration: "underline" }}>
              Back to Fathers.com
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
