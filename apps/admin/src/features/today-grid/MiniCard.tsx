'use client';

// Web copy of the app's grid card (apps/customer .../today-grid/components):
// white, #EEF0F4 border, tag attached to the top edge, 10% accent wash.
interface MiniCardProps { title: string; tag: string; line: string; accent: string; tagText: string; images?: string[]; width?: number; height?: number; hero?: boolean; price?: { amount: number; mrp: number | null } }

export function MiniCard({ title, tag, line, accent, tagText, images = [], width = 120, height = 166, hero = false, price }: MiniCardProps) {
  return (
    <div style={{ width, height, flexShrink: 0, boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #EEF0F4', borderRadius: hero ? 20 : 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'Gilroy, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{ background: accent, color: tagText, height: 20, padding: '0 10px', borderRadius: '0 0 9px 9px', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', maxWidth: width - 8, overflow: 'hidden' }}>{tag}</span>
      </div>
      <div style={{ padding: hero ? '8px 10px 10px' : '6px 8px 8px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ color: '#101828', fontWeight: hero ? 900 : 700, fontSize: hero ? (width < 112 ? 15 : 19) : 14, lineHeight: hero ? '20px' : '17px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{title}</div>
        <div style={{ color: '#667085', fontSize: 12, lineHeight: '15px', marginTop: 2, whiteSpace: hero ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</div>
        {hero && price && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <span style={{ background: accent, color: tagText, borderRadius: 8, padding: '1px 8px', fontWeight: 900, fontSize: 14 }}>₹{price.amount}</span>
            {price.mrp != null && price.mrp > price.amount && <s style={{ color: '#667085', fontSize: 12, fontWeight: 600 }}>₹{price.mrp}</s>}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ height: Math.round(height * 0.4), borderRadius: hero ? 16 : 14, background: `${accent}1A`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
          {images.slice(0, 2).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element -- product photo URLs from Storage, preview only
            <img key={src} src={src} alt="" style={{ height: '92%', maxWidth: images.length > 1 ? '54%' : '78%', objectFit: 'contain' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
