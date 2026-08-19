#!/usr/bin/env python3
"""Render og.png (1200x630) for the POIDH Contact Sheet.

Built from geometry + text only — no photographs. The "developed" frames are
abstract darkroom tones, deliberately not fake proof images: this is a brand
card, and it must not imply data it does not have.

Palette is lifted verbatim from the app's CSS tokens so the card and the page
are the same object.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random

W, H = 1200, 630
INK       = (0x0E, 0x0D, 0x0B)
SHEET     = (0x16, 0x13, 0x0F)
REBATE    = (0x2B, 0x26, 0x20)
REBATE_HI = (0x3D, 0x36, 0x2C)
SILVER    = (0xEC, 0xE6, 0xDA)
LATENT    = (0x4A, 0x44, 0x3A)
AMBER     = (0xE9, 0xA8, 0x3C)
CYAN      = (0x46, 0xB7, 0xC2)
CYAN_DIM  = (0x1E, 0x5A, 0x61)
BLEACH    = (0x8A, 0x5A, 0x4E)
MUTED     = (0x8B, 0x82, 0x74)

MONO   = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_B = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
SANS   = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f = lambda p, s: ImageFont.truetype(p, s)

random.seed(20260818)   # deterministic output: same bytes on every run

img = Image.new("RGB", (W, H), INK)
d = ImageDraw.Draw(img)

# ---------------------------------------------------------------- backdrop
# A very soft top-left safelight glow, built by hand so there is no gradient
# library dependency.
glow = Image.new("L", (W // 6, H // 6), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse([-40, -60, 150, 90], fill=90)
glow = glow.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(60))
img.paste(Image.new("RGB", (W, H), (0x24, 0x1C, 0x10)), (0, 0), glow)
d = ImageDraw.Draw(img)


def tracked(draw, xy, text, font, fill, tracking=0):
    """Draw text with extra letter-spacing (film rebate printing)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x - xy[0]


def tracked_width(draw, text, font, tracking=0):
    return sum(draw.textlength(c, font=font) + tracking for c in text) - tracking


# ---------------------------------------------------------------- filmstrip
# Geometry note: the frame numbers print on the lower rebate, so the strip has
# to be tall enough for image area + number line + sprocket row without any of
# them touching. Measured clearances: 18px above the numbers, 24px below.
STRIP_TOP, STRIP_H = 278, 282
d.rectangle([0, STRIP_TOP, W, STRIP_TOP + STRIP_H], fill=SHEET)
d.line([0, STRIP_TOP, W, STRIP_TOP], fill=REBATE, width=2)
d.line([0, STRIP_TOP + STRIP_H, W, STRIP_TOP + STRIP_H], fill=REBATE, width=2)

# sprocket holes along both edges of the strip
def sprockets(y):
    x = 16
    while x < W - 10:
        d.rounded_rectangle([x, y, x + 15, y + 11], radius=2, fill=REBATE_HI)
        x += 30
sprockets(STRIP_TOP + 8)
sprockets(STRIP_TOP + STRIP_H - 22)

# frames: (state, tone) — 3 developed, 2 unexposed, 1 paid, 1 cancelled
FRAMES = [
    ("developed", CYAN),
    ("latent",    None),
    ("developed", AMBER),
    ("paid",      CYAN),
    ("latent",    None),
    ("developed", (0x9A, 0x84, 0x5E)),
    ("cancelled", None),
]
GAP, FX0 = 14, 22
FW = (W - FX0 * 2 - GAP * (len(FRAMES) - 1)) // len(FRAMES)
FY, FH = STRIP_TOP + 34, STRIP_H - 100

for i, (state, tone) in enumerate(FRAMES):
    x0 = FX0 + i * (FW + GAP)
    box = [x0, FY, x0 + FW, FY + FH]

    if state == "latent" or state == "cancelled":
        d.rectangle(box, fill=(0x1D, 0x19, 0x13))
        # dashed border = an exposure that has not happened yet
        step, dash, xx = 12, 7, x0
        edge = BLEACH if state == "cancelled" else LATENT
        while xx < box[2]:
            d.line([xx, box[1], min(xx + dash, box[2]), box[1]], fill=edge, width=2)
            d.line([xx, box[3], min(xx + dash, box[2]), box[3]], fill=edge, width=2)
            xx += step
        yy = box[1]
        while yy < box[3]:
            d.line([box[0], yy, box[0], min(yy + dash, box[3])], fill=edge, width=2)
            d.line([box[2], yy, box[2], min(yy + dash, box[3])], fill=edge, width=2)
            yy += step
        cap = "NO PROOF" if state == "latent" else "CANCELLED"
        fs = f(MONO, 12)
        wd = tracked_width(d, cap, fs, 2)
        tracked(d, (x0 + (FW - wd) / 2, FY + FH / 2 - 8), cap, fs,
                BLEACH if state == "cancelled" else LATENT, 2)
    else:
        # abstract "developed" tone: banded silver-gelatin wash, not a photo
        tile = Image.new("RGB", (FW, FH), (0x12, 0x10, 0x0D))
        td = ImageDraw.Draw(tile)
        base = tone
        for b in range(9):
            t = b / 8.0
            k = 0.16 + 0.62 * (1 - abs(t - 0.42) * 1.7)
            k = max(0.06, k)
            col = tuple(int(INK[c] + (base[c] - INK[c]) * k) for c in range(3))
            td.rectangle([0, int(FH * t), FW, int(FH * (t + 0.14))], fill=col)
        td.ellipse([FW * 0.18, FH * 0.2, FW * 0.82, FH * 0.78],
                   fill=tuple(min(255, int(c * 0.55) + 22) for c in base))
        tile = tile.filter(ImageFilter.GaussianBlur(5))
        # grain
        px = tile.load()
        for _ in range(FW * FH // 10):
            gx, gy = random.randrange(FW), random.randrange(FH)
            r, g, bl = px[gx, gy]
            n = random.randint(-18, 18)
            px[gx, gy] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, bl + n)))
        img.paste(tile, (x0, FY))
        d.rectangle(box, outline=REBATE_HI, width=1)
        if state == "paid":
            # keeper ring: the marker the app uses for a paid-out bounty
            cx, cy, r = box[2] - 26, box[1] + 26, 12
            d.arc([cx - r, cy - r, cx + r, cy + r], 20, 330, fill=CYAN, width=3)

    # frame number, printed on the lower rebate like a real contact sheet
    d.text((x0 + 1, FY + FH + 10), "#%d" % (4821 - i * 137), font=f(MONO, 12), fill=MUTED)

# ---------------------------------------------------------------- type
tracked(d, (FX0, 52), "POIDH  ·  BASE  ·  DEGEN  ·  ARBITRUM", f(MONO, 15), AMBER, 3.4)

title_f = f(SANS_B, 76)
d.text((FX0 - 2, 88), "POIDH Contact Sheet", font=title_f, fill=SILVER)

sub_f = f(SANS, 26)
d.text((FX0, 186), "Every bounty on one roll of film.", font=sub_f, fill=(0xB9, 0xB0, 0xA0))
d.text((FX0, 220), "Proof develops. No proof stays unexposed.", font=sub_f, fill=MUTED)

# The POIDH motto, right-aligned to balance the header. This is the project's
# own name expanded — not invented copy, and not a data claim.
# The rule sits at W-FX0; text is held 16px clear of it so the last glyph is
# never overdrawn (an earlier version clipped the final "T").
motto_f = f(MONO_B, 17)
RULE_X = W - FX0
for n, line in enumerate(("PROOF OR IT", "DIDN'T HAPPEN")):
    mw = tracked_width(d, line, motto_f, 4.2)
    tracked(d, (RULE_X - 16 - mw, 186 + n * 30), line, motto_f, (0x63, 0x5A, 0x4B), 4.2)
d.line([RULE_X, 182, RULE_X, 244], fill=AMBER, width=2)

# footer rebate line
foot_y = STRIP_TOP + STRIP_H + 26
tracked(d, (FX0, foot_y), "LIVE DATA · POIDH.XYZ/[CHAIN]/BOUNTY/[ID]/DATA",
        f(MONO, 13), MUTED, 2.6)
label = "ONE FILE · NO BUILD · NO BACKEND"
lw = tracked_width(d, label, f(MONO_B, 13), 2.6)
tracked(d, (W - FX0 - lw, foot_y), label, f(MONO_B, 13), CYAN, 2.6)

# ---------------------------------------------------------------- vignette
vig = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vig)
vd.rectangle([0, 0, W, H], fill=118)
vd.ellipse([-int(W * 0.18), -int(H * 0.34), int(W * 1.18), int(H * 1.34)], fill=0)
vig = vig.filter(ImageFilter.GaussianBlur(90))
img.paste(Image.new("RGB", (W, H), INK), (0, 0), vig)

img.save("/sessions/sharp-zealous-thompson/mnt/POIDH/og.png", optimize=True)
print("wrote og.png", img.size)
