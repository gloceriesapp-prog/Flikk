export declare const MIN_TAG_CONTRAST = 4.5;
export declare const isHex: (value: unknown) => value is string;
export declare function contrastRatio(a: string, b: string): number;
export declare function passingShade(accent: string, text: string): string | null;
