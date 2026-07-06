# Fathers.com email templates (Resend)

Nine templates on one skeleton. Bone surface, ink text, one ember button per email. Table-based with inline CSS for client compatibility. Each file carries a hidden preheader with the preview text. Subjects and previews live in `manifest.json`.

## Send discipline
Default cadence is one weekly plan email plus event-triggered messages. Never more than two sends in any seven days without an explicit user setting.

## Placeholders
Replace at send time: `{{LOGO_URL}}` (hosted logomark-dark.png), `{{ORG_ADDRESS}}`, `{{UNSUBSCRIBE_URL}}`, `{{PREFS_URL}}`, plus per-template merge fields (`{{BASELINE}}`, `{{FROM_NAME}}`, `{{GIFT_MESSAGE}}`, URLs). Image slots inside templates are placeholder blocks mapped to the Appendix A registry (IMG-P13-*).

## Sending with Resend
1. Verify your domain in Resend and set DKIM/SPF.
2. Set the API key as a Supabase secret: `supabase secrets set RESEND_API_KEY=re_...`
3. Deploy the function: `supabase functions deploy send-email`
4. Call it:
```
curl -X POST https://YOUR-PROJECT.functions.supabase.co/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"to":"father@example.com","template":"03-missed-week","data":{"PLAN_URL":"https://fathers.com/plan"}}'
```
The function fills placeholders from `data` and posts to the Resend API. Templates 1 and 3 ship inlined in the function; paste the rest in or fetch them from storage.
