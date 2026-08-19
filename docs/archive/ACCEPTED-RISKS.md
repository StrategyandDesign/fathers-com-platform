# Accepted-risk register
AUDIT-V42 PL-8. Written down so nothing is discovered twice. Each entry names
the risk, why it is acceptable now, and the clean fix later.

1. A participant can read his own quiz_responses.correct between attempts,
so across the three-attempt hourly budget he can map which answers were
wrong. Acceptable in a facilitator-supported course with the retry flag firing at
twelve attempts course-wide. Clean fix later: a participant view of
quiz_responses without the correct column.

2. When a facility network blocks the Vimeo SDK, the player cannot report
progress and no button can honestly complete a session, because the server
credits measured playback only. The fallback now says so plainly and points
the man to his facilitator and the IT desk to the network requirements
sheet. The allow-list in docs/NETWORK-REQUIREMENTS.md is the real fix.

3. Serials are generated with crypto randomness over a Crockford alphabet,
roughly a billion-value space, collision-checked at signing. Fine at pilot
scale and beyond; revisit only if issuance volume changes the math.

4. The transactional email set is built and the send-email function exists
in the repo, but no sender key is configured. The two retention-critical
templates (missed week, certificate issued) go live when the Resend key is
set as a function secret; until then the platform degrades gracefully and
the facilitator's absence list carries the retention load.
