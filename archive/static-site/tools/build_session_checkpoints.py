#!/usr/bin/env python3
"""Build assets/js/session-checkpoints-data.js from script-brief JSONs.

Reads /workspace/script-briefs/*.json when present, else content mirrors.
Emits checkpoint packs keyed by cert slug (fundamentals, reentry, anger, coparenting).
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_CONTENT_BRIEFS = ROOT / "content" / "script-briefs"
_WORKSPACE_BRIEFS = Path("/workspace/script-briefs")
BRIEFS = _CONTENT_BRIEFS if _CONTENT_BRIEFS.exists() else _WORKSPACE_BRIEFS
OUT = ROOT / "assets" / "js" / "session-checkpoints-data.js"

MAP = {
    "fundamentals": ("fathering-fundamentals.json", "fathering-fundamentals"),
    "reentry": ("coming-home-present.json", "coming-home-present"),
    "anger": ("steady-under-pressure.json", "steady-under-pressure"),
    "coparenting": ("same-team.json", "same-team"),
}


def synth_ff_questions(sess: dict) -> list:
    num = sess.get("number")
    crafted = {
        0: [
            {
                "prompt": "What should you do before the First Secret sessions?",
                "choices": [
                    "Skip the assessment and jump to Session 1",
                    "Watch the overview and take the free assessment",
                    "Wait until you finish all seven secrets",
                ],
                "correct_index": 1,
            },
            {
                "prompt": "What is this course built on?",
                "choices": [
                    "Guesswork about fathering",
                    "Dr. Ken Canfield's research-based Seven Secrets",
                    "Advice from one dad's childhood",
                ],
                "correct_index": 1,
            },
            {
                "prompt": "Why take the assessment first?",
                "choices": [
                    "So growth targets are personal, not generic",
                    "So you can skip hard sessions",
                    "So the course can grade your child",
                ],
                "correct_index": 0,
            },
        ],
        1: [
            {
                "prompt": "What does the First Secret treat as essential?",
                "choices": [
                    "Being present physically, emotionally, and spiritually",
                    "Winning every argument at home",
                    "Providing money without being present",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "What does commitment build, per this session?",
                "choices": [
                    "Fear of consequences",
                    "Trust and lasting influence",
                    "A perfect schedule",
                ],
                "correct_index": 1,
            },
            {
                "prompt": "Which practice matches.",
                "choices": [
                    "Name one physical, one emotional, and one spiritual way you will show up this week",
                    "Buy a bigger gift",
                    "Avoid hard conversations",
                ],
                "correct_index": 0,
            },
        ],
        2: [
            {
                "prompt": "What opens deeper connection in the Second Secret?",
                "choices": [
                    "Knowing your child's unique personality, needs, and interests",
                    "Comparing them to siblings",
                    "Waiting until they are older",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "Knowing your child means mainly:",
                "choices": [
                    "Tracking grades only",
                    "Entering their world so they feel seen",
                    "Correcting them faster",
                ],
                "correct_index": 1,
            },
            {
                "prompt": "A practical move for this secret is to:",
                "choices": [
                    "Write a current profile of the child, with the mother or caregiver if that channel is safe",
                    "Assume you already know them",
                    "Lead with advice before listening",
                ],
                "correct_index": 0,
            },
        ],
        3: [
            {
                "prompt": "What does Showing Up Consistently create?",
                "choices": [
                    "Occasional big surprises",
                    "Stability through consistent actions, values, and discipline",
                    "Flexibility with no patterns",
                ],
                "correct_index": 1,
            },
            {
                "prompt": "Consistency here is mainly about:",
                "choices": [
                    "Keeping a rhythm your child can count on",
                    "Never changing plans",
                    "Being perfect every day",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "If you must miss a standing time, the strong move is:",
                "choices": [
                    "Skip quietly",
                    "Tell the caregiver or the plan ahead, name the new time, and keep it",
                    "Make it up with a gift only",
                ],
                "correct_index": 1,
            },
        ],
        4: [
            {
                "prompt": "Protecting and Providing Security covers:",
                "choices": [
                    "Physical, emotional, and spiritual safety and provision",
                    "Only financial provision",
                    "Only physical safety",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "Security for a child often feels like:",
                "choices": [
                    "Unpredictable intensity",
                    "A father who keeps them safe and provided for across those dimensions",
                    "Strict silence about hard topics",
                ],
                "correct_index": 1,
            },
            {
                "prompt": "A practical focus this week is:",
                "choices": [
                    "Name one way you will protect or provide security this week",
                    "Wait for a crisis",
                    "Outsource all protection",
                ],
                "correct_index": 0,
            },
        ],
        5: [
            {
                "prompt": "This secret still applies when you are not a couple. What does it require?",
                "choices": [
                    "Honor her in how you speak. Never undercut her.",
                    "Win the breakup.",
                    "Pretend you are a couple again.",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "Why does this secret exist?",
                "choices": [
                    "Children should not have to choose a side or hear you tear her down.",
                    "So you look generous.",
                    "So she likes you more.",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "Which practice matches this session?",
                "choices": [
                    "One sentence you will not say, and one civil child-only note if the channel is safe",
                    "A speech about the past",
                    "Ask the child to carry a message to her",
                ],
                "correct_index": 0,
            },
        ],
        6: [
            {
                "prompt": "Active listening means:",
                "choices": [
                    "Two-way, full attention, not an interrogation",
                    "Getting the last word",
                    "Asking until they confess",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "The usual rival for your attention is:",
                "choices": [
                    "The phone",
                    "Their grades",
                    "The coparent",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "After they talk, the strong move is to:",
                "choices": [
                    "Say back what you heard",
                    "Give advice immediately",
                    "Change the subject",
                ],
                "correct_index": 0,
            },
        ],
        7: [
            {
                "prompt": "Spiritual equipping here means:",
                "choices": [
                    "Grounded convictions you live",
                    "A required class you sit through",
                    "Telling your child what to believe",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "What do kids actually watch?",
                "choices": [
                    "What you live",
                    "What you say you believe",
                    "How often you attend a meeting",
                ],
                "correct_index": 0,
            },
            {
                "prompt": "Which practice matches this session?",
                "choices": [
                    "One conviction lived in the open this week",
                    "Sign up for a group this week",
                    "Hide what you believe",
                ],
                "correct_index": 0,
            },
        ],
    }
    if num in crafted:
        return crafted[num]
    title = sess.get("title") or "this session"
    keyline = (sess.get("keyline") or sess.get("practical_insight") or "").strip()
    purpose = (sess.get("purpose") or sess.get("summary") or "").strip()
    leave = (sess.get("what_you_leave_with") or sess.get("practice") or "").strip()
    return [
        {
            "prompt": f"What is the keyline of {title}?",
            "choices": [keyline or purpose[:80], "Ignore the session and wing it", "Wait until life is easier"],
            "correct_index": 0,
        },
        {
            "prompt": f"What is the purpose of {title}?",
            "choices": ["Skip the hard parts", purpose[:120] or keyline, "Finish without practice"],
            "correct_index": 1,
        },
        {
            "prompt": "What should you leave ready to do?",
            "choices": [leave or "Apply the session's practice this week", "Forget the session", "Only think about it later"],
            "correct_index": 0,
        },
    ]


def build() -> dict:
    pack = {}
    for cert, (brief_name, stills_dir) in MAP.items():
        path = BRIEFS / brief_name
        if not path.exists():
            raise SystemExit(f"Missing brief: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        sessions_out = {}
        for sess in data.get("sessions", []):
            num = sess.get("number")
            if num is None:
                continue
            qs = sess.get("checkpoint_questions") or []
            if not qs:
                qs = synth_ff_questions(sess)
            norm = []
            for q in qs:
                norm.append(
                    {
                        "prompt": q["prompt"],
                        "choices": list(q["choices"]),
                        "correct_index": int(q["correct_index"]),
                        "feedback": q.get("feedback") or "",
                    }
                )
            still = f"assets/img/session-stills/{stills_dir}/s{int(num):02d}.png"
            video_url = None
            if cert == "anger" and int(num) == 1:
                video_url = "assets/video/steady/surge-is-a-signal-fluid.mp4"
            sessions_out[str(int(num))] = {
                "ord": int(num),
                "title": sess.get("title") or "",
                "keyline": sess.get("keyline") or sess.get("practical_insight") or "",
                "still": still,
                "video_url": video_url,
                "questions": norm,
            }
        pack[cert] = {
            "slug": cert,
            "title": data.get("short_title") or data.get("title") or cert,
            "stills_dir": stills_dir,
            "sessions": sessions_out,
        }
    return pack


def main() -> None:
    pack = build()
    payload = json.dumps(pack, indent=2, ensure_ascii=False)
    OUT.write_text(
        "/* Generated from script-brief JSONs. Rebuild: python3 tools/build_session_checkpoints.py */\n"
        "window.FC_SESSION_CHECKPOINTS = "
        + payload
        + ";\n",
        encoding="utf-8",
    )
    print("wrote", OUT)
    for slug, course in pack.items():
        print(f"  {slug}: {len(course['sessions'])} sessions")


if __name__ == "__main__":
    main()
