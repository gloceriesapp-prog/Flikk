import { buildSuggestions, splitMatch } from '../src/screens/search/searchTypeahead';

const products = ['Daawat Brown Rice Jar', 'Rice Bran Oil', 'rice bran oil', 'Milk', 'Bisleri Soda'];

describe('search typeahead', () => {
  it('lists only distinct product matches, prefix matches first', () => {
    expect(buildSuggestions('rice', products)).toEqual([
      { kind: 'product', label: 'Rice Bran Oil' },
      { kind: 'product', label: 'Daawat Brown Rice Jar' },
    ]);
  });
  it('matches word starts, not the middle of words, unless nothing else matches', () => {
    expect(buildSuggestions('ri', products).map((s) => s.label)).toEqual(['Rice Bran Oil', 'Daawat Brown Rice Jar']);
    expect(buildSuggestions('ler', products).map((s) => s.label)).toEqual(['Bisleri Soda']);
  });
  it('is empty for a blank query', () => {
    expect(buildSuggestions('  ', products)).toEqual([]);
  });
  it('splits out the typed part for bolding', () => {
    expect(splitMatch('Daawat Rice', 'ri')).toEqual(['Daawat ', 'Ri', 'ce']);
    expect(splitMatch('Milk', 'rice')).toEqual(['Milk', '', '']);
    expect(splitMatch('Fabric Rinse', 'ri')).toEqual(['Fabric ', 'Ri', 'nse']);
  });
});
