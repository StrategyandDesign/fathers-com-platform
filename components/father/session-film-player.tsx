"use client";

import { useEffect, useRef } from "react";

import { CoverPhoto } from "@/components/brand/cover";
import { useI18n } from "@/components/i18n/locale-provider";
import { saveFilmPosition } from "@/lib/father/actions";
import { youtubeEmbedUrl, type Session } from "@/lib/father/types";

const YT_ORIGINS = new Set([
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
]);

function readCurrentTime(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const info = (data as { info?: { currentTime?: unknown } }).info;
  const time = info?.currentTime;
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0) return null;
  return Math.floor(time);
}

function shouldIgnoreTime(time: number, lastSaved: number, lastSeen: number | null) {
  // The embed can report 0 before it honors `start`. Do not wipe a resume point.
  return time === 0 && lastSaved > 0 && lastSeen == null;
}

export function SessionFilmPlayer({
  session,
  coverSrc,
  resumeSeconds = 0,
  persistSessionId,
}: {
  session: Pick<Session, "title" | "video_url">;
  coverSrc: string;
  resumeSeconds?: number;
  persistSessionId?: string;
}) {
  const { locale } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSeenRef = useRef<number | null>(null);
  const lastSavedRef = useRef(Math.max(0, Math.floor(resumeSeconds)));
  const persistIdRef = useRef(persistSessionId);
  persistIdRef.current = persistSessionId;

  const embed = youtubeEmbedUrl(session.video_url, {
    startSeconds: resumeSeconds,
    language: locale,
  });

  useEffect(() => {
    if (!embed || !persistSessionId) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handshake = () => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        "*"
      );
    };

    const persist = (seconds: number, keepalive: boolean) => {
      const sessionId = persistIdRef.current;
      if (!sessionId || seconds === lastSavedRef.current) return;
      lastSavedRef.current = seconds;
      if (keepalive) {
        void fetch("/api/session-progress/position", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, seconds }),
          keepalive: true,
          credentials: "same-origin",
        });
        return;
      }
      void saveFilmPosition(sessionId, seconds);
    };

    const flush = (keepalive: boolean) => {
      const seen = lastSeenRef.current;
      if (seen == null) return;
      persist(seen, keepalive);
    };

    const onMessage = (event: MessageEvent) => {
      if (!YT_ORIGINS.has(event.origin)) return;
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      const time = readCurrentTime(payload);
      if (time == null) return;
      if (shouldIgnoreTime(time, lastSavedRef.current, lastSeenRef.current)) return;
      lastSeenRef.current = time;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onPageHide = () => flush(true);

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", handshake);
    handshake();
    const handshakeTimer = window.setInterval(handshake, 2000);
    const saveTimer = window.setInterval(() => flush(false), 2000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("load", handshake);
      window.clearInterval(handshakeTimer);
      window.clearInterval(saveTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [embed, persistSessionId]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      {embed ? (
        <div className="aspect-video">
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            src={embed}
            title={session.title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="relative aspect-video">
          <CoverPhoto src={coverSrc} />
        </div>
      )}
    </div>
  );
}
