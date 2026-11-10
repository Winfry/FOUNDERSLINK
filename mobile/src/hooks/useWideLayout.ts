import { Platform, useWindowDimensions } from 'react-native';

/** At this width and wider (a laptop or desktop browser), the app shows the side menu. */
export const WIDE_MIN = 1000;
/** The side menu's width. */
export const SIDEBAR_WIDTH = 252;

/**
 * True in a wide browser window: the app then uses the side menu and wide
 * pages. Phones (and narrow windows) keep the bottom tabs.
 */
export function useWideLayout() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_MIN;
}

/**
 * The side padding that centres a page's content at `max` wide, in the
 * area beside the side menu. Zero on a phone or a narrow window.
 */
export function useCentredPadding(max: number) {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= WIDE_MIN;
  if (!wide) return 0;
  return Math.max(0, Math.round((width - SIDEBAR_WIDTH - max) / 2));
}
