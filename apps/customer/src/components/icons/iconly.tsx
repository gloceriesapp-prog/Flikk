// Centralized custom (Iconly) icon set for the customer bottom nav — one
// file, import from here so a glyph is defined once and reused. Same shape as
// apps/rider's icons/iconly.tsx: memoized, { size, color, active }, inline
// react-native-svg (no font/remote fetch — paths ship in the JS bundle).
// active = filled solid glyph, false/omitted = hairline outline.

import { memo } from 'react';
import Svg, { G, Path } from 'react-native-svg';

export interface IconlyIconProps {
  size?: number;
  color?: string;
  active?: boolean;
}

export const IconlyHome = memo(function IconlyHome({ size = 24, color = '#101C10', active = false }: IconlyIconProps) {
  if (active) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.1581 16.885H9.34306C8.92906 16.885 8.59306 16.549 8.59306 16.135C8.59306 15.721 8.92906 15.385 9.34306 15.385H15.1581C15.5721 15.385 15.9081 15.721 15.9081 16.135C15.9081 16.549 15.5721 16.885 15.1581 16.885ZM19.4991 6.158C19.1361 5.838 18.7231 5.476 18.2311 5.021C18.0081 4.841 17.7641 4.635 17.5051 4.417C16.0451 3.186 14.0451 1.5 12.2221 1.5C10.4201 1.5 8.54906 3.092 7.04606 4.371C6.76806 4.607 6.50806 4.829 6.24306 5.044C5.77706 5.476 5.36406 5.839 5.00006 6.16C2.61306 8.261 2.16406 8.812 2.16406 13.713C2.16406 22.5 4.70506 22.5 12.2501 22.5C19.7941 22.5 22.3361 22.5 22.3361 13.713C22.3361 8.811 21.8871 8.26 19.4991 6.158Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.07874 16.1354H14.8937" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.40002 13.713C2.40002 8.082 3.01402 8.475 6.31902 5.41C7.76502 4.246 10.015 2 11.958 2C13.9 2 16.195 4.235 17.654 5.41C20.959 8.475 21.572 8.082 21.572 13.713C21.572 22 19.613 22 11.986 22C4.35903 22 2.40002 22 2.40002 13.713Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

// IconlyBag — Purchase tab. Filled solid when active, hairline outline when not.
export const IconlyBag = memo(function IconlyBag({ size = 24, color = '#101C10', active = false }: IconlyIconProps) {
  if (active) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.78 7.14468V7.76468C16.32 7.66468 15.82 7.57468 15.28 7.51468V7.14468C15.28 5.47468 13.93 4.10468 12.26 4.10468H12.25C10.58 4.10468 9.21997 5.46468 9.21997 7.12468V7.51468C8.67997 7.57468 8.17997 7.66468 7.71997 7.76468V7.12468C7.71997 4.63468 9.75997 2.60468 12.25 2.60468H12.26C14.76 2.61468 16.79 4.64468 16.78 7.14468Z"
          fill={color}
        />
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.77 14.9147C21.77 20.4947 19.28 22.4647 12.25 22.4647C5.21998 22.4647 2.72998 20.4947 2.72998 14.9147C2.72998 10.7647 4.10997 8.60468 7.71997 7.76468L7.71998 10.1747C7.71998 10.5947 8.04998 10.9247 8.46998 10.9247C8.87998 10.9247 9.21998 10.5947 9.21998 10.1747L9.21997 7.51468C10.12 7.40468 11.13 7.35468 12.25 7.35468C13.37 7.35468 14.38 7.40468 15.28 7.51468L15.28 10.1747C15.28 10.5947 15.62 10.9247 16.03 10.9247C16.44 10.9247 16.78 10.5947 16.78 10.1747L16.78 7.76468C20.39 8.60468 21.77 10.7647 21.77 14.9147Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G transform="translate(3, 2.5)" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12.7729,6.80503597 L12.7729,3.77303597 C12.7729,1.68903597 11.0839,-1.42108547e-14 9.0009,-1.42108547e-14 C6.9169,-0.00896402892 5.2199,1.67203597 5.2109,3.75603597 L5.2109,3.77303597 L5.2109,6.80503597" />
        <Path d="M13.7422153,18.500336 L4.2577847,18.500336 C1.90569395,18.500336 0,16.595336 0,14.245336 L0,8.72933597 C0,6.37933597 1.90569395,4.47433597 4.2577847,4.47433597 L13.7422153,4.47433597 C16.094306,4.47433597 18,6.37933597 18,8.72933597 L18,14.245336 C18,16.595336 16.094306,18.500336 13.7422153,18.500336 Z" />
      </G>
    </Svg>
  );
});

// IconlyCategory — Category tab (and Store, for now). Filled solid when
// active, hairline outline when not.
export const IconlyCategory = memo(function IconlyCategory({ size = 24, color = '#101C10', active = false }: IconlyIconProps) {
  if (active) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21.245 6.64688C21.245 8.65821 19.6145 10.2887 17.6032 10.2887C15.5918 10.2887 13.9613 8.65821 13.9613 6.64688C13.9613 4.63554 15.5918 3.00504 17.6032 3.00504C19.6145 3.00504 21.245 4.63554 21.245 6.64688Z" fill={color} />
        <Path d="M10.5388 6.64688C10.5388 8.65821 8.90831 10.2887 6.89697 10.2887C4.88564 10.2887 3.25513 8.65821 3.25513 6.64688C3.25513 4.63554 4.88564 3.00504 6.89697 3.00504C8.90831 3.00504 10.5388 4.63554 10.5388 6.64688Z" fill={color} />
        <Path d="M21.245 17.3531C21.245 19.3645 19.6145 20.995 17.6032 20.995C15.5918 20.995 13.9613 19.3645 13.9613 17.3531C13.9613 15.3418 15.5918 13.7113 17.6032 13.7113C19.6145 13.7113 21.245 15.3418 21.245 17.3531Z" fill={color} />
        <Path d="M10.5388 17.3531C10.5388 19.3645 8.90831 20.995 6.89697 20.995C4.88564 20.995 3.25513 19.3645 3.25513 17.3531C3.25513 15.3418 4.88564 13.7113 6.89697 13.7113C8.90831 13.7113 10.5388 15.3418 10.5388 17.3531Z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.0004 6.6738C21.0004 8.7024 19.3552 10.3476 17.3266 10.3476C15.298 10.3476 13.6537 8.7024 13.6537 6.6738C13.6537 4.6452 15.298 3 17.3266 3C19.3552 3 21.0004 4.6452 21.0004 6.6738Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.3467 6.6738C10.3467 8.7024 8.7024 10.3476 6.6729 10.3476C4.6452 10.3476 3 8.7024 3 6.6738C3 4.6452 4.6452 3 6.6729 3C8.7024 3 10.3467 4.6452 10.3467 6.6738Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.0004 17.2619C21.0004 19.2905 19.3552 20.9348 17.3266 20.9348C15.298 20.9348 13.6537 19.2905 13.6537 17.2619C13.6537 15.2333 15.298 13.5881 17.3266 13.5881C19.3552 13.5881 21.0004 15.2333 21.0004 17.2619Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.3467 17.2619C10.3467 19.2905 8.7024 20.9348 6.6729 20.9348C4.6452 20.9348 3 19.2905 3 17.2619C3 15.2333 4.6452 13.5881 6.6729 13.5881C8.7024 13.5881 10.3467 15.2333 10.3467 17.2619Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
