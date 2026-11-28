'use client';

// Web copy of the app's bento card (apps/customer .../today-grid/components):
// white, #E6ECF7 border, centred title on top, photos filling the middle,
// two-tone tag pill on top (one style for every card). The hero adds the
// price pill and its line.
interface MiniCardProps { title: string; tag: string; line: string; accent: string; tagText: string; images?: string[]; width?: number; height?: number; hero?: boolean; price?: { amount: number; mrp: number | null } }

const LEAD = /^(up\s*to|from|starting\s+(?:from|at)|landed|order\s+by|picked)\s+(.+)$/i;
function Pill({ tag }: { tag: string }) {
  const m = LEAD.exec(tag.trim());
  const part = { height: 22, lineHeight: '22px', fontSize: 11, padding: '0 8px', whiteSpace: 'nowrap' as const };
  return (
    <div style={{ display: 'flex', borderRadius: '0 0 10px 10px', overflow: 'hidden', maxWidth: '92%' }}>
      {m && <span style={{ ...part, background: '#474A40', color: '#FFFFFF', fontWeight: 600 }}>{m[1]}</span>}
      <span style={{ ...part, background: '#E2E175', color: '#111715', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{(m ? m[2] : tag).replace(/%\s*off\b/i, '% OFF')}</span>
    </div>
  );
}

export function MiniCard({ title, tag, images = [], width = 120, height = 166, hero = false, price }: MiniCardProps) {
  const mrp = price && price.mrp != null && price.mrp > price.amount ? price.mrp : null;
  return (
    <div style={{ background: '#D0E0FD', padding: 8, borderRadius: 20 }}>
      <div style={{ width, height, boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E6ECF7', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Gilroy, system-ui, sans-serif', textAlign: 'center' }}>
        <Pill tag={tag} />
        <div style={{ color: '#101828', fontWeight: 600, fontSize: hero ? 16 : Math.max(13, Math.round(width * 0.125)), lineHeight: 1.15, padding: '6px 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{title}</div>
        {hero && price && (
          <div style={{ marginTop: 8, display: 'flex', borderRadius: 999, overflow: 'hidden' }}>
            {mrp != null && <s style={{ background: '#474A40', color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: 600, padding: '3px 8px' }}>₹{mrp}</s>}
            <span style={{ background: '#E2E175', color: '#111715', fontWeight: 700, fontSize: 16, padding: '2px 10px' }}>₹{price.amount}</span>
          </div>
        )}
        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minHeight: 0, padding: hero ? 8 : 0, boxSizing: 'border-box' }}>
          {images.slice(0, hero ? 1 : 2).map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- product photo URLs from Storage, preview only
            <img key={src} src={src} alt="" style={{ height: '100%', maxWidth: hero ? '100%' : '54%', marginLeft: index ? '-6%' : 0, objectFit: 'contain' }} />
          ))}
        </div>

      </div>
    </div>
  );
}
