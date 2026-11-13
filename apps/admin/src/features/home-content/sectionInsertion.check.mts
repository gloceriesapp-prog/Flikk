import assert from 'node:assert/strict';
import { createSection, validateContent, DEFAULT_CONTENT, TAB_KEYS } from '../../../../../packages/home-content/index.js';
import { insertContentSection } from './sectionInsertion';
const a = createSection('categories', 'categories');
const b = { ...createSection('products', 'products'), enabled: false };
const ad = createSection('banner', 'ad-one');
ad.imageUrl = 'https://images.gloceries.com/banner-one.png';
const original = [a, b];
assert.deepEqual(insertContentSection(original, ad, a.id, 'before').map(s => s.id), ['ad-one','categories','products']);
assert.deepEqual(insertContentSection(original, ad, a.id, 'after').map(s => s.id), ['categories','ad-one','products']);
assert.deepEqual(insertContentSection(original, ad, a.id, 'end').map(s => s.id), ['categories','products','ad-one']);
assert.deepEqual(insertContentSection(original, ad, 'removed-section', 'after').map(s => s.id), ['categories','products','ad-one']);
assert.deepEqual(original, [a,b]);
assert.equal(insertContentSection(original, ad, a.id, 'after')[2].enabled, false);
assert.throws(() => insertContentSection(original, a, a.id, 'end'), /already exists/);
assert.throws(() => insertContentSection(Array.from({length:40},(_,i)=>createSection('products',`s-${i}`)),ad,'','end'), /40 sections/);
for (const key of TAB_KEYS) {
 const document = structuredClone(DEFAULT_CONTENT[key]);
 const selected = document.sections[0].id;
 document.sections = insertContentSection(document.sections, ad, selected, 'before');
 const second = { ...ad, id:'ad-two', enabled:false, imageUrl:'https://images.gloceries.com/banner-two.png' };
 document.sections = insertContentSection(document.sections, second, selected, 'after');
 const saved = validateContent(document);
 assert.equal(saved.sections[0].imageUrl, ad.imageUrl);
 assert.equal(saved.sections.find(s=>s.id==='ad-two')?.enabled,false);
 assert.equal(saved.sections.findIndex(s=>s.id==='ad-two'), saved.sections.findIndex(s=>s.id===selected)+1);
}
console.log('Quick-tab section/ad placement, visibility, limits and all-tab document validation passed.');
