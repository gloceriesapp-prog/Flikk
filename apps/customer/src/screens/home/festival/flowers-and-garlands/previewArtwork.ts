// Local vector illustrations make the development samples recognisable
// without presenting stock photographs as actual seller arrangements.
export function flowerPreviewArtwork(garland: boolean, color: string): string {
  const positions = garland
    ? Array.from({ length: 13 }, (_, index) => {
        const angle = Math.PI * index / 12;
        return [150 + Math.cos(angle) * 82, 100 + Math.sin(angle) * 142];
      })
    : [[95, 120], [145, 105], [200, 125], [75, 170], [125, 160], [180, 175], [225, 180], [110, 215], [165, 220]];
  const blooms = positions.map(([x, y]) => {
    const petals = Array.from({ length: 8 }, (_, index) => {
      const angle = Math.PI * index / 4;
      return `<circle cx="${x + Math.cos(angle) * 13}" cy="${y + Math.sin(angle) * 13}" r="11" fill="${color}"/>`;
    }).join('');
    return `${petals}<circle cx="${x}" cy="${y}" r="9" fill="#D89B31"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="338" viewBox="0 0 300 338"><rect width="300" height="338" fill="#FCF6EC"/><ellipse cx="150" cy="268" rx="105" ry="13" fill="#EFE4D1"/>${blooms}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
