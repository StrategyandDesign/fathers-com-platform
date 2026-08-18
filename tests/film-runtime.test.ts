import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { youtubeEmbedUrl } from "../lib/father/types";
import {
  FILM_RUNTIME_MISSING,
  MAX_FILM_SECONDS,
  canStoreOverLengthDuration,
  filmOverageMessage,
  filmRuntimeMinutes,
  firstFilmPublishError,
  formatFilmClock,
  parseDurationInput,
  parseIso8601Duration,
} from "../lib/trainings/runtime";

describe("film runtime helpers", () => {
  it("rounds father-facing runtime up to the nearest minute", () => {
    assert.equal(filmRuntimeMinutes(1), 1);
    assert.equal(filmRuntimeMinutes(60), 1);
    assert.equal(filmRuntimeMinutes(61), 2);
    assert.equal(filmRuntimeMinutes(360), 6);
    assert.equal(filmRuntimeMinutes(361), 7);
    assert.equal(filmRuntimeMinutes(0), null);
    assert.equal(filmRuntimeMinutes(null), null);
  });

  it("formats admin clock time without rounding", () => {
    assert.equal(formatFilmClock(7), "0:07");
    assert.equal(formatFilmClock(360), "6:00");
    assert.equal(formatFilmClock(520), "8:40");
    assert.equal(formatFilmClock(420), "7:00");
  });

  it("uses the exact overage copy", () => {
    assert.equal(
      filmOverageMessage(520),
      "Film runs 8:40. The ceiling is 6:00. Re-cut before publishing."
    );
    assert.equal(
      filmOverageMessage(420),
      "Film runs 7:00. The ceiling is 6:00. Re-cut before publishing."
    );
  });

  it("parses seconds and m:ss for the admin field", () => {
    assert.equal(parseDurationInput(""), null);
    assert.equal(parseDurationInput("520"), 520);
    assert.equal(parseDurationInput("8:40"), 520);
    assert.equal(parseDurationInput("6:00"), 360);
    assert.equal(parseDurationInput("8:99"), "invalid");
    assert.equal(parseDurationInput("abc"), "invalid");
  });

  it("parses YouTube ISO-8601 durations", () => {
    assert.equal(parseIso8601Duration("PT8M40S"), 520);
    assert.equal(parseIso8601Duration("PT6M"), 360);
    assert.equal(parseIso8601Duration("PT7M"), 420);
    assert.equal(parseIso8601Duration("PT1H2M3S"), 3723);
    assert.equal(parseIso8601Duration("PT33S"), 33);
    assert.equal(parseIso8601Duration("nope"), null);
  });

  it("blocks publish when a film is over the ceiling or missing", () => {
    assert.equal(MAX_FILM_SECONDS, 360);
    assert.equal(
      firstFilmPublishError([{ duration_seconds: 420, video_url: "https://youtu.be/abc" }]),
      filmOverageMessage(420)
    );
    assert.equal(
      firstFilmPublishError([{ duration_seconds: null, video_url: "https://youtu.be/abc" }]),
      FILM_RUNTIME_MISSING
    );
    assert.equal(
      firstFilmPublishError([{ duration_seconds: 180, video_url: "https://youtu.be/abc" }]),
      null
    );
  });

  it("allows storing an over-length runtime only as a backfill", () => {
    assert.equal(canStoreOverLengthDuration(420, null), true);
    assert.equal(canStoreOverLengthDuration(596, 520), true);
    assert.equal(canStoreOverLengthDuration(420, 180), false);
    assert.equal(canStoreOverLengthDuration(180, 180), true);
  });
});

describe("youtube embed", () => {
  it("uses youtube-nocookie with captions on and no autoplay", () => {
    const embed = youtubeEmbedUrl("https://www.youtube.com/watch?v=aqz-KE-bpKQ", {
      startSeconds: 190,
      language: "en",
    });
    assert.ok(embed);
    const url = new URL(embed ?? "");
    assert.equal(url.hostname, "www.youtube-nocookie.com");
    assert.equal(url.searchParams.get("rel"), "0");
    assert.equal(url.searchParams.get("modestbranding"), "1");
    assert.equal(url.searchParams.get("playsinline"), "1");
    assert.equal(url.searchParams.get("cc_load_policy"), "1");
    assert.equal(url.searchParams.get("cc_lang_pref"), "en");
    assert.equal(url.searchParams.get("start"), "190");
    assert.equal(url.searchParams.get("autoplay"), null);
  });
});
