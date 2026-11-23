import Svg, { Path } from 'react-native-svg';

export function IconlyDiscountTag({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M3.01582 6.34928C3.01874 4.93751 4.08608 3.67169 5.47158 3.43331C5.75568 3.38369 9.08808 3.3905 10.4668 3.39148C11.8309 3.39245 12.9936 3.88282 13.9568 4.84411C16.002 6.88539 18.0452 8.92861 20.0855 10.9738C21.2929 12.1832 21.3095 14.0396 20.1069 15.2529C18.3721 17.0042 16.6285 18.7468 14.8782 20.4816C13.6659 21.6832 11.8095 21.6676 10.5991 20.4602C8.53544 18.4023 6.47178 16.3445 4.41688 14.278C3.62197 13.4782 3.15301 12.512 3.0489 11.3824C2.96522 10.4795 3.01387 7.12279 3.01582 6.34928Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.8991 15.5442V9.00586" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.72189 12.2546V12.203M8.71522 12.05C8.59122 12.05 8.49022 12.151 8.49122 12.275C8.49122 12.399 8.59222 12.5 8.71622 12.5C8.84022 12.5 8.94122 12.399 8.94122 12.275C8.94122 12.15 8.84022 12.05 8.71522 12.05Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15.0842 12.2546V12.203M15.0775 12.05C14.9535 12.05 14.8525 12.151 14.8535 12.275C14.8535 12.399 14.9545 12.5 15.0785 12.5C15.2025 12.5 15.3035 12.399 15.3035 12.275C15.3035 12.15 15.2025 12.05 15.0775 12.05Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
