import { Platform, Switch as NativeSwitch, type SwitchProps } from 'react-native';
import { colors } from '../../theme/tokens';

/**
 * The app's on/off switch in the brand colours: grey track when off,
 * blue when on, white thumb. On the web the plain switch turns green
 * when on, so the web-only "active" colours are set too.
 */
export function Switch(props: SwitchProps) {
  const webOnly = Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF', activeTrackColor: colors.primary } : null;
  return (
    <NativeSwitch
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.border}
      {...props}
      {...(webOnly as object)}
    />
  );
}
