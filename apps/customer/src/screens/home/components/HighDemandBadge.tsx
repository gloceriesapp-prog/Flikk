import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GILROY } from '../../../theme/fonts';

/** User-supplied trend-up artwork, bundled locally so the badge needs no image request. */
export function HighDemandBadge() {
  return <View style={styles.badge} accessible accessibilityLabel="High demand">
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" accessible={false}>
      <Path fillRule="evenodd" clipRule="evenodd" d="M15.3413 7.09088C15.3413 6.67667 15.6771 6.34088 16.0913 6.34088H20.9999C21.4141 6.34088 21.7499 6.67666 21.7499 7.09087L21.7499 11.9995C21.7499 12.4137 21.4142 12.7495 20.9999 12.7495C20.5857 12.7495 20.2499 12.4137 20.2499 11.9995L20.2499 7.84088H16.0913C15.6771 7.84088 15.3413 7.50509 15.3413 7.09088Z" fill="#75420D" />
      <Path fillRule="evenodd" clipRule="evenodd" d="M21.5303 6.55951C21.8231 6.85241 21.8231 7.32728 21.5303 7.62017L13.7572 15.3932C13.6165 15.5339 13.4258 15.6129 13.2268 15.6129C13.0279 15.6129 12.8371 15.5338 12.6965 15.3932L9.13645 11.8323L3.53033 17.4384C3.23744 17.7313 2.76256 17.7313 2.46967 17.4384C2.17678 17.1455 2.17678 16.6706 2.46967 16.3777L8.60618 10.2412C8.74685 10.1006 8.93763 10.0215 9.13656 10.0216C9.33549 10.0216 9.52626 10.1006 9.66691 10.2413L13.2269 13.8022L20.4696 6.55951C20.7625 6.26662 21.2374 6.26662 21.5303 6.55951Z" fill="#75420D" />
    </Svg>
    <Text style={styles.label}>High demand</Text>
  </View>;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFF0CC', flexShrink: 0 },
  label: { fontFamily: GILROY.semibold, fontSize: 11, lineHeight: 15, color: '#75420D', includeFontPadding: false },
});
