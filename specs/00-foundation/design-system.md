# Design System

## Purpose

Shared visual language across customer, partner, and rider apps (admin is internal-tool, lower priority on polish but should still use these tokens, not invent new ones). Defined once here — app-level specs reference this file, they don't restate the palette.

## Color

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0C1D1A` | Primary text, dark surfaces |
| `--teal` | `#0E6E68` | Brand, primary actions, links |
| `--teal-deep` | `#0A4F4B` | Pressed states, header gradients |
| `--teal-soft` | `#DCECE9` | Selected/highlighted surfaces |
| `--coral` | `#FF6B4A` | CTA buttons, urgency, cart float |
| `--gold` | `#D9A441` | Ratings, ETA highlight — sparingly only |
| `--mist` | `#EAF1EF` | App background |
| `--success` | `#2E9E77` | Delivered, positive status |
| `--danger` | `#D64545` | Errors, out of stock |

**Deliberately not purple (Zepto), yellow (Blinkit), or orange (Swiggy/Instamart).** Don't drift toward those hues even when a designer instinct suggests one "reads better" for a given state — the differentiation is a deliberate product decision, not an oversight to fix.

## Typography

System font stack only — no custom webfont/font file in any app. This is a deliberate load-time decision for 3G, not a placeholder to replace later.

- Display weight 800, tight tracking, for headings and prices.
- `font-variant-numeric: tabular-nums` on every price/ETA/earnings figure, in all three RN apps — numbers that update (price, countdown, earnings) must not jitter horizontally as digits change.

## Spacing & shape

- 4px base spacing unit.
- 14-18px card radius.
- 12-14px button radius.
- Same scale across customer, partner, and rider apps — they should read as one product family despite different content.

## Tone by surface (from PRD Section 6)

- **Customer app:** the showcase surface. Full expression of the palette, skeleton screens (not spinners), honest ETAs stated before the user asks.
- **Partner app:** a tool checked between serving walk-in customers. Favor speed and one-handed usability over visual richness — same tokens, more restrained composition.
- **Rider app:** a tool checked mid-route, often outdoors, worst connectivity of any surface. Simplest visual layer of the three, but still uses these brand tokens — not a different palette "because it's just an ops tool."
- **Admin dashboard:** internal, founder-only. Use the tokens for consistency; no requirement to make it beautiful, functional and fast matters more here.

## Performance as a design constraint

- Cold start under 3 seconds, catalog/queue load under 2 seconds — enforced like a color palette, not treated as a stretch NFR. Applies equally to partner and rider apps, not just customer-facing.
- Accessibility floor: 44×44px minimum touch targets, AA contrast, status conveyed by icon + color + text together (never color alone) — applies to all three RN apps.

## Implementation note

Week 1 deliverable: a single constants file (colors, spacing, type scale) **copied** into each RN app — not npm-linked, per [`repo-structure.md`](repo-structure.md). If the token file drifts between apps later, that's expected until `/packages/shared` exists; reconcile by diffing, don't build shared tooling early to prevent drift that hasn't caused a real problem yet.

## Acceptance criteria

- [ ] Token constants file exists and is copied into `/apps/customer`, `/apps/partner`, `/apps/rider` with identical values
- [ ] No purple/yellow/orange used as a primary/CTA color anywhere in any app
- [ ] No custom webfont bundled in any app — system font stack confirmed in each app's root style
- [ ] Every price/ETA/earnings number display uses tabular-nums
- [ ] Every interactive element in all three RN apps meets 44×44px minimum touch target
- [ ] Every status indicator (order status, approval state, stock state) shows icon + color + text, never color alone
