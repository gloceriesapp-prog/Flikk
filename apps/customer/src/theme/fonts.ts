// Single source of truth for Gilroy — every font-family name used anywhere
// in the app, and the exact file map expo-font needs to load them, live
// here. Screens that need a specific weight face (e.g. an ExtraBold price)
// import GILROY and set style={{ fontFamily: GILROY.extraBold }} directly;
// everything else gets Gilroy for free via the global Text/TextInput
// default set in App.tsx, so existing font-bold/font-semibold (etc.)
// NativeWind classes don't need to change — RN synthesizes the weight
// on top of the Gilroy-Regular default.

export const GILROY = {
  thin: 'Gilroy-Thin',
  thinItalic: 'Gilroy-ThinItalic',
  ultraLight: 'Gilroy-UltraLight',
  ultraLightItalic: 'Gilroy-UltraLightItalic',
  light: 'Gilroy-Light',
  lightItalic: 'Gilroy-LightItalic',
  regular: 'Gilroy-Regular',
  italic: 'Gilroy-Italic',
  medium: 'Gilroy-Medium',
  mediumItalic: 'Gilroy-MediumItalic',
  semiBold: 'Gilroy-SemiBold',
  semiBoldItalic: 'Gilroy-SemiBoldItalic',
  bold: 'Gilroy-Bold',
  boldItalic: 'Gilroy-BoldItalic',
  extraBold: 'Gilroy-ExtraBold',
  extraBoldItalic: 'Gilroy-ExtraBoldItalic',
  black: 'Gilroy-Black',
  blackItalic: 'Gilroy-BlackItalic',
  heavy: 'Gilroy-Heavy',
  heavyItalic: 'Gilroy-HeavyItalic',
} as const;

export const GILROY_FONT_FILES = {
  [GILROY.thin]: require('../../assets/fonts/Gilroy-Thin.ttf'),
  [GILROY.thinItalic]: require('../../assets/fonts/Gilroy-ThinItalic.ttf'),
  [GILROY.ultraLight]: require('../../assets/fonts/Gilroy-UltraLight.ttf'),
  [GILROY.ultraLightItalic]: require('../../assets/fonts/Gilroy-UltraLightItalic.ttf'),
  [GILROY.light]: require('../../assets/fonts/Gilroy-Light.ttf'),
  [GILROY.lightItalic]: require('../../assets/fonts/Gilroy-LightItalic.ttf'),
  [GILROY.regular]: require('../../assets/fonts/Gilroy-Regular.ttf'),
  [GILROY.italic]: require('../../assets/fonts/Gilroy-Italic.ttf'),
  [GILROY.medium]: require('../../assets/fonts/Gilroy-Medium.ttf'),
  [GILROY.mediumItalic]: require('../../assets/fonts/Gilroy-MediumItalic.ttf'),
  [GILROY.semiBold]: require('../../assets/fonts/Gilroy-SemiBold.ttf'),
  [GILROY.semiBoldItalic]: require('../../assets/fonts/Gilroy-SemiBoldItalic.ttf'),
  [GILROY.bold]: require('../../assets/fonts/Gilroy-Bold.ttf'),
  [GILROY.boldItalic]: require('../../assets/fonts/Gilroy-BoldItalic.ttf'),
  [GILROY.extraBold]: require('../../assets/fonts/Gilroy-ExtraBold.ttf'),
  [GILROY.extraBoldItalic]: require('../../assets/fonts/Gilroy-ExtraBoldItalic.ttf'),
  [GILROY.black]: require('../../assets/fonts/Gilroy-Black.ttf'),
  [GILROY.blackItalic]: require('../../assets/fonts/Gilroy-BlackItalic.ttf'),
  [GILROY.heavy]: require('../../assets/fonts/Gilroy-Heavy.ttf'),
  [GILROY.heavyItalic]: require('../../assets/fonts/Gilroy-HeavyItalic.ttf'),
} as const;
