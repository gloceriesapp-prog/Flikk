import { cardDotWindow } from '../src/components/ProductImageGallery';

describe('card photo dots', () => {
  it('shows one dot per photo up to 3', () => {
    expect(cardDotWindow(2, 0)).toEqual([0, 1]);
    expect(cardDotWindow(3, 2)).toEqual([0, 1, 2]);
  });
  it('slides a 3-dot window with the photo', () => {
    expect(cardDotWindow(6, 0)).toEqual([0, 1, 2]);
    expect(cardDotWindow(6, 3)).toEqual([2, 3, 4]);
    expect(cardDotWindow(6, 5)).toEqual([3, 4, 5]);
  });
});
