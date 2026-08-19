import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCertificateDesk,
  isReadyForCertificate,
} from "../lib/manager/certificates-desk";
import type { Training } from "../lib/father/types";
import type { TrainingProgress } from "../lib/manager/types";

function training(id: string, title: string): Training {
  return {
    id,
    slug: id,
    title,
    description: null,
    session_count: 2,
    order_index: 1,
  };
}

function card(overrides: Partial<TrainingProgress> & Pick<TrainingProgress, "training">): TrainingProgress {
  return {
    sessions: [],
    completed: 0,
    total: 2,
    assigned: true,
    gated: false,
    skillsUsed: 0,
    certificate: null,
    current: null,
    ...overrides,
  };
}

describe("certificate desk", () => {
  it("marks a finished training without a certificate as ready to send", () => {
    const ready = card({
      training: training("t1", "Fathering Fundamentals"),
      completed: 2,
      total: 2,
    });
    assert.equal(isReadyForCertificate(ready), true);
    assert.equal(
      isReadyForCertificate(card({ training: training("t1", "Fathering Fundamentals"), completed: 1 })),
      false
    );
  });

  it("lists ready and issued rows, and stays empty when no one is ready", () => {
    const desk = buildCertificateDesk({
      participants: [
        { fatherId: "f1", name: "James" },
        { fatherId: "f2", name: "Marcus" },
      ],
      trainingProgressFor: (fatherId) => {
        if (fatherId === "f1") {
          return [
            card({
              training: training("t1", "Fathering Fundamentals"),
              completed: 2,
              total: 2,
              certificate: {
                id: "c1",
                father_id: "f1",
                training_id: "t1",
                serial_number: "NCF-1",
                issued_at: "2026-08-01T00:00:00Z",
                issued_by: "m1",
              },
            }),
          ];
        }
        return [
          card({
            training: training("t1", "Fathering Fundamentals"),
            completed: 1,
            total: 2,
          }),
        ];
      },
    });

    assert.equal(desk.ready.length, 0);
    assert.equal(desk.issued.length, 1);
    assert.equal(desk.issued[0]?.serial, "NCF-1");
  });
});
