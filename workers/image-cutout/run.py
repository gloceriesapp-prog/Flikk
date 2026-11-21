"""Command line for the product photo pipeline.

  python run.py local IN_DIR OUT_DIR        process files on disk (no network)
  python run.py worker                      process queued jobs until stopped
  python run.py batch --out DIR             dry run over the live catalogue
  python run.py batch --apply DIR           upload a reviewed dry run

worker and batch talk only to the admin app (ADMIN_URL) with
IMAGE_WORKER_TOKEN; they hold no database or storage credentials.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

import cutout

PHOTO_TYPES = {".jpg", ".jpeg", ".png", ".webp"}


def open_photo(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    return ImageOps.exif_transpose(image)


# ---------------------------------------------------------------- local

def preview_card(webp: bytes, card_w: int = 240) -> Image.Image:
    """The processed photo at card size with the ADD button where the app
    pins it (bottom-right of the image), to judge overlap by eye."""
    image = open_photo(webp).convert("RGB").resize((card_w, round(card_w * 4.5 / 4)), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image)
    # ProductCardView ADD control: ~58x34pt on a ~120pt wide card.
    bw, bh = round(card_w * 58 / 120), round(card_w * 34 / 120)
    x0, y0 = image.width - bw, image.height - bh
    draw.rounded_rectangle([x0, y0, image.width - 1, image.height - 1], radius=round(card_w / 15), fill="white", outline="#155DFC", width=2)
    draw.text((x0 + bw // 2, y0 + bh // 2), "ADD", fill="#155DFC", anchor="mm")
    return image


def board(rows: list[tuple[str, Image.Image, Image.Image | None, str]], path: Path) -> None:
    cell_w, cell_h = 300, 338
    sheet = Image.new("RGB", (cell_w * 3 + 40, (cell_h + 40) * len(rows) + 50), "white")
    draw = ImageDraw.Draw(sheet)
    for col, title in enumerate(["BEFORE (upload)", "AFTER (720x810)", "IN CARD + ADD"]):
        draw.text((10 + col * (cell_w + 10), 15), title, fill="black")
    for i, (name, before, after, label) in enumerate(rows):
        y = 50 + i * (cell_h + 40)
        cells = [before, after, preview_card(cutout.to_webp(after), cell_w) if after else None]
        for col, image in enumerate(cells):
            x = 10 + col * (cell_w + 10)
            if image is None:
                draw.rectangle([x, y, x + cell_w, y + cell_h], outline="#cccccc")
                continue
            thumb = ImageOps.contain(image.convert("RGB"), (cell_w, cell_h))
            sheet.paste(thumb, (x + (cell_w - thumb.width) // 2, y + (cell_h - thumb.height) // 2))
            draw.rectangle([x, y, x + cell_w, y + cell_h], outline="#dddddd")
        draw.text((10, y + cell_h + 8), f"{name}: {label}", fill="black")
    sheet.save(path)


def run_local(src: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    rows, counts = [], Counter()
    for path in sorted(p for p in src.iterdir() if p.suffix.lower() in PHOTO_TYPES):
        before = open_photo(path.read_bytes())
        result = cutout.process(before)
        label = f"{result.status}{' (' + result.reason + ')' if result.reason else ''} · {result.model} · scale {result.scale:.2f} · {result.quality}"
        print(f"{path.name}: {label}")
        after = None
        if result.webp:
            (out / f"{path.stem}.webp").write_bytes(result.webp)
            after = open_photo(result.webp)
        counts[result.reason or "done"] += 1
        rows.append((path.name, before, after, label))
    board(rows, out / "before-after.png")
    print(f"\nboard: {out / 'before-after.png'}")
    print_summary(counts, skipped=0)


def print_summary(counts: Counter, skipped: int) -> None:
    review = {k: v for k, v in counts.items() if k != "done"}
    print(f"processed: {sum(counts.values())}  done: {counts.get('done', 0)}  skipped: {skipped}")
    print("needs_review: " + (", ".join(f"{k}: {v}" for k, v in review.items()) or "none"))


# ---------------------------------------------------------------- admin API

class Admin:
    def __init__(self) -> None:
        import requests

        base, token = os.environ.get("ADMIN_URL"), os.environ.get("IMAGE_WORKER_TOKEN")
        if not base or not token:
            sys.exit("Set ADMIN_URL and IMAGE_WORKER_TOKEN.")
        self.base = base.rstrip("/")
        self.http = requests.Session()
        self.http.headers["Authorization"] = f"Bearer {token}"

    def get(self, path: str, **params):
        res = self.http.get(f"{self.base}{path}", params=params, timeout=30)
        res.raise_for_status()
        return res

    def post(self, path: str, data: dict, webp: bytes | None = None):
        files = {"file": ("image.webp", webp, "image/webp")} if webp else None
        res = self.http.post(f"{self.base}{path}", data=data, files=files, timeout=60)
        res.raise_for_status()
        return res

    def download(self, url: str) -> bytes:
        import requests

        res = requests.get(url, timeout=30)  # public image URL: no token sent
        res.raise_for_status()
        return res.content


def result_fields(result: cutout.Result) -> dict:
    return {"status": result.status, "reason": result.reason or "", "model": result.model,
            "quality": json.dumps(result.quality.__dict__), "scale": f"{result.scale:.3f}"}


def run_worker(poll_seconds: int) -> None:
    admin = Admin()
    print("worker started")
    while True:
        try:
            res = admin.post("/api/product-images/worker/claim", {})
        except Exception as error:  # admin restarting or offline: wait, then try again
            print(f"claim failed, retrying: {error}", file=sys.stderr)
            time.sleep(poll_seconds)
            continue
        if res.status_code == 204:
            time.sleep(poll_seconds)
            continue
        job = res.json()
        try:
            result = cutout.process(open_photo(admin.download(job["originalUrl"])), cutout.pinned_model(job.get("model")))
            admin.post("/api/product-images/worker/result", {"jobId": job["id"], **result_fields(result)}, result.webp)
            print(f"{job['id']}: {result.status} {result.reason or ''}")
        except Exception as error:  # report and move on; the job retries up to 3 times
            print(f"{job['id']}: failed {error}", file=sys.stderr)
            try:
                admin.post("/api/product-images/worker/result", {"jobId": job["id"], "status": "failed", "error": str(error)[:500]})
            except Exception:
                pass  # unreported: the claim expires after 10 minutes and is retried


def run_batch_dry(out: Path, limit: int | None) -> None:
    admin = Admin()
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    counts, skipped, cursor = Counter(), 0, None
    while True:
        page = admin.get("/api/product-images/worker/catalog", **({"after": cursor} if cursor else {})).json()
        for item in page["products"]:
            if limit is not None and sum(counts.values()) >= limit:
                break
            if item["processed"] or item["id"] in manifest:
                skipped += 1
                continue
            try:
                result = cutout.process(open_photo(admin.download(item["imageUrl"])))
            except Exception as error:
                print(f"{item['id']}: failed {error}", file=sys.stderr)
                continue
            file = None
            if result.webp:
                file = f"{result.reason or 'done'}/{item['id']}.webp".replace(" ", "-")
                (out / file).parent.mkdir(parents=True, exist_ok=True)
                (out / file).write_bytes(result.webp)
            manifest[item["id"]] = {"name": item["name"], "imageUrl": item["imageUrl"], "file": file, **result_fields(result)}
            manifest_path.write_text(json.dumps(manifest, indent=2))  # resumable
            counts[result.reason or "done"] += 1
            print(f"{item['name']}: {result.status} {result.reason or ''}")
        cursor = page.get("next")
        if not cursor or (limit is not None and sum(counts.values()) >= limit):
            break
    print(f"\nlook through {out} before applying.")
    print_summary(counts, skipped)


def run_batch_apply(out: Path) -> None:
    admin = Admin()
    manifest = json.loads((out / "manifest.json").read_text())
    counts, skipped = Counter(), 0
    for product_id, item in manifest.items():
        if item.get("applied"):
            skipped += 1
            continue
        webp = (out / item["file"]).read_bytes() if item["file"] else None
        fields = {k: item[k] for k in ("status", "reason", "model", "quality", "scale")}
        res = admin.post("/api/product-images/worker/batch-result", {"productId": product_id, "imageUrl": item["imageUrl"], **fields}, webp)
        if res.json().get("skipped"):
            skipped += 1
        else:
            counts[item["reason"] or "done"] += 1
        item["applied"] = True
        (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print_summary(counts, skipped)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    local = sub.add_parser("local")
    local.add_argument("src", type=Path)
    local.add_argument("out", type=Path)
    worker = sub.add_parser("worker")
    worker.add_argument("--poll", type=int, default=10, help="seconds between checks when the queue is empty")
    batch = sub.add_parser("batch")
    mode = batch.add_mutually_exclusive_group(required=True)
    mode.add_argument("--out", type=Path, help="dry run: write results here, upload nothing")
    mode.add_argument("--apply", type=Path, help="upload the results of a reviewed dry run")
    batch.add_argument("--limit", type=int)
    args = parser.parse_args()
    if args.command == "local":
        run_local(args.src, args.out)
    elif args.command == "worker":
        run_worker(args.poll)
    elif args.out:
        run_batch_dry(args.out, args.limit)
    else:
        run_batch_apply(args.apply)


if __name__ == "__main__":
    main()
