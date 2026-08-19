# Submit record

Official review copies are **even-numbered** and **date-stamped**.

Moving pushes that Micah and Eric share are numbered separately as **Shared 1, Shared 2, …** on `review`. See `SHARED.md`. Those marks do not freeze a submit and do not move `submit/2`.

For current engineering work, check out **`review`**. `submit/2` is the frozen official stamp and does not receive this repo-layout cleanup.

| Submit | Date (UTC) | Frozen branch | Issue | What it is |
|---|---|---|---|---|
| *(informal)* | 18 Aug 2026 | — | — | First share. No number. Do not use this as the review SHA. |
| **2** | 19 Aug 2026 | `submit/2` | [#1](https://github.com/StrategyandDesign/fathers-com-clean-pilot/issues/1) | First official submit. Clean-pilot Next.js app plus the seven UX refinements. |

Next official submit is **4**, then **6**, then **8**. Do not use odd numbers.

## How to take a submit

```bash
git clone https://github.com/StrategyandDesign/fathers-com-clean-pilot.git
cd fathers-com-clean-pilot
git fetch origin
git checkout submit/2
```

`review` moves as we iterate. `submit/2` stays put. When Submit 4 exists, check out `submit/4`.

## How the next submit is cut

1. Land the work on `review`.
2. Freeze it: create branch `submit/4` from that `review` tip.
3. Add a row to this table.
4. Open a GitHub issue titled `Submit 4 — YYYY-MM-DD` and assign Erik.
5. Email: “Submit 4 is on branch submit/4. Pull that branch.”

This repo is the review copy. It is not production. Do not use fathers-com-platform.vercel.app.
