'use client';

// Web copy of the app's bento card (apps/customer .../today-grid/components):
// white, #E6ECF7 border, rounded accent pill on top, centred title + line,
// photos on the foot. The hero adds the struck MRP and the price chip.
interface MiniCardProps { title: string; tag: string; line: string; accent: string; tagText: string; images?: string[]; width?: number; height?: number; hero?: boolean; price?: { amount: number; mrp: number | null } }

export function MiniCard({ title, tag, line, accent, tagText, images = [], width = 120, height = 166, hero = false, price }: MiniCardProps) {
  const pill = 22;
  return (
    <div style={{ background: '#D0E0FD', padding: 8, borderRadius: 20 }}>
      <div style={{ width, height, boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E6ECF7', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 6px', fontFamily: 'Gilroy, system-ui, sans-serif', textAlign: 'center' }}>
        <span style={{ background: accent, color: tagText, height: pill, lineHeight: `${pill}px`, padding: '0 8px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginTop: 6, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag}</span>
        <div style={{ color: '#101828', fontWeight: hero ? 900 : 800, fontSize: hero ? 15 : Math.max(12, Math.round(width * 0.12)), lineHeight: 1.15, marginTop: hero ? 8 : 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{title}</div>
        {hero && price && (
          <>
            {price.mrp != null && price.mrp > price.amount && <s style={{ marginTop: 8, background: '#F1F3F6', borderRadius: 6, padding: '1px 6px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>₹{price.mrp}</s>}
            <span style={{ marginTop: 4, background: accent, color: tagText, borderRadius: 10, padding: '2px 10px', fontWeight: 900, fontSize: 20 }}>₹{price.amount}</span>
          </>
        )}
        {/* Small cards: title only. The line shows on the hero. */}
        {hero && <div style={{ color: '#101828', fontWeight: 700, fontSize: 12, lineHeight: '14px', marginTop: 6, maxWidth: '100%' }}>{line}</div>}
        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, minHeight: 0 }}>
          {images.slice(0, hero ? 1 : 2).map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- product photo URLs from Storage, preview only
            <img key={src} src={src} alt="" style={{ height: '90%', maxWidth: hero ? '100%' : '50%', marginLeft: index ? '-9%' : 0, objectFit: 'contain' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
