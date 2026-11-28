'use client';

// Web copy of the app's bento card (apps/customer .../today-grid/components):
// white, #E6ECF7 border, centred title on top, photos filling the middle,
// offer strip across the foot. The hero adds the joined price pill and its line.
interface MiniCardProps { title: string; tag: string; line: string; accent: string; tagText: string; images?: string[]; width?: number; height?: number; hero?: boolean; price?: { amount: number; mrp: number | null } }

export function MiniCard({ title, tag, line, accent, tagText, images = [], width = 120, height = 166, hero = false, price }: MiniCardProps) {
  const mrp = price && price.mrp != null && price.mrp > price.amount ? price.mrp : null;
  return (
    <div style={{ background: '#D0E0FD', padding: 8, borderRadius: 20 }}>
      <div style={{ width, height, boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E6ECF7', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Gilroy, system-ui, sans-serif', textAlign: 'center' }}>
        <div style={{ color: '#101828', fontWeight: 700, fontSize: hero ? 16 : Math.max(13, Math.round(width * 0.125)), lineHeight: 1.15, padding: hero ? '12px 6px 0' : '8px 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{title}</div>
        {hero && price && (
          <div style={{ marginTop: 10, display: 'flex', border: `1px solid ${accent}`, borderRadius: 999, overflow: 'hidden' }}>
            {mrp != null && <s style={{ background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, padding: '3px 8px' }}>₹{mrp}</s>}
            <span style={{ background: accent, color: tagText, fontWeight: 900, fontSize: 16, padding: '2px 10px' }}>₹{price.amount}</span>
          </div>
        )}
        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minHeight: 0, padding: hero ? 8 : 0, boxSizing: 'border-box' }}>
          {images.slice(0, hero ? 1 : 2).map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- product photo URLs from Storage, preview only
            <img key={src} src={src} alt="" style={{ height: '100%', maxWidth: hero ? '100%' : '54%', marginLeft: index ? '-6%' : 0, objectFit: 'contain' }} />
          ))}
        </div>
        {hero && <div style={{ color: '#101828', fontWeight: 700, fontSize: 13, lineHeight: '16px', padding: '0 6px 8px' }}>{line}</div>}
        <div style={{ width: '100%', height: 24, lineHeight: '24px', background: accent, color: tagText, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 6px', boxSizing: 'border-box' }}>{tag}</div>
      </div>
    </div>
  );
}
