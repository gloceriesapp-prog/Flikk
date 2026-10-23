import { createSection } from './model.js';

// Shared by new-install defaults and the admin's non-destructive draft action.
// Every shelf uses the same published selection contract as other Home tabs.
export function createFestivalSections() {
  const shelf = (id, title, terms, options = {}) => {
    const section = createSection('products', id, title);
    section.selection.includeTerms = terms.split(',').filter(Boolean);
    section.buttonEnabled = true;
    section.hideWhenEmpty = true;
    section.buttonLabel = `Explore ${title.toLowerCase()}`;
    return { ...section, ...options };
  };
  const puja = 'diya,deepa,wick,batti,incense,agarbatti,dhoop,kumkum,kunkum,sindoor,turmeric,haldi,camphor,kapoor,puja,pooja,sandalwood';
  const flowers = 'flower,garland,jasmine,mallige,marigold,rose,lotus,toran';
  const sweets = 'sweet,mithai,laddu,laddoo,barfi,burfi,halwa,mysore pak,peda,modak,jalebi';
  const fruits = 'banana,apple,orange,mango,grapes,papaya,pineapple,pomegranate,guava,coconut';
  const lights = 'diya,deepa,fairy light,string light,decorative light,led light,candle';
  const decor = 'rangoli,kolam,toran,door decor,door hanging,bandhanwar,festive decor';
  const all = [...new Set([puja, flowers, sweets, fruits, lights, decor].join(',').split(','))].join(',');
  const shops = shelf('festival-local-shops', 'From local shops', all);
  shops.kind = 'stores';
  shops.buttonEnabled = false;
  const offers = shelf('festival-offers', 'Festival offers', all);
  offers.selection.discountedOnly = true;
  const fruitShelf = shelf('festival-fruits', 'Fruits for the festival', fruits);
  fruitShelf.selection.excludeTerms = ['juice', 'powder', 'biscuit', 'cookie', 'candy', 'flavour', 'flavor'];
  return [
    shelf('festival-puja', 'Puja essentials', puja, { layout: 'grid', columns: 3 }),
    shelf('festival-flowers', 'Flowers & garlands', flowers, { limit: 4 }),
    shelf('festival-sweets', 'Sweets to share', sweets),
    fruitShelf,
    shelf('festival-lights', 'Light up your home', lights),
    shelf('festival-decor', 'Rangoli & decor', decor),
    shops,
    offers,
  ];
}

export function addMissingFestivalSections(document) {
  const existing = new Set(document.sections.map(section => section.id));
  const missing = createFestivalSections().filter(section => !existing.has(section.id));
  // Keep existing edits/order. Insert missing shelves before the footer.
  const footer = document.sections.findIndex(section => section.kind === 'footer');
  const at = footer < 0 ? document.sections.length : footer;
  return { ...document, sections: [...document.sections.slice(0, at), ...missing, ...document.sections.slice(at)] };
}
