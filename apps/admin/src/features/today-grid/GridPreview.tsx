'use client';

// Web copy of the customer grid layout (apps/customer .../today-grid) for the
// admin preview: white cards, #EEF0F4 border, tag on the top edge, 10% accent
// wash, hero spanning two rows. Data comes from the shared pure function.
import type { TodayGrid } from '@/lib/home/todayGrid';

type Card = TodayGrid['hero'];
const GAP = 10, SIDE = 16;

function Tag({ card }: { card: Card }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span style={{ background: card.tagBg, color: card.tagText, height: 20, padding: '0 10px', borderRadius: '0 0 9px 9px', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{card.tag}</span>
    </div>
  );
}
function Tile({ card, width, height, hero }: { card: Card; width: number; height: number; hero?: boolean }) {
  return (
    <div style={{ width, height, flexShrink: 0, boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #EEF0F4', borderRadius: hero ? 20 : 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Tag card={card} />
      <div style={{ padding: hero ? '8px 10px 10px' : '6px 8px 8px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ color: '#101828', fontWeight: hero ? 900 : 700, fontSize: hero ? 19 : 14, lineHeight: hero ? '22px' : '17px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.title}</div>
        <div style={{ color: '#667085', fontSize: 12, lineHeight: '15px', marginTop: 2, whiteSpace: hero ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.line}</div>
        {hero && card.price && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <span style={{ background: card.accent, color: card.tagText, borderRadius: 8, padding: '1px 8px', fontWeight: 900, fontSize: 14 }}>₹{card.price.amount}</span>
            {card.price.mrp != null && card.price.mrp > card.price.amount && <s style={{ color: '#667085', fontSize: 12, fontWeight: 600 }}>₹{card.price.mrp}</s>}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ height: Math.round(height * (hero ? 0.42 : 0.4)), borderRadius: hero ? 16 : 14, background: `${card.accent}1A` }} />
      </div>
    </div>
  );
}

// Same geometry rules as the app (layout.ts): 2x2, 2x1 or hero only.
export function GridPreview({ grid, screenWidth }: { grid: TodayGrid; screenWidth: number }) {
  const column = Math.floor((screenWidth - SIDE * 2 - GAP * 2) / 3);
  const cardHeight = Math.round(column * 1.38);
  const count = grid.cards.length >= 4 ? 4 : grid.cards.length >= 2 ? 2 : 0;
  const cards = grid.cards.slice(0, count);
  return (
    <div data-testid="grid-preview" style={{ width: screenWidth, background: '#FFFFFF', padding: `12px ${SIDE}px 16px`, boxSizing: 'border-box', fontFamily: 'Gilroy, system-ui, sans-serif' }}>
      <div style={{ color: '#101828', fontWeight: 800, fontSize: 18, letterSpacing: -0.3, marginBottom: 10 }}>Today on Gloceries</div>
      {count === 0 ? <Tile card={grid.hero} width={screenWidth - SIDE * 2} height={cardHeight} hero /> : (
        <div style={{ display: 'flex', gap: GAP }}>
          <Tile card={grid.hero} width={column} height={count === 4 ? cardHeight * 2 + GAP : cardHeight} hero />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: GAP, width: column * 2 + GAP, flexShrink: 0 }}>
            {cards.map((card) => <Tile key={card.id} card={card} width={column} height={cardHeight} />)}
          </div>
        </div>
      )}
    </div>
  );
}
