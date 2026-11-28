// WCAG 2.x contrast for the tag (text on accent). Saves below 4.5:1 are blocked.
export const MIN_TAG_CONTRAST = 4.5;
const HEX = /^#([0-9a-f]{6})$/i;
export const isHex = (value) => typeof value === 'string' && HEX.test(value);
function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
// A darker shade of the accent that passes with the given text colour.
export function passingShade(accent, text) {
    if (!isHex(accent))
        return null;
    const rgb = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16));
    for (let f = 1; f >= 0.2; f -= 0.04) {
        const hex = '#' + rgb.map(c => Math.round(c * f).toString(16).padStart(2, '0')).join('').toUpperCase();
        if (contrastRatio(hex, text) >= MIN_TAG_CONTRAST)
            return hex;
    }
    return null;
}
