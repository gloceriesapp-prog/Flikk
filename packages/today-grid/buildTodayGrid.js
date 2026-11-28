// Pure: which hero and cards the "Today on Gloceries" grid shows, with what
// copy, and why (trace). No database, no Date.now(): everything is an input,
// so the endpoint and the admin preview give identical answers.
//
// Pipeline: slot list -> modifiers (config order, later wins) -> dedupe ->
// data checks with ordered backups -> at most 4 unique cards.
import { IMAGE_SLOTS, ITEM_FACTS } from './catalog.js';
import { formatIstMinute, inWindow, istClock } from './istClock.js';
import { fill } from './placeholders.js';
import { EMPTY_STAT } from './types.js';
export const MAX_CARDS = 4;
export const HERO_PRODUCTS = IMAGE_SLOTS.hero;
const MIN_ITEMS = 3;
const FALLBACK_HERO = 'fruits-vegetables';
export function slotFor(clock, config) {
    return config.slots.find(slot => inWindow(clock.minute, slot.from, slot.to)) ?? config.slots[0];
}
function mergeStats(stats) {
    const present = stats.filter(s => s.count > 0);
    if (!present.length)
        return EMPTY_STAT;
    const cheapest = present.filter(s => s.minPrice != null).sort((x, y) => x.minPrice - y.minPrice)[0];
    const pcts = present.map(s => s.maxDiscountPct).filter((p) => p != null);
    return {
        count: present.reduce((sum, s) => sum + s.count, 0),
        minPrice: cheapest?.minPrice ?? null, minPriceMrp: cheapest?.minPriceMrp ?? null,
        maxDiscountPct: pcts.length ? Math.max(...pcts) : null,
        imageUrls: [...new Set(present.flatMap(s => s.imageUrls))].slice(0, 2),
        top: present.flatMap(s => s.top ?? []).slice(0, HERO_PRODUCTS),
    };
}
// Effective config of an item: the festival card takes its title and
// categories from the festival modifier.
export function itemConfig(id, config, festival) {
    const item = config.items[id];
    if (id !== 'festival-needs')
        return item;
    const f = config.modifiers.festival;
    return { ...item, title: fill(f.titleTemplate, { festival: festival.name }) ?? 'Festival Needs', categories: f.categories,
        target: item.target.type === 'categories' ? { type: 'categories', categories: f.categories } : item.target };
}
// The live stat behind an item, or null (with the failed rule) when it has no data.
export function itemStat(id, item, user, a, newUserThreshold) {
    const byCategories = () => mergeStats(item.categories.map(name => a.categories[name] ?? EMPTY_STAT));
    switch (ITEM_FACTS[id].check) {
        case 'categories': {
            const s = byCategories();
            return s.count >= MIN_ITEMS ? s : null;
        }
        case 'usuals': return user.kind === 'customer' && user.deliveredOrders >= newUserThreshold && user.usuals.count >= MIN_ITEMS ? user.usuals : null;
        case 'popular': return a.popularThisWeek.count >= MIN_ITEMS ? a.popularThisWeek : null;
        case 'offers': return user.kind === 'customer' && user.offers.count > 0 && user.offers.maxDiscountPct != null ? user.offers : null;
        case 'storeOpen': {
            const s = byCategories();
            return a.openStores >= 1 && s.count > 0 ? s : null;
        }
        case 'preorder': return a.preorder.open ? mergeStats([a.categories['Milk & Dairy Drinks'] ?? EMPTY_STAT, a.categories['Non Veg'] ?? EMPTY_STAT, a.fruitsAndVegetables]) : null;
        case 'bulk': return a.bulk.count > 0 ? a.bulk : null;
        case 'party': return a.party.count > 0 ? a.party : null;
        case 'localBrands': return a.localBrands.count >= MIN_ITEMS ? { ...EMPTY_STAT, count: a.localBrands.count, imageUrls: a.localBrands.logoUrls.slice(0, 2) } : null;
        case 'fish': return a.fish.count > 0 && a.fish.arrivedMinute != null ? a.fish : null;
        case 'village': return a.villagePickedToday.count > 0 ? a.villagePickedToday : null;
        case 'vegetables': return a.vegetables.count >= MIN_ITEMS ? a.vegetables : null;
        case 'always': return a.fruitsAndVegetables;
    }
}
const rupees = (amount) => (Number.isInteger(amount) ? String(amount) : amount.toFixed(2));
// Honest numbers: placeholders come only from live data, else the fallback tag.
export function renderTag(item, stat, a) {
    return fill(item.tag, {
        min: stat.minPrice != null ? rupees(stat.minPrice) : null,
        pct: stat.maxDiscountPct != null && stat.maxDiscountPct > 0 ? String(stat.maxDiscountPct) : null,
        total: stat.count > 0 ? String(stat.count) : null,
        time: a.fish.arrivedMinute != null ? formatIstMinute(a.fish.arrivedMinute) : null,
        cutoff: a.preorder.cutoffMinute != null ? formatIstMinute(a.preorder.cutoffMinute, true) : null,
    }) ?? item.fallbackTag;
}
// The admin's picked products that are in stock now, in order, each with
// its custom photo if one was uploaded; price, MRP and name stay the
// product's own. Products with no photo at all are skipped.
export function pickedSlots(item, a, slots) {
    if (item.images.mode !== 'picked')
        return [];
    const photos = item.images.photos ?? {};
    return item.images.productIds
        .flatMap(id => (a.products[id] ? [{ ...a.products[id], imageUrl: photos[id] ?? a.products[id].imageUrl }] : []))
        .filter(p => p.imageUrl)
        .slice(0, slots);
}
// Card photos: picked slots first, else automatic. The hero's own photo is
// its first product (its rotation is `products`, below).
function images(id, item, stat, a) {
    const count = ITEM_FACTS[id].type === 'hero' ? 1 : IMAGE_SLOTS[ITEM_FACTS[id].type];
    const picked = pickedSlots(item, a, count);
    return (picked.length ? picked.map(p => p.imageUrl) : stat.imageUrls).slice(0, count);
}
function toCard(id, item, stat, a) {
    return {
        id, title: item.title, tag: renderTag(item, stat, a), line: item.line, accent: item.accent, tagBg: item.accent, tagText: item.tagText,
        imageUrls: images(id, item, stat, a),
        bannerUrl: item.bannerUrl, categories: item.categories,
        target: item.target.type === 'categories' && !item.target.categories.length ? { type: 'categories', categories: item.categories } : item.target,
    };
}
// Hero rotation: the admin's picked products (up to IMAGE_SLOTS.hero), else
// the top in-stock products its data check counted. MRP kept only if real.
function heroProducts(item, used, a) {
    const picked = pickedSlots(item, a, IMAGE_SLOTS.hero);
    const list = picked.length ? picked : (used.top ?? []).filter(p => p.imageUrl).slice(0, IMAGE_SLOTS.hero);
    return list.length ? { products: list.map(p => ({ ...p, mrp: p.mrp != null && p.mrp > p.price ? p.mrp : null })) } : {};
}
// ---- modifiers -----------------------------------------------------------
export function rainOn(config, now) {
    const rain = config.modifiers.rain;
    return rain.on && (!rain.until || now.getTime() < Date.parse(rain.until));
}
export function applyModifiers(base, clock, now, user, config, festival) {
    const m = config.modifiers;
    const cards = [...base];
    const notes = [];
    const place = (position, id, why) => { cards[position - 1] = id; notes.push(`${why}: ${id} at position ${position}`); };
    if (m.monthStart.on && clock.dayOfMonth >= m.monthStart.fromDay && clock.dayOfMonth <= m.monthStart.toDay && !cards.includes(m.monthStart.card))
        place(m.monthStart.position, m.monthStart.card, 'Month start');
    if (m.weekendParty.on && m.weekendParty.days.includes(clock.weekday) && clock.minute >= m.weekendParty.fromMinute)
        place(m.weekendParty.position, m.weekendParty.card, 'Weekend party');
    if (m.festival.on && festival.active && festival.name)
        place(m.festival.position, 'festival-needs', `Festival (${festival.name})`);
    if (rainOn(config, now) && clock.minute >= m.rain.fromMinute)
        place(m.rain.position, m.rain.card, 'Rain');
    if (user.deliveredOrders < m.newUsers.threshold && cards.includes('your-usuals')) {
        notes.push(`New customer (< ${m.newUsers.threshold} delivered orders): Popular Near You instead of Your Usuals`);
        return { cards: cards.map(id => (id === 'your-usuals' ? 'popular-near-you' : id)), notes };
    }
    return { cards, notes };
}
// Next instant the grid can change on its own (a slot edge).
export function nextChangeAt(now, config) {
    const clock = istClock(now);
    const edges = new Set(config.slots.flatMap(slot => [slot.from, slot.to]).map(m => m % 1440));
    const minutes = Math.min(...[...edges].map(edge => (edge - clock.minute + 1440) % 1440 || 1440));
    return new Date(now.getTime() - (now.getTime() % 60_000) + minutes * 60_000);
}
// ---- the grid ------------------------------------------------------------
export function buildTodayGrid({ now, user, availability: a, config, festival }) {
    const clock = istClock(now);
    const slot = slotFor(clock, config);
    const threshold = config.modifiers.newUsers.threshold;
    const trace = new Map();
    const note = (row) => { if (!trace.has(row.id))
        trace.set(row.id, row); };
    // Hero: the slot's choice, else the always-on fallback.
    const heroItem = itemConfig(slot.hero, config, festival);
    const heroStat = heroItem.enabled ? itemStat(slot.hero, heroItem, user, a, threshold) : null;
    const heroId = heroStat ? slot.hero : FALLBACK_HERO;
    if (heroId !== slot.hero)
        note({ id: slot.hero, status: heroItem.enabled ? 'no-data' : 'disabled', reason: heroItem.enabled ? ITEM_FACTS[slot.hero].rule : 'disabled in admin' });
    const heroCfg = itemConfig(heroId, config, festival);
    const used = heroStat ?? a.fruitsAndVegetables;
    const hero = {
        ...toCard(heroId, heroCfg, used, a),
        ...(used.minPrice != null ? { price: { amount: used.minPrice, mrp: used.minPriceMrp != null && used.minPriceMrp > used.minPrice ? used.minPriceMrp : null } } : {}),
        ...heroProducts(heroCfg, used, a),
    };
    note({ id: heroId, status: 'shown', reason: heroId === slot.hero ? 'hero for this slot' : 'fallback hero', position: 0 });
    const { cards: modified, notes } = applyModifiers(slot.cards, clock, now, user, config, festival);
    const wanted = [];
    for (const id of modified) {
        if (wanted.includes(id))
            note({ id, status: 'duplicate', reason: 'already in this slot' });
        else
            wanted.push(id);
    }
    const backups = config.backups.filter(id => !(id === 'your-usuals' && user.deliveredOrders < threshold));
    const shown = [];
    const usedIds = new Set();
    const attempt = (id) => {
        if (usedIds.has(id))
            return false;
        const item = itemConfig(id, config, festival);
        if (!item.enabled) {
            note({ id, status: 'disabled', reason: 'disabled in admin' });
            return false;
        }
        const stat = itemStat(id, item, user, a, threshold);
        if (!stat) {
            note({ id, status: 'no-data', reason: ITEM_FACTS[id].rule });
            return false;
        }
        usedIds.add(id);
        shown.push(toCard(id, item, stat, a));
        return true;
    };
    for (const id of wanted.slice(0, MAX_CARDS)) {
        if (shown.length >= MAX_CARDS) {
            note({ id, status: 'no-room', reason: 'grid already full' });
            continue;
        }
        if (attempt(id)) {
            note({ id, status: 'shown', reason: 'in this slot', position: shown.length });
            continue;
        }
        const replacement = backups.find(b => !wanted.includes(b) && attempt(b));
        if (replacement) {
            trace.set(id, { ...trace.get(id), status: 'replaced', reason: `${trace.get(id)?.reason ?? 'no data'}; replaced by ${replacement}` });
            note({ id: replacement, status: 'backup', reason: `backup for ${id}`, position: shown.length });
        }
    }
    for (const id of Object.keys(config.items)) {
        if (ITEM_FACTS[id].type === 'hero') {
            note({ id, status: 'not-in-slot', reason: `hero for another slot (this slot: ${slot.hero})` });
            continue;
        }
        note({ id, status: config.items[id].enabled ? 'not-in-slot' : 'disabled', reason: config.items[id].enabled ? `not scheduled for ${slot.key}` : 'disabled in admin' });
    }
    return { hero, cards: shown, slot: slot.key, refreshAt: nextChangeAt(now, config).toISOString(), trace: [...trace.values()], modifierNotes: notes };
}
