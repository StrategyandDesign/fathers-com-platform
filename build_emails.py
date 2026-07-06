#!/usr/bin/env python3
"""Generates the nine Resend email templates plus manifest. Table-based, inline CSS, 600px."""
import json, os

SKELETON = '''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<title>{subject}</title></head>
<body style="margin:0;padding:0;background:#E9E3D7;font-family:Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">{preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9E3D7;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F4F0E8;border-radius:8px;">
<tr><td style="padding:32px 40px 0;"><img src="{{{{LOGO_URL}}}}" alt="Fathers.com" height="24" style="height:24px;"></td></tr>
<tr><td style="padding:28px 40px 36px;">
{body}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td style="padding:22px 40px;font-size:11px;line-height:1.6;color:#8a8378;">
Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit.<br>
PO Box 996, Tontitown, AR 72770 &nbsp;·&nbsp; <a href="{{{{UNSUBSCRIBE_URL}}}}" style="color:#8a8378;">Unsubscribe</a> &nbsp;·&nbsp; <a href="{{{{PREFS_URL}}}}" style="color:#8a8378;">Email settings</a>
</td></tr></table>
</td></tr></table>
</body></html>
'''

def h1(t): return f'<h1 style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:25px;line-height:1.2;color:#141210;">{t}</h1>'
def p(t, mb=18): return f'<p style="margin:0 0 {mb}px;font-size:15px;line-height:1.6;color:#3a352e;">{t}</p>'
def btn(t, url): return f'''<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#E86A3C;border-radius:6px;"><a href="{{{{{url}}}}}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:bold;color:#0A0A0A;text-decoration:none;">{t}</a></td></tr></table>'''
def slotimg(sid): return f'<div style="background:#1E1B18;border-radius:8px;padding:52px 12px;text-align:center;margin:0 0 18px;"><span style="font-family:Courier,monospace;font-size:11px;color:#6f6a62;">{sid}</span></div>'
def card(inner): return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D8D1C2;border-radius:8px;margin:0 0 14px;"><tr><td style="padding:16px 18px;">{inner}</td></tr></table>'
def mono(t): return f'<span style="font-family:Courier,monospace;">{t}</span>'

T = []

T.append(('01-welcome', 'Your baseline is saved.', 'Week 1 is ready when you are.',
  h1('Your baseline is saved.') +
  card(f'<span style="font-size:13px;color:#6b6257;">Presence Baseline</span><br><span style="font-family:Courier,monospace;font-size:32px;color:#141210;">{{{{BASELINE}}}}</span>') +
  p('Week 1 is ready when you are. One lesson, two actions, 25 minutes total.') +
  slotimg('IMG-P13-EM1-01 · Week 1 lesson') +
  btn('Start Week 1', 'PLAN_URL')))

T.append(('02-weekly-plan', 'Week 3: show up on schedule.', 'One lesson. Two actions.',
  h1('Week 3: show up on schedule.') +
  card('<b style="font-size:14px;color:#141210;">Watch: Lesson 5, Repair Fast</b><br><span style="font-size:13px;color:#6b6257;">9 minutes</span>') +
  card('<b style="font-size:14px;color:#141210;">Eat breakfast with your kids twice this week.</b><br><span style="font-size:12px;color:#6b6257;font-family:Courier,monospace;">CONSISTENCY</span>') +
  card('<b style="font-size:14px;color:#141210;">Ask each kid one question about their world. No fixing.</b><br><span style="font-size:12px;color:#6b6257;font-family:Courier,monospace;">AWARENESS</span>') +
  btn('Open My Plan', 'PLAN_URL')))

T.append(('03-missed-week', 'Week 4 is still on the table.', 'No lecture. Just the plan.',
  h1('Week 4 is still on the table.') +
  p('You went quiet last week. It happens.') +
  p('The plan does not care about perfect. It cares about next.') +
  p('Week 4 takes 25 minutes total.') +
  btn('Pick it back up', 'PLAN_URL')))

T.append(('04-gift-receipt', 'Your gift is set for June 21.', 'One year of Fathers.com, scheduled.',
  h1('Your gift is set for June 21.') +
  card('<b style="font-size:14px;color:#141210;">1 year of Fathers.com · $120</b><br><span style="font-size:13px;color:#6b6257;">To {{TO_NAME}}, from {{FROM_NAME}}<br>Delivers June 21 by email</span>') +
  p('Want to change the date or the message? <a href="{{EDIT_URL}}" style="color:#C2502D;">Edit your gift</a>.')))

T.append(('05-gift-delivery', '{{FROM_NAME}} sent you a year of Fathers.com.', 'Every class. Your baseline. Your plan.',
  h1('{{FROM_NAME}} sent you a year of Fathers.com.') +
  f'<p style="margin:0 0 22px;font-family:Helvetica,Arial,sans-serif;font-style:italic;font-size:18px;line-height:1.45;color:#3a352e;">&ldquo;{{{{GIFT_MESSAGE}}}}&rdquo;</p>' +
  btn('Claim it and take your baseline', 'REDEEM_URL') +
  p('No card required to redeem.', 0).replace('margin:0 0 0px','margin:16px 0 0')))

T.append(('06-renewal', 'Your membership renews March 4.', 'One year in. Here is the line.',
  h1('Your membership renews March 4.') +
  p('$120 for the year ahead. Your last year: 14 lessons. 11 actions. One chain.') +
  p('<a href="{{MANAGE_URL}}" style="color:#C2502D;">Manage your membership</a> &nbsp;·&nbsp; <a href="{{CANCEL_URL}}" style="color:#8a8378;">Cancel</a>')))

T.append(('07-win-back', 'New class: Raising Teens.', 'Built for the season you said you were in.',
  h1('New class: Raising Teens.') +
  slotimg('IMG-P13-EM7-01 · Raising Teens') +
  p('Built for the season you said you were in.') +
  btn('Come back', 'RETURN_URL') +
  p('Your baseline and notes are still saved.', 0).replace('margin:0 0 0px','margin:16px 0 0')))

T.append(('08-certificate-issued', 'Your certificate is ready. Serial FC-2026-004317.', 'Verified hours, checkable serial.',
  h1('Your certificate is ready.') +
  f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #B98A2F;border-radius:8px;margin:0 0 18px;"><tr><td style="padding:18px 20px;">' +
  f'<b style="font-size:14px;color:#141210;">Fathering Fundamentals Certificate</b><br>' +
  f'<span style="font-size:13px;color:#3a352e;">10.0 verified instructional hours · Issued June 2, 2026</span><br>' +
  f'<span style="font-family:Courier,monospace;font-size:13px;color:#141210;">SERIAL FC-2026-004317</span></td></tr></table>' +
  btn('Download PDF', 'CERT_PDF_URL') +
  p('Or send it straight to your officer or program: <a href="{{SEND_URL}}" style="color:#C2502D;">send the certificate</a>.', 12).replace('margin:0 0 12px','margin:16px 0 12px') +
  p(mono('Verify any time at fathers.com/verify'), 0)))

T.append(('09-leader-digest', 'Your Circle this week: 11 of 14 watched.', 'Friday digest for Circle leaders.',
  h1('Your Circle this week.') +
  card('<b style="font-size:14px;color:#141210;">11 of 14</b> <span style="font-size:13px;color:#6b6257;">watched the film</span>') +
  card('<b style="font-size:14px;color:#141210;">9 of 14</b> <span style="font-size:13px;color:#6b6257;">marked their action done</span>') +
  card('<b style="font-size:14px;color:#141210;">12 of 14</b> <span style="font-size:13px;color:#6b6257;">attended Tuesday</span>') +
  p('Next week: <b>Starting Over · Two Households</b>, 20 min.') +
  btn('Open the Leader Kit', 'KIT_URL')))

os.makedirs('emails', exist_ok=True)
manifest = []
for fid, subject, preview, body in T:
    html = SKELETON.format(subject=subject, preview=preview, body=body)
    with open(f'emails/{fid}.html', 'w') as f: f.write(html)
    manifest.append(dict(id=fid, file=f'{fid}.html', subject=subject, preview=preview))
    print('wrote', fid)
with open('emails/manifest.json', 'w') as f: json.dump(manifest, f, indent=2)
print('manifest written')
