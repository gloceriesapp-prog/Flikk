# Product photo cut-out

Makes every product photo look like a catalogue shot: background removed,
product scaled to the same size and centred in a 720x810 frame filled with
`#F9FAFB`. No shadow, border, glow or transparency is ever baked in.

- **rembg** removes the background (`isnet-general-use`, retried with
  `birefnet-general`). `bria-rmbg` models are never used: non-commercial licence.
- **Pillow** does the rest: quality check, crop (alpha > 60), scale to touch the
  648x668 safe box on the longer side, centre (36px left/right, 71px top/bottom
  when it touches both), fill, WebP q82.

| Outcome | What happens |
|---|---|
| done | published to the product |
| needs_review: cut-out quality | kept for review, product unchanged |
| needs_review: low resolution (enlarged 2x–3x) | published, flagged |
| needs_review: too small (over 3x) | not enlarged, original stays |

## Setup

Python 3.12 in `.venv-images` at the repo root (not the system python):

    python3.12 -m venv .venv-images
    .venv-images/bin/pip install -r workers/image-cutout/requirements.txt

Models download to `~/.u2net` on first use (isnet ~170 MB, birefnet ~970 MB).

## Run

From `workers/image-cutout`, with `../../.venv-images/bin/python`:

    python run.py local IN_DIR OUT_DIR       # files on disk, writes before-after.png
    python run.py worker                     # queue worker (separate process)
    python run.py batch --out DIR            # dry run over the catalogue, uploads nothing
    python run.py batch --apply DIR          # upload a dry run you have checked

`worker` and `batch` need `ADMIN_URL` and `IMAGE_WORKER_TOKEN` (the same
32+ character secret set on the admin app). They talk only to the admin
`/api/product-images/worker/*` routes and hold no database or storage keys.
The batch skips photos already processed, never overwrites originals, can be
stopped and resumed (`manifest.json`), and prints a summary at the end.

## Queue

`product_image_jobs` (migration `20261121090000_product_image_jobs.sql`). A
trigger queues a job whenever a product gets a photo the pipeline has not
seen; the product stays live on its upload meanwhile. The admin upload keeps
the untouched original (`media_assets.source_url`) and the worker cuts out
from that. Jobs whose worker dies are picked up again after 10 minutes, at
most 3 attempts. Admin → **Photos to review** handles the flagged ones.

## Tests

    ../../.venv-images/bin/python -m unittest discover -s tests
