// Renders one JSON-LD <script>. Server component (no "use client") so the
// structured data is in the initial HTML for crawlers + AI engines.
// dangerouslySetInnerHTML is the standard, XSS-safe way to emit LD+JSON in
// Next — the data is our own typed objects, never user input.

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
