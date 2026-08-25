# Custom Fonts Directory

Place your custom font files (`.woff2`, `.woff`, `.ttf`, `.otf`) in this folder.

### Quick Setup Instructions

#### Option 1: Via `@font-face` in `globals.css` (Recommended for custom fonts)

Add your `@font-face` definition to `src/app/globals.css`:

```css
@font-face {
  font-family: "MyCustomFont";
  src: url("/fonts/YourFontFile.woff2") format("woff2"),
       url("/fonts/YourFontFile.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@theme {
  --font-custom: "MyCustomFont", sans-serif;
}
```

Then use `font-custom` anywhere in your Tailwind classes: `<div className="font-custom">...</div>`.

---

#### Option 2: Via Next.js `next/font/local` in `src/app/fonts.ts`

Import and configure local font in `src/app/fonts.ts`:

```typescript
import localFont from "next/font/local";

export const myCustomFont = localFont({
  src: "./fonts/YourFontFile.woff2", // or relative path to your file
  variable: "--font-custom",
});
```
