import { buildSuggestions, splitMatch } from '../src/screens/search/searchTypeahead';

const categories = [{ id: 'c1', name: 'Rice & Grains' }, { id: 'c2', name: 'Puffed Rice' }, { id: 'c3', name: 'Oils' }];
const products = ['Daawat Brown Rice Jar', 'Rice Bran Oil', 'rice bran oil', 'Milk', 'Bisleri Soda'];

describe('search typeahead', () => {
  it('lists matching categories, then distinct products, prefix matches first', () => {
    expect(buildSuggestions('rice', categories, products)).toEqual([
      { kind: 'category', id: 'c1', label: 'Rice & Grains' },
      { kind: 'category', id: 'c2', label: 'Puffed Rice' },
      { kind: 'product', label: 'Rice Bran Oil' },
      { kind: 'product', label: 'Daawat Brown Rice Jar' },
    ]);
  });
  it('matches word starts, not the middle of words, unless nothing else matches', () => {
    expect(buildSuggestions('ri', [], products).map((s) => s.label)).toEqual(['Rice Bran Oil', 'Daawat Brown Rice Jar']);
    expect(buildSuggestions('ler', [], products).map((s) => s.label)).toEqual(['Bisleri Soda']);
  });
  it('is empty for a blank query', () => {
    expect(buildSuggestions('  ', categories, products)).toEqual([]);
  });
  it('splits out the typed part for bolding', () => {
    expect(splitMatch('Daawat Rice', 'ri')).toEqual(['Daawat ', 'Ri', 'ce']);
    expect(splitMatch('Milk', 'rice')).toEqual(['Milk', '', '']);
    expect(splitMatch('Fabric Rinse', 'ri')).toEqual(['Fabric ', 'Ri', 'nse']);
  });
});
