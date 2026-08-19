#!/usr/bin/env python3
"""Partner kit print artifacts. URLs derive from SITE_URL in build_pages.py
(docs/DOMAIN.md). Output: partner-kit/dist/. Doctrine: POSITIONING.md 9 and 16;
the parent insert copy is asserted against the section 9 vocabulary ban."""
import re
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.lib.utils import ImageReader

REPO = Path(__file__).resolve().parents[1]
SITE_URL = re.search(r'SITE_URL\s*=\s*"([^"]+)"', (REPO / "archive/static-site/build_pages.py").read_text()).group(1)
HOST = SITE_URL.replace("https://", "").replace("http://", "")
PROFILE_URL, VERIFY_URL = SITE_URL + "/profile.html", SITE_URL + "/verify.html"
PROFILE_DISP, VERIFY_DISP = HOST + "/profile.html", HOST + "/verify.html"
LOGO = str(REPO / "assets/img/logomark-dark.png")
OUT = REPO / "partner-kit" / "dist"
OUT.mkdir(exist_ok=True)

COAL, ASH, BRASS, BONE = HexColor("#121212"), HexColor("#4A4A4A"), HexColor("#6B4F14"), HexColor("#F5F1E8")
W, H = letter
M = 0.85 * inch

BANNED = ["rehab", "recovery", "treatment", "sobriety", "clinical", "patient",
          "inmate", "facility", "discharge"]
PARENT_COPY = []

def parent_text(s):
    PARENT_COPY.append(s)
    return s

def wrap(c, text, font, size, maxw):
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if c.stringWidth(trial, font, size) <= maxw:
            line = trial
        else:
            lines.append(line); line = word
    if line: lines.append(line)
    return lines

def para(c, text, x, y, maxw, font="Helvetica", size=10.5, leading=15, color=COAL):
    c.setFont(font, size); c.setFillColor(color)
    for ln in wrap(c, text, font, size, maxw):
        c.drawString(x, y, ln); y -= leading
    return y

def header(c, kicker):
    img = ImageReader(LOGO); iw, ih = img.getSize()
    h = 0.34 * inch; w = h * iw / ih
    c.drawImage(img, M, H - M - h + 4, width=w, height=h, mask="auto")
    c.setFont("Helvetica-Bold", 10); c.setFillColor(COAL)
    c.drawString(M + w + 8, H - M - 6, "FATHERS.COM")
    c.setFont("Helvetica", 8.5); c.setFillColor(ASH)
    c.drawRightString(W - M, H - M - 6, kicker)
    c.setStrokeColor(BRASS); c.setLineWidth(1.4)
    c.line(M, H - M - 16, W - M, H - M - 16)
    return H - M - 44

def section(c, y, title, body, size=10.5, leading=15):
    c.setFont("Helvetica-Bold", 8.5); c.setFillColor(BRASS)
    c.drawString(M, y, title.upper()); y -= 15
    return para(c, body, M, y, W - 2 * M, size=size, leading=leading) - 12

def qr_block(c, url, x, y, size=1.05 * inch):
    code = qr.QrCodeWidget(url); b = code.getBounds()
    d = Drawing(size, size, transform=[size / (b[2] - b[0]), 0, 0, size / (b[3] - b[1]), 0, 0])
    d.add(code); renderPDF.draw(d, c, x, y)

def footer(c, line1, line2):
    c.setStrokeColor(BRASS); c.setLineWidth(0.8)
    c.line(M, M + 26, W - M, M + 26)
    c.setFont("Helvetica", 8.5); c.setFillColor(ASH)
    c.drawString(M, M + 12, line1); c.drawString(M, M + 1, line2)

# Parent insert
c = canvas.Canvas(str(OUT / "parent-insert-keystone.pdf"), pagesize=letter)
c.setTitle("Know where you stand as a father"); c.setAuthor("National Center for Fathering")
y = header(c, parent_text("A free tool from the National Center for Fathering"))
c.setFont("Helvetica-Bold", 25); c.setFillColor(COAL)
c.drawString(M, y, parent_text("Know where you stand as a father.")); y -= 22
c.setFont("Helvetica", 11); c.setFillColor(ASH)
c.drawString(M, y, parent_text("Free. Private. About twenty minutes. Built by the National Center for Fathering since 1990.")); y -= 30
y = section(c, y, "What this is", parent_text(
    "The Keystone Profile. About 40 questions on your phone. You get your score on the four "
    "things that matter: Involvement. Consistency. Awareness. Nurturance. Then you get a "
    "twelve-week plan built for you, one clear step at a time."))
y = section(c, y, "What it costs", parent_text(
    "Nothing. The Profile is free. The plan is free. The courses are free to the man who "
    "takes them. That will not change."))
y = section(c, y, "Private", parent_text(
    "Your results are yours. We never share them. You decide who sees anything."))
y = section(c, y, "The Certificate of Completion", parent_text(
    "Finish a course and you earn a Certificate of Completion. It carries logged sessions, "
    "checkpoints passed, a final at eighty percent, and a serial number. Any court, program, "
    "or employer you choose can confirm it online in ten seconds. It is proof you did the work."))
y = section(c, y, "Course seats", parent_text(
    "Course seats are placed through organizations and leaders certified by the National "
    "Center for Fathering, at no cost to you. Ask the person who gave you this page."))
box_top, box_h = y - 4, 1.5 * inch
c.setFillColor(BONE); c.rect(M, box_top - box_h, W - 2 * M, box_h, stroke=0, fill=1)
qx, qy = M + 0.25 * inch, box_top - box_h + 0.22 * inch
qr_block(c, PROFILE_URL, qx, qy)
tx = qx + 1.35 * inch
c.setFont("Helvetica-Bold", 13); c.setFillColor(COAL)
c.drawString(tx, box_top - 0.42 * inch, parent_text("Start tonight."))
c.setFont("Helvetica", 10.5)
c.drawString(tx, box_top - 0.62 * inch, parent_text("Scan the code or type the address. Make your"))
c.drawString(tx, box_top - 0.80 * inch, parent_text("free account. Take the Profile."))
c.setFont("Helvetica-Bold", 10); c.setFillColor(BRASS)
c.drawString(tx, box_top - 1.05 * inch, PROFILE_DISP)
footer(c, parent_text("Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit."),
       parent_text("Presence is a skill. Train it."))
c.showPage(); c.save()

joined = " ".join(PARENT_COPY).lower()
hits = [b for b in BANNED if b in joined]
assert not hits, f"Section 9 vocabulary ban violated on the parent insert: {hits}"

# Caseworker one-pager
c = canvas.Canvas(str(OUT / "caseworker-onepager-certificate.pdf"), pagesize=letter)
c.setTitle("Verifiable evidence of a father's work"); c.setAuthor("National Center for Fathering")
y = header(c, "For caseworkers, parent counsel, attorneys ad litem, CASA, and court staff")
c.setFont("Helvetica-Bold", 22); c.setFillColor(COAL)
c.drawString(M, y, "Verifiable evidence of a father's work."); y -= 20
c.setFont("Helvetica", 10.5); c.setFillColor(ASH)
c.drawString(M, y, "A fatherhood course a parent completes at zero cost, closed by a certificate any court can confirm online."); y -= 26
y = section(c, y, "The structure",
    "The National Center for Fathering certifies organizations (serial NCF-O-2026-####) and "
    "facilitators (serial NCF-F-2026-####). A Certified Facilitator passes training, an exam, "
    "and a supervised first cohort, renews annually, and appears on a public registry with "
    "revocation. The man who completes a course earns a Certificate of Completion.", 9.8, 13.5)
y = section(c, y, "What the certificate contains",
    "Sessions logged. Checkpoints passed. A written final reviewed by his facilitator, passed "
    "at eighty percent. A serial in the format FC-2026-######. Signed by Dr. Ken Canfield and "
    "the leading Certified Facilitator.", 9.8, 13.5)
y = section(c, y, "Cost to the parent",
    "Zero, ever. The Keystone Profile, the twelve-week plan, the courses, and the Certificate "
    "of Completion are free to the participant. Organizations pay for certification. "
    "Sponsorship funds seats.", 9.8, 13.5)
y = section(c, y, "Privacy posture",
    "No clinical information is stored on the platform. The certificate and the public "
    "verification page never name the referring organization. The account belongs to the "
    "man and stays with him. Built for residential and recovery, reentry and alternative "
    "sentencing, and court and probation settings.", 9.8, 13.5)
c.setFont("Helvetica-Bold", 8.5); c.setFillColor(BRASS)
c.drawString(M, y, "SUGGESTED CASE PLAN LANGUAGE"); y -= 12
quote = ('"Complete a fatherhood course led by a National Center for Fathering Certified '
         'Facilitator, evidenced by a Certificate of Completion. Verification: enter the '
         f'certificate serial at {VERIFY_DISP}."')
lines = wrap(c, quote, "Helvetica-Oblique", 9.8, W - 2 * M - 0.5 * inch)
bx_h = len(lines) * 13.5 + 20
c.setFillColor(BONE); c.rect(M, y - bx_h, W - 2 * M, bx_h, stroke=0, fill=1)
ty = y - 16; c.setFont("Helvetica-Oblique", 9.8); c.setFillColor(COAL)
for ln in lines:
    c.drawString(M + 0.25 * inch, ty, ln); ty -= 13.5
y = y - bx_h - 16
c.setFont("Helvetica-Bold", 8.5); c.setFillColor(BRASS)
c.drawString(M, y, "VERIFY IN TEN SECONDS")
c.drawString(M + (W - 2 * M) / 2 + 10, y, "REFER A FATHER TODAY"); y -= 14
col_w = (W - 2 * M) / 2 - 20
qr_block(c, VERIFY_URL, M, y - 0.95 * inch, size=0.9 * inch)
para(c, "Enter the serial. No login, no account. Status is always shown, including suspended and revoked.",
     M + 0.9 * inch + 12, y - 8, col_w - 0.9 * inch - 12, size=9.3, leading=12.5)
c.setFont("Helvetica-Bold", 8); c.setFillColor(BRASS)
c.drawString(M, y - 0.95 * inch - 13, VERIFY_DISP)
rx = M + (W - 2 * M) / 2 + 10
qr_block(c, PROFILE_URL, rx, y - 0.95 * inch, size=0.9 * inch)
para(c, "Send him to the free Keystone Profile now. Course seats are placed by Certified Facilitators at Certified Organizations.",
     rx + 0.9 * inch + 12, y - 8, col_w - 0.9 * inch - 12, size=9.3, leading=12.5)
c.setFont("Helvetica-Bold", 8); c.setFillColor(BRASS)
c.drawString(rx, y - 0.95 * inch - 13, PROFILE_DISP)
footer(c, "To connect a father to a certified program, or to certify yours: Team@Fathers.com",
       "Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit. Helping fathers since 1990.")
c.showPage(); c.save()
# Facilitator quick start (one page)
c = canvas.Canvas(str(OUT / "facilitator-quickstart.pdf"), pagesize=letter)
c.setTitle("Certified Facilitator quick start"); c.setAuthor("National Center for Fathering")
y = header(c, "Certified Facilitator quick start")
c.setFont("Helvetica-Bold", 20); c.setFillColor(COAL)
c.drawString(M, y, "The facilitator is the retention product."); y -= 18
c.setFont("Helvetica", 9.8); c.setFillColor(ASH)
c.drawString(M, y, "In the attrition research, one facilitator ran nine courses with zero dropouts. This is the rhythm that produces that."); y -= 24
y = section(c, y, "Before the cohort",
    "Claim every man by his sign-in email from your Desk; claims cost him nothing and unlock "
    "enrollment. Confirm materials and the room: same place, same hour, every week. Invite each "
    "man directly, by name. Named invitations outperform flyers.", 9.3, 12.6)
y = section(c, y, "Session one, the beats",
    "Greet each man by name at the door. Say the price out loud: the Profile, the plan, the "
    "course, and the Certificate are free to him, always. Every man starts or reviews his "
    "Keystone Profile; his gap domain becomes his plan. Each man states one commitment. "
    "Confirm next week before anyone leaves.", 9.3, 12.6)
y = section(c, y, "The weekly rhythm",
    "Open with wins; every man reports, no shame attached. Teach short; the session is for "
    "practice. Practice in pairs; men keep coming back for the men. Each man leaves with one "
    "step. Confirm attendance for next week before the room empties.", 9.3, 12.6)
y = section(c, y, "When a man misses",
    "Call him the same day. Not a text, a call. One question: what would make next week "
    "possible. Attendance recovers when absence is noticed within hours, not weeks.", 9.3, 12.6)
y = section(c, y, "The final and the ceremony",
    "He writes the final; you read it and approve. The certificate issues with his serial. "
    "Present it in front of the room, before program exit. The ceremony is curriculum.", 9.3, 12.6)
y = section(c, y, "Your desk",
    "Claims, cohort life, and the verification sheet live on the Facilitator Desk. The "
    "verification sheet is one download for any coordinator who requires proof.", 9.3, 12.6)
footer(c, "You lead education. You do not diagnose, counsel, or treat, and the credential never implies you do.",
       "Fathers.com is a program of the National Center for Fathering, a 501(c)(3) nonprofit.")
c.showPage(); c.save()

print("partner kit generated:", SITE_URL)
