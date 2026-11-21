"""Product photo cut-out and fitting for the Gloceries catalogue.

rembg removes the background; everything else (quality check, crop, scale,
centre, background fill, export) is Pillow. Output is always a 720x810 WebP
filled edge to edge with #F9FAFB: no transparency, border, shadow or glow.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, ImageDraw

FRAME_W, FRAME_H = 720, 810
BACKGROUND = (0xF9, 0xFA, 0xFB)
# Safe box every product is scaled to touch on its longer side (90% x 82.5%).
SAFE_W, SAFE_H = 648, 668
# Pixels at or below this alpha are leftover haze: ignored for the crop and dropped.
ALPHA_CUTOFF = 60
LOW_RES_SCALE = 2.0  # enlarging more than this still ships, flagged for review
MAX_SCALE = 3.0  # enlarging more than this is refused; the original stays
WEBP_QUALITY = 82

PRIMARY_MODEL = "isnet-general-use"
FALLBACK_MODEL = "birefnet-general"
# Never bria-rmbg: its weights are licensed for non-commercial use only.
ALLOWED_MODELS = (PRIMARY_MODEL, FALLBACK_MODEL)

# Quality check thresholds for a cut-out (alpha channel only).
MIN_COVERAGE, MAX_COVERAGE = 0.25, 0.90  # product bbox share of the whole image
MAX_SOFT_EDGE = 0.12  # semi-transparent pixels / opaque pixels
MAX_HOLES = 0.05  # enclosed see-through area / bbox area

REASON_CUTOUT = "cut-out quality"
REASON_LOW_RES = "low resolution"
REASON_TOO_SMALL = "too small"


@dataclass(frozen=True)
class Quality:
    ok: bool
    coverage: float
    soft_edge: float
    holes: float


@dataclass(frozen=True)
class Fit:
    """image is None only when the product is too small to enlarge."""
    image: Image.Image | None
    scale: float
    box: tuple[int, int, int, int] | None  # where the product landed: left, top, right, bottom
    reason: str | None  # None: ready to publish


def check_quality(cutout: Image.Image) -> Quality:
    alpha = cutout.convert("RGBA").getchannel("A")
    width, height = alpha.size
    bbox = alpha.point(lambda a: 255 if a > ALPHA_CUTOFF else 0).getbbox()
    if not bbox:
        return Quality(False, 0.0, 1.0, 1.0)
    left, top, right, bottom = bbox
    coverage = (right - left) * (bottom - top) / (width * height)

    histogram = alpha.histogram()
    opaque = sum(histogram[236:])
    soft = sum(histogram[21:236])
    soft_edge = soft / max(opaque, 1)

    # Holes: see-through pixels inside the product's box that the outside
    # cannot reach. Flood the transparent area from a 1px frame around the
    # box; whatever transparent pixels stay unflooded are enclosed.
    crop = alpha.crop(bbox).point(lambda a: 0 if a <= ALPHA_CUTOFF else 255)
    padded = Image.new("L", (crop.width + 2, crop.height + 2), 0)
    padded.paste(crop, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128)
    holes = padded.histogram()[0] / max(crop.width * crop.height, 1)

    ok = MIN_COVERAGE <= coverage <= MAX_COVERAGE and soft_edge <= MAX_SOFT_EDGE and holes <= MAX_HOLES
    return Quality(ok, round(coverage, 4), round(soft_edge, 4), round(holes, 4))


def fit(cutout: Image.Image) -> Fit:
    rgba = cutout.convert("RGBA")
    alpha = rgba.getchannel("A")
    # Drop faint leftovers so they neither widen the crop nor show as haze.
    rgba.putalpha(alpha.point(lambda a: 0 if a <= ALPHA_CUTOFF else a))
    bbox = rgba.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("cut-out is empty")
    product = rgba.crop(bbox)
    scale = min(SAFE_W / product.width, SAFE_H / product.height)
    if scale > MAX_SCALE:
        return Fit(None, scale, None, REASON_TOO_SMALL)

    # Keep the aspect ratio; round so the longer side lands exactly on the safe box.
    new_w = min(SAFE_W, max(1, round(product.width * scale)))
    new_h = min(SAFE_H, max(1, round(product.height * scale)))
    product = product.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (FRAME_W - new_w) // 2
    top = (FRAME_H - new_h) // 2
    frame = Image.new("RGB", (FRAME_W, FRAME_H), BACKGROUND)
    frame.paste(product, (left, top), product)
    reason = REASON_LOW_RES if scale > LOW_RES_SCALE else None
    return Fit(frame, scale, (left, top, left + new_w, top + new_h), reason)


def to_webp(image: Image.Image) -> bytes:
    out = io.BytesIO()
    image.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
    return out.getvalue()


_sessions: dict = {}


def remove_background(source: Image.Image, model: str) -> Image.Image:
    if model not in ALLOWED_MODELS:
        raise ValueError(f"model not allowed: {model}")
    from rembg import new_session, remove  # heavy import, only where needed

    if model not in _sessions:
        _sessions[model] = new_session(model)
    return remove(source.convert("RGB"), session=_sessions[model]).convert("RGBA")


@dataclass(frozen=True)
class Result:
    status: str  # "done" | "needs_review"
    reason: str | None
    model: str
    webp: bytes | None  # None: keep the original (too small)
    quality: Quality
    scale: float


def process(source: Image.Image, model: str | None = None) -> Result:
    """Cut out and fit one photo. With no model given, tries isnet then birefnet."""
    models = [model] if model else [PRIMARY_MODEL, FALLBACK_MODEL]
    for name in models:
        cutout = remove_background(source, name)
        quality = check_quality(cutout)
        if quality.ok:
            break
    fitted = fit(cutout)
    reason = None if quality.ok else REASON_CUTOUT
    reason = reason or fitted.reason
    webp = to_webp(fitted.image) if fitted.image is not None else None
    return Result("done" if reason is None else "needs_review", reason, name, webp, quality, fitted.scale)
