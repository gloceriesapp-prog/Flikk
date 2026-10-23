# Admin icons — Iconly Light

All admin interface icons come from the signed-in Iconly library at
https://web.iconly.pro/. The original SVGs are stored in `assets/`; `manifest.json`
records their Iconly names and style. Reuse the account's existing Iconly licence;
these files are application assets, not an icon pack for redistribution.

Import named icons and types from `@/components/icons`:

```tsx
import { Search, type IconComponent } from '@/components/icons';
<Search size={18} className="text-muted" />
```

The familiar semantic export names let existing actions keep their meaning while
using genuine Iconly geometry. Assets inherit text colour. Existing filled rating
stars, SVG refs, sizes, classes and animation classes remain supported. Icons are
hidden from assistive technology by default; label their containing icon-only
buttons. Use `title` or `aria-label` for an independently meaningful icon.

## Add or replace an icon

1. Search Iconly through its MCP server or official website. Choose **Light**.
2. Export the original SVG into `assets/` and record its name, source and filename
   in `manifest.json`. Do not approximate a missing icon or relabel another pack.
3. Run `npm run icons:generate`, then `npm run check:icons`, `npm run typecheck`
   and ESLint on the affected files.
4. Check the screen, including selected, disabled and loading states.

The generator validates the SVG and produces typed, tree-shakable React exports.
It removes IDs and titles that would collide when an icon repeats, converts black
to `currentColor`, and preserves the original paths and viewBox. It does not use
`dangerouslySetInnerHTML`, downloads, API calls or credentials in the app.

Chart paths and map data remain data visualizations, not interface icons.

## MCP configuration

The `iconly` HTTP MCP connection is configured in the developer's private Codex
configuration, outside this repository. Its endpoint is
`https://mcp.iconly.pro/mcp`. Credentials belong only in private client settings or
an environment variable, never in this repository or `NEXT_PUBLIC_*` variables.
Each developer supplies their own authorized credential. Reopen the Codex session
when adding a server so its tools can load.

The initial direct MCP connection was rejected by Iconly's Cloudflare protection
before authentication. The SVGs used here were obtained from the authenticated
website instead. The dashboard has no runtime dependency on either service.
