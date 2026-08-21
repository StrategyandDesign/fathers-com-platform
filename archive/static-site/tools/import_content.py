#!/usr/bin/env python3
"""Content importer (AUDIT-V41 WP-J): one JSON per course -> live course.

Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 tools/import_content.py content/<course>.json [--create] [--allow-placeholders] [--check]

  --check              validate only; touches nothing, needs no keys
  --allow-placeholders accept duration_seconds 0 and vimeo "pending" for
                       staging the full flow before films land; checkpoints
                       and finals are still required in full

Validates hard, then upserts certificate_courses, course_videos,
quiz_questions, and final_qa_questions via the service key from env.
The service key never enters git and never ships to a client.
"""
import json, os, re, sys, urllib.request

BANNED = ["verified instructional hours", "verified hours", "temper, trained",
          "recidivism overlay", "collection overlay", "outcome overlays",
          "normed on thousands", "normed against", "benchmarked against",
          "the national norm", "published norms", "established norms", "proctored"]


def normalize_doc(doc):
    """Accept sessions[] (Seven Secrets shape) or videos[]; map video_url -> vimeo."""
    if not doc.get("videos") and doc.get("sessions"):
        doc = dict(doc)
        doc["videos"] = doc["sessions"]
    vids = []
    for v in doc.get("videos") or []:
        v = dict(v)
        if not v.get("vimeo"):
            ref = v.get("video_url")
            v["vimeo"] = "pending" if ref in (None, "", False) else str(ref)
        vids.append(v)
    doc = dict(doc)
    doc["videos"] = vids
    if doc.get("hours") is None:
        dur = sum(int(v.get("duration_seconds") or 0) for v in vids)
        doc["hours"] = round(dur / 3600.0, 1) if dur else 0
    return doc

def die(msg):
    print(f"FAIL: {msg}"); sys.exit(1)

def validate(doc, path, allow_placeholders=False):
    errs = []
    if not doc.get("slug"): errs.append("slug missing")
    if not doc.get("title"): errs.append("title missing")
    vids = doc.get("videos") or []
    if not vids: errs.append("videos empty")
    ords = set()
    for i, v in enumerate(vids, 1):
        where = f"videos[{i}]"
        d = v.get("duration_seconds")
        if allow_placeholders:
            if not isinstance(d, (int, float)) or d < 0:
                errs.append(f"{where}: duration_seconds must be a number (0 allowed with --allow-placeholders)")
        else:
            if not isinstance(d, (int, float)) or d <= 0:
                errs.append(f"{where}: duration_seconds must be present and > 0 (no film, no row; stage with --allow-placeholders)")
            if not v.get("vimeo") or str(v.get("vimeo")) == "pending":
                errs.append(f"{where}: vimeo ref missing")
        if v.get("ord") in ords: errs.append(f"{where}: duplicate ord {v.get('ord')}")
        ords.add(v.get("ord"))
        cps = v.get("checkpoint") or []
        if len(cps) < 3: errs.append(f"{where}: checkpoint needs >= 3 questions (5 recommended); 80 percent of 2 is perfection")
        for j, q in enumerate(cps, 1):
            ch = q.get("choices") or []
            if not (2 <= len(ch) <= 5): errs.append(f"{where}.checkpoint[{j}]: 2-5 choices required")
            ci = q.get("correct_index")
            if not isinstance(ci, int) or not (0 <= ci < len(ch)): errs.append(f"{where}.checkpoint[{j}]: correct_index out of range")
            blob = (q.get("prompt", "") + " " + " ".join(ch)).lower()
            hits = [b for b in BANNED if b in blob]
            if hits: errs.append(f"{where}.checkpoint[{j}]: banned claim strings {hits}; course content obeys the same law as pages")
    if not (doc.get("final_qa") or []): errs.append("final_qa empty")
    for j, q in enumerate(doc.get("final_qa") or [], 1):
        if not (q.get("prompt") or "").strip(): errs.append(f"final_qa[{j}]: prompt empty")
        hits = [b for b in BANNED if b in q.get("prompt", "").lower()]
        if hits: errs.append(f"final_qa[{j}]: banned claim strings {hits}")
    if errs:
        for e in errs: print(f"  - {path}: {e}")
        die(f"{len(errs)} validation error(s)")

def rest(url, key, method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{url}/rest/v1/{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})})
    with urllib.request.urlopen(req) as r:
        t = r.read().decode()
        return json.loads(t) if t else None

def main():
    if len(sys.argv) < 2: die("usage: import_content.py content/<course>.json [--create]")
    path = sys.argv[1]; create = "--create" in sys.argv
    allow_placeholders = "--allow-placeholders" in sys.argv
    check_only = "--check" in sys.argv
    doc = normalize_doc(json.load(open(path)))
    validate(doc, path, allow_placeholders)
    if check_only:
        print(f"OK: {path} validates ({len(doc['videos'])} videos, {sum(len(v.get('checkpoint') or []) for v in doc['videos'])} checkpoint questions, {len(doc['final_qa'])} final prompts)")
        return
    url = os.environ.get("SUPABASE_URL"); key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key: die("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env")
    slug = doc["slug"]
    rows = rest(url, key, "GET", f"certificate_courses?slug=eq.{slug}&select=id,slug")
    if not rows and not create: die(f"course slug {slug} not found; pass --create to create it")
    if not rows:
        hours = float(doc.get("hours") or 0)
        rows = rest(url, key, "POST", "certificate_courses", [{"slug": slug, "title": doc["title"], "hours": hours, "published": False}], prefer="return=representation")
    course_id = rows[0]["id"]
    hours = float(doc.get("hours") or 0)
    rest(url, key, "PATCH", f"certificate_courses?id=eq.{course_id}",
         {"title": doc["title"], "hours": hours})
    for v in doc["videos"]:
        vid = rest(url, key, "POST", "course_videos?on_conflict=course_id,ord",
                   [{"course_id": course_id, "ord": v["ord"], "title": v["title"],
                     "video_url": str(v.get("vimeo") or "pending"), "duration_seconds": v["duration_seconds"]}],
                   prefer="resolution=merge-duplicates,return=representation")[0]
        for j, q in enumerate(v.get("checkpoint") or [], 1):
            rest(url, key, "POST", "quiz_questions?on_conflict=video_id,ord",
                 [{"video_id": vid["id"], "ord": j, "prompt": q["prompt"],
                   "choices": q["choices"], "correct_index": q["correct_index"]}],
                 prefer="resolution=merge-duplicates")
    for j, q in enumerate(doc["final_qa"], 1):
        rest(url, key, "POST", "final_qa_questions?on_conflict=course_id,ord",
             [{"course_id": course_id, "ord": j, "prompt": q["prompt"]}],
             prefer="resolution=merge-duplicates")
    print(f"OK: {slug} imported ({len(doc['videos'])} videos). Publish it when every film is live:")
    print(f"    update certificate_courses set published = true where slug = '{slug}';")

if __name__ == "__main__":
    main()
