import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { trainingContinueHref, trainingDoorHref } from "../lib/father/training-door";
import {
  hostedVideoEmbed,
  parseHostedVideo,
  vimeoVideoRef,
} from "../lib/media/hosted-video";

describe("hosted overview video", () => {
  it("accepts YouTube and Vimeo links", () => {
    assert.deepEqual(parseHostedVideo("https://www.youtube.com/watch?v=aqz-KE-bpKQ"), {
      kind: "youtube",
      id: "aqz-KE-bpKQ",
    });
    assert.deepEqual(parseHostedVideo("https://vimeo.com/123456789"), {
      kind: "vimeo",
      id: "123456789",
    });
    assert.deepEqual(vimeoVideoRef("https://player.vimeo.com/video/123456789?h=abc123"), {
      kind: "vimeo",
      id: "123456789",
      hash: "abc123",
    });
    assert.equal(parseHostedVideo("https://example.com/watch"), null);
  });

  it("embeds Vimeo without autoplay and with DNT", () => {
    const embed = hostedVideoEmbed("https://vimeo.com/123456789/unlistedhash");
    assert.ok(embed);
    const url = new URL(embed ?? "");
    assert.equal(url.hostname, "player.vimeo.com");
    assert.equal(url.pathname, "/video/123456789");
    assert.equal(url.searchParams.get("dnt"), "1");
    assert.equal(url.searchParams.get("h"), "unlistedhash");
    assert.equal(url.searchParams.get("autoplay"), null);
  });

  it("embeds YouTube through the same hosted helper", () => {
    const embed = hostedVideoEmbed("https://youtu.be/aqz-KE-bpKQ", { language: "he" });
    assert.ok(embed);
    const url = new URL(embed ?? "");
    assert.equal(url.hostname, "www.youtube-nocookie.com");
    assert.equal(url.pathname, "/embed/aqz-KE-bpKQ");
    assert.equal(url.searchParams.get("hl"), "he");
  });

  it("opens the overview door when a film is posted", () => {
    const training = {
      id: "t1",
      overview_video_url: "https://youtu.be/aqz-KE-bpKQ",
    };
    const next = {
      id: "s1",
      training_id: "t1",
      session_number: 1,
      title: "Session 1",
      keyline: null,
      video_url: null,
      order_index: 0,
    };

    assert.equal(trainingDoorHref({ training, next, nextProgress: null }), "/father/trainings/t1");
    assert.equal(
      trainingDoorHref({
        training: { id: "t1", overview_video_url: null },
        next,
        nextProgress: null,
      }),
      "/father/sessions/s1"
    );
    assert.equal(
      trainingContinueHref({ training, next, nextProgress: null, completed: 0 }),
      "/father/trainings/t1"
    );
    assert.equal(
      trainingContinueHref({
        training,
        next,
        nextProgress: {
          id: "p1",
          father_id: "f1",
          session_id: "s1",
          film_completed: true,
          checkin_completed: false,
          action_completed: false,
          checkin_answers: {},
          action_note: null,
          session_note: null,
          film_seconds: 12,
          status: "in_progress",
          completed_at: null,
        },
        completed: 0,
      }),
      "/father/sessions/s1/checkin"
    );
  });
});
