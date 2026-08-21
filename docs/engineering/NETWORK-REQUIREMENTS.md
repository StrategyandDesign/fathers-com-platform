# Network Requirements Sheet
### For facility IT: the allow-list that makes Fathers.com work on a filtered network
Build-spec 2.3 Profile B deliverable. Version 1, 2026-08-11.

A facility that allow-lists the following domains, all on port 443 (HTTPS,
and WSS for the second entry), can run the full platform: assessment,
courses, checkpoints, and certificate verification.

| Purpose | Domain |
|---|---|
| The application | the deployment domain (currently fathers-com-platform.vercel.app; app.fathers.com when the canonical domain lands) |
| Data, auth, and functions | kemqpiboqeqhbuuldmls.supabase.co (HTTPS and WSS) |
| Session films (player) | player.vimeo.com |
| Session films (delivery) | *.vimeocdn.com |
| Type | fonts.googleapis.com, fonts.gstatic.com |

Nothing else is required. No third-party analytics, no ad networks, no
social embeds. If a proxy strips WebSockets, the platform still functions;
realtime features degrade silently.

Contact for IT questions: Team@Fathers.com.
