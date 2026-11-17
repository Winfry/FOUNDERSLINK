import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';

/**
 * The first thing anyone sees when the app opens: the FoundersLink logo,
 * centred on white. It is drawn exactly like the phone's own start-up screen
 * (the expo-splash-screen settings in app.json: logo.png, 200 wide, on
 * white), so the logo stays put while the app gets ready, with no spinner
 * in between.
 */
export function LogoScreen() {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="FoundersLink">
      <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

// logo.png is 1713 by 318.
const WIDTH = 200;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  logo: { width: WIDTH, height: (WIDTH * 318) / 1713 },
});
