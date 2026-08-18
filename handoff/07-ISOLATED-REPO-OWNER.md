# Isolated repo — owner steps

The review copy is:

https://github.com/StrategyandDesign/fathers-com-clean-pilot

That repository is private. It has only the clean-pilot Next.js line. It is not `fathers-com-platform`, so inviting someone here does **not** show them `main` or the old platform.

## Invite the team

1. Open the isolated repo → **Settings → Collaborators → Add people**
2. Invite each engineer as **Write** (or **Read** if they should not push)
3. Send them only this repo URL, not `fathers-com-platform`

You need their GitHub usernames. This agent cannot send the invite without those names.

## If the isolated repo still looks empty

Cloud-agent git tokens can write `fathers-com-platform` only. The tree is loaded through GitHub’s user session (README + export unpack). If `app/` is missing after 10 minutes, run this **on your machine** while logged into GitHub as `StrategyandDesign`:

```bash
cd fathers-com-platform
git fetch origin cursor/clean-pilot-handoff-audit-7c78
git checkout cursor/clean-pilot-handoff-audit-7c78
git remote add clean-pilot-only https://github.com/StrategyandDesign/fathers-com-clean-pilot.git
git push -u clean-pilot-only cursor/clean-pilot-handoff-audit-7c78:main
```

That push overwrites isolated `main` with this internal branch. It still does **not** publish other `fathers-com-platform` branches.

## Message to send after `app/` exists

```text
Repo (clean-pilot only):
https://github.com/StrategyandDesign/fathers-com-clean-pilot

Clone:
git clone https://github.com/StrategyandDesign/fathers-com-clean-pilot.git

Start with handoff/00-SUBMISSION-GUIDE.md

This is the Next.js clean-pilot app for hardening.
It is not production. Do not use fathers-com-platform.vercel.app.
```
