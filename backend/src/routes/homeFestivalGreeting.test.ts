import { describe, expect, it } from 'vitest';
import { toFestivalGreeting } from './homeFestivalGreeting.js';

describe('festival greeting and tab config', () => {
  it('keeps the festival tab off without an admin opt-in', () => {
    expect(toFestivalGreeting(null).tab.enabled).toBe(false);
    expect(toFestivalGreeting({ is_active: true, title: 'Happy Navratri' }).tab).toEqual({
      enabled: false, title: 'Navratri', backgroundColor: '#FFF1D6', headerColor: '#F6C667', headerImageUrl: null, bannerImageUrl: null,
    });
  });
  it('serves the admin tab title, colours and artwork', () => {
    const body = toFestivalGreeting({
      tab_enabled: true, tab_title: ' Diwali ', tab_background_color: '#FFEEDD', tab_header_color: '#AA5500',
      tab_header_image_url: 'Images/diwali.png', tab_banner_image_url: 'https://cdn.example/banner.png',
    });
    expect(body.tab).toEqual({ enabled: true, title: 'Diwali', backgroundColor: '#FFEEDD', headerColor: '#AA5500',
      headerImageUrl: 'Images/diwali.png', bannerImageUrl: 'https://cdn.example/banner.png' });
  });
  it('falls back for malformed colours and drops malformed categories', () => {
    const body = toFestivalGreeting({ tab_enabled: true, tab_title: '  ', tab_background_color: 'red', categories: [{ id: 'a', title: 'A' }, null, { id: '', title: 'x' }] });
    expect(body.tab.title).toBe('Navratri');
    expect(body.tab.backgroundColor).toBe('#FFF1D6');
    expect(body.categories).toEqual([{ id: 'a', title: 'A' }]);
  });
});
